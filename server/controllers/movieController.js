const Movie = require("../models/Movie");
const Review = require("../models/Review");
const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

exports.getMovieSuggestions = async (req, res) => {
  try {
    const searchQuery = req.query.query;
    const type = req.query.type || "movie"; // Default a movie
    if (!searchQuery || searchQuery.length < 2) {
      return res.json({ results: [] });
    }
    if (!API_KEY) {
      return res.status(500).json({ message: "API key not configured", results: [] });
    }

    // Scegli l'endpoint in base al tipo
    const endpoint = type === "person" ? "search/person" : "search/movie";
    const url = `${BASE_URL}/${endpoint}?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&language=it-IT&page=1`;
    
    const response = await axios.get(url);
    
    // Mappiamo i risultati gestendo sia film (title, poster_path) che persone (name, profile_path)
    const suggestions = response.data.results.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title || item.name, // Le persone hanno 'name', i film 'title'
      poster_path: item.poster_path || item.profile_path, // Le persone hanno 'profile_path'
      release_date: item.release_date || null, // Le persone non hanno release_date
      media_type: type 
    }));
    res.json({ results: suggestions });
  } catch (error) {
    console.error("Errore suggestions:", error.message);
    res.status(500).json({ message: error.message, results: [] });
  }
};

exports.searchMovies = async (req, res) => {
  const searchQuery = req.query.query;
  if (!searchQuery) {
    return res.status(400).json({ message: "Per favore, fornisci un testo per la ricerca." });
  }
  try {
    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&language=it-IT&region=IT`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Errore ricerca film:", error.message);
    res.status(500).json({ message: "Errore durante la comunicazione con il servizio esterno." });
  }
};

exports.searchPerson = async (req, res) => {
  const searchQuery = req.query.query;
  if (!searchQuery) {
    return res.status(400).json({ message: "Per favore, fornisci un nome per la ricerca." });
  }
  try {
    const url = `${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&language=it-IT`;
    const response = await axios.get(url);
    const people = response.data.results.map(person => ({
      id: person.id,
      name: person.name,
      profile_path: person.profile_path,
      known_for: person.known_for?.map(m => m.title || m.name).join(", ")
    }));
    res.json({ results: people, total_pages: response.data.total_pages });
  } catch (error) {
    console.error("Errore ricerca persona:", error.message);
    res.status(500).json({ message: "Errore durante la comunicazione con il servizio esterno." });
  }
};

exports.discoverMovies = async (req, res) => {
  try {
    const {
      category = "popular",
      genre,
      release_date_gte,
      release_date_lte,
      vote_average_gte,
      with_original_language,
      sort_by,
      page = 1,
    } = req.query;

    let endpoint = "/movie/popular";
    if (category === "top_rated") endpoint = "/movie/top_rated";
    if (category === "now_playing") endpoint = "/movie/now_playing";
    if (category === "upcoming") endpoint = "/movie/upcoming";

    const params = {
      api_key: API_KEY,
      language: "it-IT",
      page: page,
      sort_by: sort_by || "popularity.desc",
      region: "IT"
    };

    if (genre) params.with_genres = genre;
    if (release_date_gte) params["primary_release_date.gte"] = release_date_gte;
    if (release_date_lte) params["primary_release_date.lte"] = release_date_lte;
    if (vote_average_gte) params["vote_average.gte"] = vote_average_gte;
    if (with_original_language) params.with_original_language = with_original_language;

    let fetchUrl = `${BASE_URL}${endpoint}`;
    if (genre || release_date_gte || release_date_lte || vote_average_gte || with_original_language || sort_by) {
        fetchUrl = `${BASE_URL}/discover/movie`;
    }

    const response = await axios.get(fetchUrl, { params });
    
    return res.json({
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
        page: parseInt(page),
    });

  } catch (error) {
    console.error("ERRORE DISCOVER:", error);
    res.status(500).json({ message: "Errore durante la ricerca.", error: error.message });
  }
};

exports.getMovieDetails = async (req, res) => {
  const { tmdbId } = req.params;
  if (!/^\d+$/.test(tmdbId)) {
    return res.status(400).json({ message: "ID del film non valido." });
  }

  const url = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=it-IT&append_to_response=credits,recommendations,videos,watch/providers`;
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
      tagline: data.tagline, // Aggiunto tagline
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
      collection: data.belongs_to_collection || null, // [NUOVO] Saga
      watch_providers: {
        flatrate: data["watch/providers"]?.results?.IT?.flatrate || [],
        link: data["watch/providers"]?.results?.IT?.link || null
      }, // [NUOVO] Dove vederlo (Streaming IT) with link
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: "Film non trovato." });
    }
    console.error("Errore recupero dettagli film:", error.message);
    res.status(500).json({ message: "Errore di comunicazione con il servizio esterno." });
  }
};

