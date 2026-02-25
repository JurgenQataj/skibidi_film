const GlobalMessage = require("../models/GlobalMessage");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Estrae @username dal testo e restituisce gli ID utenti trovati
async function extractMentions(text) {
  const mentionRegex = /@(\w+)/g;
  const usernames = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    usernames.push(match[1]);
  }
  if (usernames.length === 0) return [];
  const users = await User.find({ username: { $in: usernames } }).select("_id");
  return users.map((u) => u._id);
}

exports.getMessages = async (req, res) => {
  try {
    const messages = await GlobalMessage.find()
      .populate("user", "username avatar_url")
      .populate("mentions", "username")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(messages.reverse());
  } catch (error) {
    console.error("Errore recupero messaggi globali:", error);
    res.status(500).json({ message: "Errore del server" });
  }
};

exports.postMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Testo vuoto" });
    }

    // Estrarre le mentions dal testo pulito
    const content = text.trim();
    const mentionedIds = await extractMentions(content);

    const newMessage = new GlobalMessage({
      user: req.user.id,
      text: content,
      mentions: mentionedIds,
    });

    await newMessage.save();

    // Crea notifiche per gli utenti taggati (escludi te stesso)
    const otherMentions = mentionedIds.filter(
      (id) => id.toString() !== req.user.id.toString()
    );
    if (otherMentions.length > 0) {
      const notifications = otherMentions.map((recipientId) => ({
        recipient: recipientId,
        sender: req.user.id,
        type: "chat_mention",
      }));
      await Notification.insertMany(notifications);
    }

    const populatedMessage = await GlobalMessage.findById(newMessage._id)
      .populate("user", "username avatar_url")
      .populate("mentions", "username");

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Errore invio messaggio globale:", error);
    res.status(500).json({ message: "Errore del server" });
  }
};

// Toggle like su un messaggio
exports.likeMessage = async (req, res) => {
  try {
    const message = await GlobalMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Messaggio non trovato" });

    const userId = req.user.id;
    const alreadyLiked = message.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      message.likes = message.likes.filter((id) => id.toString() !== userId);
    } else {
      message.likes.push(userId);
    }

    await message.save();
    res.json({ likes: message.likes.length, liked: !alreadyLiked });
  } catch (error) {
    console.error("Errore like messaggio:", error);
    res.status(500).json({ message: "Errore del server" });
  }
};

// Elimina un messaggio (solo il proprio)
exports.deleteMessage = async (req, res) => {
  try {
    const message = await GlobalMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Messaggio non trovato" });

    if (message.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Non autorizzato" });
    }

    await message.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error("Errore eliminazione messaggio:", error);
    res.status(500).json({ message: "Errore del server" });
  }
};
