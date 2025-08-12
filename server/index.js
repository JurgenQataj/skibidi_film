const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importa tutte le rotte necessarie
const userRoutes = require('./routes/users');
const movieRoutes = require('./routes/movies');
const reviewRoutes = require('./routes/reviews'); // <-- 1. QUESTA È LA RIGA CHE HAI CHIESTO
const listRoutes = require('./routes/lists'); 
const reactionRoutes = require('./routes/reactions');
const watchlistRoutes = require('./routes/watchlist');
const notificationRoutes = require('./routes/notifications');
const commentRoutes = require('./routes/comments');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rotta di prova
app.get('/', (req, res) => {
    res.send('<h1>Il server di Skibidi Film è attivo! 🎉</h1>');
});

// Usa le rotte per le varie sezioni dell'API
app.use('/api/users', userRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/reviews', reviewRoutes); // <-- 2. E QUESTA È L'ALTRA RIGA FONDAMENTALE
app.use('/api/lists', listRoutes); // <-- AGGIUNGI QUESTA
app.use('/api/reactions', reactionRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
});