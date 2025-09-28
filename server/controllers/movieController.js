const Movie = require("../models/Movie");
const Review = require("../models/Review");
const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

// SUGGERIMENTI - Versione sicura
exports.getMovieSuggestions = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery || searchQuery.length < 2) {
      return res.json({ results: [] });
    }

    if (!API_KEY) {
      return res.status(500).json({
        message: "API key not configured",
        results: [],
      });
    }

    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      searchQuery
    )}&language=it-IT&page=1`;

    const response = await axios.get(url);

    const suggestions = response.data.results.slice(0, 5).map((movie) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
    }));

    res.json({ results: suggestions });
  } catch (error) {
    console.error("Errore suggestions:", error.message);
    res.status(500).json({
      message: error.message,
      results: [],
    });
  }
};

// Ricerca testuale (esistente)
exports.searchMovies = async (req, res) => {
  const searchQuery = req.query.query;
  if (!searchQuery) {
    return res
      .status(400)
      .json({ message: "Per favore, fornisci un testo per la ricerca." });
  }
  try {
    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      searchQuery
    )}&language=it-IT`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Errore ricerca film:", error.message);
    res.status(500).json({
      message: "Errore durante la comunicazione con il servizio esterno.",
    });
  }
};

// *** DISCOVER CON "FILM IN ARRIVO" TMDB CORRETTO ***
exports.discoverMovies = async (req, res) => {
  try {
    console.log("=== DEBUG INIZIO ===");
    console.log("1. PARAMETRI RICEVUTI:", req.query);

    const {
      category = "popular",
      genre,
      release_date_gte,
      release_date_lte,
      vote_average_gte,
      with_original_language,
      with_keywords,
      page = 1,
    } = req.query;

    const voteFilter = vote_average_gte && parseFloat(vote_average_gte) > 0;
    const hasOtherFilters =
      genre ||
      release_date_gte ||
      release_date_lte ||
      with_original_language ||
      with_keywords;

    console.log("2. CONTROLLI:", {
      category,
      voteFilter,
      hasOtherFilters,
      page: parseInt(page),
    });

    let endpoint;
    let params = {
      api_key: API_KEY,
      language: "it-IT",
      page: page,
    };

    // *** STRATEGIA CON PAGINAZIONE CORRETTA ***
    if (voteFilter && !hasOtherFilters) {
      // Solo filtro valutazione: usa endpoint TMDB + filtro manuale
      console.log("3. STRATEGIA: Endpoint TMDB + Filtro valutazione manuale");

      switch (category) {
        case "popular":
          endpoint = "/movie/popular";
          console.log("   → /movie/popular");
          break;
        case "now_playing":
          endpoint = "/movie/now_playing";
          console.log("   → /movie/now_playing");
          break;
        case "top_rated":
          endpoint = "/movie/top_rated";
          console.log("   → /movie/top_rated");
          break;
        case "upcoming":
          endpoint = "/movie/upcoming";
          console.log("   → /movie/upcoming (Film in Arrivo TMDB)");
          break;
      }

      // *** RICHIESTE MULTIPLE PER OTTENERE ABBASTANZA RISULTATI FILTRATI ***
      const minRating = parseFloat(vote_average_gte);
      const targetResults = 18;
      const requestedPage = parseInt(page);
      let allFilteredResults = [];
      let currentTmdbPage = 1;
      let maxPages = 8; // Massimo 8 pagine per performance

      console.log("4. RACCOLTA MULTIPAGINA:", {
        targetResults,
        requestedPage,
        minRating,
        endpoint,
      });

      // Raccogli risultati da più pagine TMDB fino ad averne abbastanza
      while (
        allFilteredResults.length < targetResults * requestedPage &&
        maxPages > 0
      ) {
        const tmdbParams = { ...params, page: currentTmdbPage };

        console.log(`   → Richiesta TMDB pagina ${currentTmdbPage}...`);
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          params: tmdbParams,
        });
        const pageResults = response.data.results || [];

        if (pageResults.length === 0) {
          console.log("   → Pagina vuota, stop");
          break;
        }

        // Filtra per rating
        const filteredPageResults = pageResults.filter((movie) => {
          const movieRating = parseFloat(movie.vote_average || 0);
          return movieRating >= minRating;
        });

        console.log(
          `   → Pagina ${currentTmdbPage}: ${pageResults.length} totali → ${filteredPageResults.length} filtrati`
        );

        allFilteredResults = allFilteredResults.concat(filteredPageResults);
        currentTmdbPage++;
        maxPages--;
      }

      console.log(
        "5. TOTALE FILM FILTRATI RACCOLTI:",
        allFilteredResults.length
      );

      // Paginazione dei risultati filtrati
      const startIndex = (requestedPage - 1) * targetResults;
      const endIndex = startIndex + targetResults;
      const paginatedResults = allFilteredResults.slice(startIndex, endIndex);

      console.log("6. PAGINAZIONE FINALE:", {
        requestedPage,
        startIndex,
        endIndex,
        risultatiPagina: paginatedResults.length,
      });

      const totalPagesFiltered = Math.ceil(
        allFilteredResults.length / targetResults
      );

      return res.json({
        results: paginatedResults,
        total_pages: totalPagesFiltered,
        total_results: allFilteredResults.length,
        results_per_page: targetResults,
        page: requestedPage,
      });
    } else if (hasOtherFilters) {
      // Filtri complessi: usa discover
      console.log("3. STRATEGIA: DISCOVER (filtri complessi)");
      endpoint = "/discover/movie";

      switch (category) {
        case "popular":
          params.sort_by = "popularity.desc";
          break;
        case "now_playing":
          const today = new Date();
          const twoMonthsAgo = new Date();
          twoMonthsAgo.setMonth(today.getMonth() - 2);

          if (!release_date_gte) {
            params.release_date_gte = twoMonthsAgo.toISOString().split("T")[0];
          }
          if (!release_date_lte) {
            params.release_date_lte = today.toISOString().split("T")[0];
          }
          params.sort_by = "popularity.desc";
          break;
        case "top_rated":
          params.sort_by = "vote_average.desc";
          params.vote_count_gte = 500;
          break;
        case "upcoming":
          // *** FILM IN ARRIVO: ESATTAMENTE COME TMDB ***
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          if (!release_date_gte) {
            params.release_date_gte = tomorrow.toISOString().split("T")[0];
          }
          params.sort_by = "popularity.desc";
          console.log(
            "   → Film in Arrivo discover da:",
            params.release_date_gte
          );
          break;
      }

      // Applica filtri aggiuntivi
      if (genre) params.with_genres = genre;
      if (release_date_gte) params.release_date_gte = release_date_gte;
      if (release_date_lte) params.release_date_lte = release_date_lte;
      if (voteFilter) params.vote_average_gte = parseFloat(vote_average_gte);
      if (with_original_language)
        params.with_original_language = with_original_language;

      const url = `${BASE_URL}${endpoint}`;
      const response = await axios.get(url, { params });
      let results = response.data.results.slice(0, 18);

      return res.json({
        results: results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
        results_per_page: 18,
        page: parseInt(page),
      });
    } else {
      // Senza filtri: endpoint TMDB diretto
      console.log("3. STRATEGIA: Endpoint TMDB diretto (senza filtri)");

      switch (category) {
        case "popular":
          endpoint = "/movie/popular";
          console.log("   → /movie/popular");
          break;
        case "now_playing":
          endpoint = "/movie/now_playing";
          console.log("   → /movie/now_playing");
          break;
        case "top_rated":
          endpoint = "/movie/top_rated";
          console.log("   → /movie/top_rated");
          break;
        case "upcoming":
          endpoint = "/movie/upcoming";
          console.log("   → /movie/upcoming (Film in Arrivo TMDB)");
          break;
      }

      const url = `${BASE_URL}${endpoint}`;
      const response = await axios.get(url, { params });
      let results = response.data.results.slice(0, 18);

      console.log("4. RISULTATI FINALI (senza filtri):", results.length);

      return res.json({
        results: results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
        results_per_page: 18,
        page: parseInt(page),
      });
    }
  } catch (error) {
    console.error("ERRORE DISCOVER:", error.message);
    res.status(500).json({
      message: "Errore durante la ricerca con filtri.",
      error: error.message,
    });
  }
};

