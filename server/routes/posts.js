const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Middleware per proteggere e verificare Juri01
const verifyAdmin = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Nessun token, autorizzazione negata." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    
    // Controlla se l'utente esiste e se è Juri01
    const user = await User.findById(req.user.id);
    if (!user || user.username !== "Juri01") {
      return res.status(403).json({ message: "Accesso negato. Solo l'admin può eseguire questa azione." });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: "Token non valido." });
  }
};

// @route   POST /api/posts
// @desc    Crea un nuovo post di annuncio admin (solo per Juri01)
// @access  Private (Admin)
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Il testo del post è obbligatorio." });
    }

    // Imposta la scadenza a 7 giorni da ora
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const post = new Post({
      user: req.user.id,
      text: text.trim(),
      expiresAt,
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error("Errore creazione post:", error);
    res.status(500).json({ message: "Errore del server durante la creazione del post." });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Elimina un annuncio admin (solo per Juri01)
// @access  Private (Admin)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post non trovato." });
    }

    await post.deleteOne();
    res.json({ message: "Post eliminato con successo." });
  } catch (error) {
    console.error("Errore eliminazione post:", error);
    res.status(500).json({ message: "Errore del server durante l'eliminazione." });
  }
});

module.exports = router;
