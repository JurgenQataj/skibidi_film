const MovieList = require("../models/MovieList");
const Movie = require("../models/Movie");
const axios = require("axios");
const { enrichWithOmdbRatings } = require("../services/omdbService");

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
    
    let listData = list.toObject();
    if (listData.movies && listData.movies.length > 0) {
      listData.movies = await enrichWithOmdbRatings(listData.movies);
    }
    
    res.json(listData);
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
  const { tmdbId, mediaType = "movie" } = req.body;

  if (!/^\d+$/.test(String(tmdbId))) {
    return res.status(400).json({ message: "ID non valido." });
  }
  const safeMediaType = mediaType === "tv" ? "tv" : "movie";
  const safeTmdbId = encodeURIComponent(tmdbId);

  try {
    const list = await MovieList.findOne({ _id: String(listId), user: req.user.id });
    if (!list)
      return res
        .status(404)
        .json({ message: "Lista non trovata o non autorizzato." });

    let movie = await Movie.findOne({ tmdb_id: Number(tmdbId), media_type: safeMediaType });
    if (!movie) {
      const tmdbUrl = safeMediaType === "tv"
        ? `https://api.themoviedb.org/3/tv/${safeTmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`
        : `https://api.themoviedb.org/3/movie/${safeTmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
      
      const tmdbResponse = await axios.get(tmdbUrl);
      const movieData = tmdbResponse.data;
      
      const dateStr = safeMediaType === "tv" ? movieData.first_air_date : movieData.release_date;
      const release_year = dateStr ? new Date(dateStr).getFullYear() : null;
      
      const runtime = safeMediaType === "tv"
        ? (movieData.episode_run_time && movieData.episode_run_time.length > 0 ? movieData.episode_run_time[0] : 0)
        : (movieData.runtime || 0);

      const genres = movieData.genres?.map(g => g.name) || [];
      const keywords = safeMediaType === "tv"
        ? (movieData.keywords?.results?.map(k => k.name) || [])
        : (movieData.keywords?.keywords?.map(k => k.name) || []);

      movie = new Movie({
        tmdb_id: movieData.id,
        media_type: safeMediaType,
        title: safeMediaType === "tv" ? movieData.name : movieData.title,
        poster_path: movieData.poster_path,
        genres,
        keywords,
        release_year,
        vote_average: movieData.vote_average,
        runtime
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

// Funzione per aggiungere più film a una lista
exports.addBatchToList = async (req, res) => {
  const { listId } = req.params;
  const { movies } = req.body; // array of { tmdbId, mediaType }

  if (!movies || !Array.isArray(movies) || movies.length === 0) {
    return res.status(400).json({ message: "Nessun film fornito." });
  }

  try {
    const list = await MovieList.findOne({ _id: String(listId), user: req.user.id });
    if (!list) return res.status(404).json({ message: "Lista non trovata o non autorizzato." });

    let addedCount = 0;
    for (const item of movies) {
      if (!item.tmdbId) continue;
      const safeMediaType = item.mediaType === "tv" ? "tv" : "movie";
      const safeTmdbId = encodeURIComponent(item.tmdbId);

      let movie = await Movie.findOne({ tmdb_id: Number(item.tmdbId), media_type: safeMediaType });
      if (!movie) {
        try {
          const tmdbUrl = safeMediaType === "tv"
            ? `https://api.themoviedb.org/3/tv/${safeTmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`
            : `https://api.themoviedb.org/3/movie/${safeTmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
          
          const tmdbResponse = await axios.get(tmdbUrl);
          const movieData = tmdbResponse.data;
          
          const dateStr = safeMediaType === "tv" ? movieData.first_air_date : movieData.release_date;
          const release_year = dateStr ? new Date(dateStr).getFullYear() : null;
          
          const runtime = safeMediaType === "tv"
            ? (movieData.episode_run_time && movieData.episode_run_time.length > 0 ? movieData.episode_run_time[0] : 0)
            : (movieData.runtime || 0);

          const genres = movieData.genres?.map(g => g.name) || [];
          const keywords = safeMediaType === "tv"
            ? (movieData.keywords?.results?.map(k => k.name) || [])
            : (movieData.keywords?.keywords?.map(k => k.name) || []);

          movie = new Movie({
            tmdb_id: movieData.id,
            media_type: safeMediaType,
            title: safeMediaType === "tv" ? movieData.name : movieData.title,
            poster_path: movieData.poster_path,
            genres,
            keywords,
            release_year,
            vote_average: movieData.vote_average,
            runtime
          });
          await movie.save();
        } catch (e) {
          console.error("Errore fetch TMDB in batch add list:", e);
          continue;
        }
      }

      if (!list.movies.includes(movie._id)) {
        list.movies.push(movie._id);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await list.save();
    }

    res.json({ message: `${addedCount} film aggiunti alla lista.` });
  } catch (error) {
    console.error("Errore addBatchToList:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per rimuovere un film da una lista
exports.removeMovieFromList = async (req, res) => {
  const { listId, tmdbId } = req.params;
  const mediaType = req.query.mediaType || "movie";
  try {
    const list = await MovieList.findOne({ _id: String(listId), user: req.user.id });
    if (!list)
      return res
        .status(404)
        .json({ message: "Lista non trovata o non autorizzato." });

    const movie = await Movie.findOne({ tmdb_id: Number(tmdbId), media_type: String(mediaType) });
    if (!movie) return res.status(404).json({ message: "Film non trovato." });

    // Rimuove il film dall'array
    list.movies.pull(movie._id);
    await list.save();
    res.json({ message: "Film rimosso dalla lista." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
