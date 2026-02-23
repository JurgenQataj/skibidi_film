const GlobalMessage = require("../models/GlobalMessage");

exports.getMessages = async (req, res) => {
  try {
    const messages = await GlobalMessage.find()
      .populate("user", "username avatar_url")
      .sort({ createdAt: -1 }) // Più recenti in cima (o in fondo, gestito dal client)
      .limit(50); // Prendi gli ultimi 50 messaggi

    res.json(messages.reverse()); // Ritorniamo l'ordine cronologico corretto
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

    const newMessage = new GlobalMessage({
      user: req.user.id,
      text: text.trim(),
    });

    await newMessage.save();

    // Popoliamo per restituire il messaggio completo al mittente
    const populatedMessage = await GlobalMessage.findById(newMessage._id).populate(
      "user",
      "username avatar_url"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Errore invio messaggio globale:", error);
    res.status(500).json({ message: "Errore del server" });
  }
};
