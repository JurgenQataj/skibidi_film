const MovieList = require("../models/MovieList");
const Movie = require("../models/Movie");
const axios = require("axios");

// Funzione per creare una nuova lista
exports.createList = async (req, res) => {
  const { title, description } = req.body;
  try {
    const newList = new MovieList({ user: req.user.id, title, description });
    await newList.save();
    res.status(201).json(newList);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per ottenere i dettagli di una lista
exports.getListDetails = async (req, res) => {
  try {
    const list = await MovieList.findById(req.params.listId)
      .populate("user", "username") // Aggiunge il nome dell'autore
      .populate("movies"); // Aggiunge tutti i dati dei film nella lista

    if (!list) return res.status(404).json({ message: "Lista non trovata." });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per eliminare una lista
exports.deleteList = async (req, res) => {
  try {
    const list = await MovieList.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: "Lista non trovata." });

    // Controlla che l'utente che elimina sia il proprietario della lista
    if (list.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Non hai i permessi." });
    }
    await list.deleteOne();
    res.json({ message: "Lista eliminata." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per aggiungere un film a una lista
exports.addMovieToList = async (req, res) => {
  const { listId } = req.params;
  const { tmdbId } = req.body;
  try {
    const list = await MovieList.findOne({ _id: listId, user: req.user.id });
    if (!list)
      return res
        .status(404)
        .json({ message: "Lista non trovata o non autorizzato." });

    let movie = await Movie.findOne({ tmdb_id: tmdbId });
    if (!movie) {
      const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
      const tmdbResponse = await axios.get(tmdbUrl);
      const movieData = tmdbResponse.data;
      movie = new Movie({
        tmdb_id: movieData.id,
        title: movieData.title,
        poster_path: movieData.poster_path,
      });
      await movie.save();
    }

    // Aggiunge il film solo se non è già presente
    if (list.movies.includes(movie._id)) {
      return res
        .status(409)
        .json({ message: "Questo film è già in questa lista." });
    }

    list.movies.push(movie._id);
    await list.save();
    res.json({ message: "Film aggiunto alla lista." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per rimuovere un film da una lista
exports.removeMovieFromList = async (req, res) => {
  const { listId, tmdbId } = req.params;
  try {
    const list = await MovieList.findOne({ _id: listId, user: req.user.id });
    if (!list)
      return res
        .status(404)
        .json({ message: "Lista non trovata o non autorizzato." });

    const movie = await Movie.findOne({ tmdb_id: tmdbId });
    if (!movie) return res.status(404).json({ message: "Film non trovato." });

    // Rimuove il film dall'array
    list.movies.pull(movie._id);
    await list.save();
    res.json({ message: "Film rimosso dalla lista." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