exports.getTrendingMovies = async (req, res) => {
  try {
    const timeWindow = req.query.timeWindow === "day" ? "day" : "week";
    const url = `${BASE_URL}/trending/movie/${timeWindow}?api_key=${API_KEY}&language=it-IT`;
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

// --- FUNZIONE AGGIORNATA: CERCA PERSONA SU TMDB ---
exports.getMoviesByPerson = async (req, res) => {
  const personName = decodeURIComponent(req.params.name);
  
  try {
    // 1. Cerca l'ID della persona su TMDB usando il nome
    const searchUrl = `${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(personName)}&language=it-IT`;
    const searchResponse = await axios.get(searchUrl);
    
    // Se non troviamo nessuno su TMDB
    if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
       return res.json({ 
         personName: personName, 
         directed: [], 
         acted: [] 
       });
    }

    // Prendiamo il primo risultato
    const person = searchResponse.data.results[0];
    const personId = person.id;
    const officialName = person.name;

    // 2. Ottieni filmografia completa da TMDB
    // 2. Fetch Credits & Short Films (Parallel)
    console.log("🎥 Fetching data for:", officialName); // DEBUG LOG
    // Usiamo discover per trovare ESATTAMENTE i film under 40 min di questa persona
    // E anche per trovare l'ordine di incasso (Revenue) per Cast e Crew
    // [NUOVO] Fetch person details per biografia e profile path
    const [creditsResponse, shortsResponse, revenueCastResponse, revenueCrewResponse, personDetailsResponse] = await Promise.all([
      axios.get(`${BASE_URL}/person/${personId}/movie_credits?api_key=${API_KEY}&language=it-IT`),
      axios.get(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_people=${personId}&with_runtime.lte=40`),
      axios.get(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_cast=${personId}&sort_by=revenue.desc&page=1`),
      axios.get(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_crew=${personId}&sort_by=revenue.desc&page=1`),
      axios.get(`${BASE_URL}/person/${personId}?api_key=${API_KEY}&language=it-IT`) // <-- Dettagli persona
    ]);

    const cast = creditsResponse.data.cast || [];
    const crew = creditsResponse.data.crew || [];
    const biography = personDetailsResponse.data.biography || "";
    const profilePath = personDetailsResponse.data.profile_path || null;
    
    // Create a Set of IDs for short films for fast lookup
    const shortMovieIds = new Set(shortsResponse.data.results.map(m => m.id));
    
    // Revenue Ranks (Map ID -> Rank)
    const getRevenueRankMap = (list) => {
      const map = new Map();
      list.forEach((m, index) => map.set(m.id, index + 1));
      return map;
    };
    const castRevenueMap = getRevenueRankMap(revenueCastResponse.data.results);
    const crewRevenueMap = getRevenueRankMap(revenueCrewResponse.data.results);

    // Formatter
    const formatMovie = (m, rankMap) => ({
      _id: m.id, 
      tmdb_id: m.id,
      title: m.title,
      poster_path: m.poster_path,
      release_date: m.release_date,
      vote_average: m.vote_average,
      vote_count: m.vote_count,
      genre_ids: m.genre_ids,
      is_short: shortMovieIds.has(m.id), // [NUOVO] Preciso al 100% grazie a discover
      character: m.character, // [NUOVO] Per controllo 'uncredited'
      job: m.job, // [NUOVO] Per controllo 'uncredited' o ruoli specifici
      revenue_rank: rankMap ? (rankMap.get(m.id) || 10000) : 10000 // Rank incassi
    });

    // 3. Filtra Attore
    const acted = cast
      .filter(m => m.poster_path)
      .map(m => formatMovie(m, castRevenueMap))
      .sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
        const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
        return dateB - dateA;
      });

    // 4. Filtra Regista
    const directed = crew
      .filter(m => m.job === "Director")
      .filter(m => m.poster_path)
      .map(m => formatMovie(m, crewRevenueMap))
      .sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
        const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
        return dateB - dateA;
      });

    res.json({
      personName: officialName,
      biography,
      profile_path: profilePath,
      directed,
      acted
    });

  } catch (error) {
    console.error("Errore ricerca persona su TMDB:", error.message);
    res.status(500).json({ message: "Errore nel recupero della filmografia." });
  }
};

// --- FUNZIONE SAGA (COLLECTION) ---
exports.getCollectionDetails = async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: "ID della collezione non valido." });
  }

  try {
    const url = `${BASE_URL}/collection/${id}?api_key=${API_KEY}&language=it-IT`;
    const response = await axios.get(url);
    
    // TMDB ordina tendenzialmente per data, ma per sicurezza ordiniamo noi
    const parts = response.data.parts || [];
    parts.sort((a, b) => {
      const dateA = a.release_date ? new Date(a.release_date) : new Date("2099");
      const dateB = b.release_date ? new Date(b.release_date) : new Date("2099");
      return dateA - dateB;
    });

    res.json({
      id: response.data.id,
      name: response.data.name,
      overview: response.data.overview,
      poster_path: response.data.poster_path,
      backdrop_path: response.data.backdrop_path,
      parts: parts
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: "Collezione non trovata." });
    }
    console.error("Errore recupero collezione:", error.message);
    res.status(500).json({ message: "Errore di comunicazione con il servizio esterno." });
  }
};

// --- FUNZIONE BACKFILL A BATCH (Anti-Timeout) ---
exports.updateAllMoviesData = async (req, res) => {
  console.log("--- Inizio aggiornamento parziale (Batch) ---");
  const BATCH_SIZE = 50;

  try {
    const moviesToUpdate = await Movie.find({
      $or: [
        { director: { $exists: false } },
        { cast: { $exists: false } },
        { release_year: { $exists: false } },
        { director: null },
        { release_year: null },
        { cast: { $size: 0 } }
      ]
    }).limit(BATCH_SIZE);

    const totalRemaining = await Movie.countDocuments({
      $or: [
        { director: { $exists: false } },
        { cast: { $exists: false } },
        { release_year: { $exists: false } },
        { director: null },
        { release_year: null },
        { cast: { $size: 0 } }
      ]
    });

    if (moviesToUpdate.length === 0) {
      return res.json({
        status: "COMPLETED",
        message: "Tutti i film sono aggiornati! Non c'è altro da fare.",
        remaining: 0
      });
    }

    console.log(`Batch: ${moviesToUpdate.length} film. Rimasti: ${totalRemaining}`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const movie of moviesToUpdate) {
      try {
        const tmdbUrl = `${BASE_URL}/movie/${movie.tmdb_id}?api_key=${API_KEY}&language=it-IT&append_to_response=credits`;
        const response = await axios.get(tmdbUrl);
        const data = response.data;

        const releaseYear = data.release_date ? new Date(data.release_date).getFullYear() : null;
        const directorData = data.credits?.crew?.find(c => c.job === "Director");
        const director = directorData ? directorData.name : "Sconosciuto";
        const cast = data.credits?.cast?.slice(0, 5).map(c => c.name) || [];

        await Movie.findByIdAndUpdate(movie._id, {
          release_year: releaseYear,
          director: director,
          cast: cast
        });
        
        updatedCount++;
        await new Promise(resolve => setTimeout(resolve, 20)); 

      } catch (err) {
        console.error(`[ERRORE] Film ID ${movie.tmdb_id}:`, err.message);
        errorCount++;
        if (err.response && err.response.status === 404) {
             await Movie.findByIdAndUpdate(movie._id, {
                director: "Non Trovato",
                release_year: 0,
                cast: ["N/A"]
             });
        }
      }
    }

    res.json({
      status: "IN_PROGRESS",
      message: `Aggiornati ${updatedCount} film.`,
      errors: errorCount,
      remaining: totalRemaining - updatedCount,
      action: "RICARICA LA PAGINA PER CONTINUARE"
    });

  } catch (error) {
    console.error("Errore backfill:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};