exports.getMovieDetails = async (req, res) => {
  const { tmdbId } = req.params;

  if (!/^\d+$/.test(tmdbId)) {
    return res.status(400).json({ message: "ID del film non valido." });
  }

  const url = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=it-IT&append_to_response=credits,recommendations,videos`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    const credits = data.credits;
    const director = credits?.crew?.find((member) => member.job === "Director");
    const producer = credits?.crew?.find(
      (member) =>
        member.job === "Producer" ||
        member.job === "Executive Producer" ||
        member.job === "Co-Producer"
    );
    const cast = credits?.cast?.slice(0, 10) || [];

    res.json({
      id: data.id,
      title: data.title,
      overview: data.overview,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      release_date: data.release_date,
      genres: data.genres,
      budget: data.budget,
      revenue: data.revenue,
      runtime: data.runtime,
      original_language: data.original_language,
      vote_average: data.vote_average,
      vote_count: data.vote_count,
      director: director || null,
      producer: producer || null,
      cast: cast,
      videos: data.videos?.results || [],
      recommendations: data.recommendations?.results || [],
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: "Film non trovato." });
    }
    console.error("Errore recupero dettagli film:", error.message);
    res.status(500).json({
      message: "Errore di comunicazione con il servizio esterno.",
    });
  }
};

exports.getTrendingMovies = async (req, res) => {
  try {
    const url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=it-IT`;
    const response = await axios.get(url);
    res.json(response.data.results);
  } catch (error) {
    console.error("Errore film di tendenza:", error.message);
    res.status(500).json({ message: "Errore del servizio esterno." });
  }
};

exports.getTopRatedMovies = async (req, res) => {
  try {
    const topMovies = await Review.aggregate([
      { $group: { _id: "$movie", average_rating: { $avg: "$rating" } } },
      { $sort: { average_rating: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "movies",
          localField: "_id",
          foreignField: "_id",
          as: "movie_details",
        },
      },
      { $unwind: "$movie_details" },
      {
        $project: {
          _id: 0,
          tmdb_id: "$movie_details.tmdb_id",
          title: "$movie_details.title",
          poster_path: "$movie_details.poster_path",
          average_rating: { $round: ["$average_rating", 1] },
        },
      },
    ]);
    res.json(topMovies);
  } catch (error) {
    console.error("Errore recupero top rated:", error.message);
    res.status(500).json({ message: "Errore del server." });
  }
};
