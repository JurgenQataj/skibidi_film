const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

exports.searchTv = async (req, res) => {
  const searchQuery = req.query.query;
  if (!searchQuery) {
    return res.status(400).json({ message: "Per favore, fornisci un testo per la ricerca." });
  }
  try {
    const url = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&language=it-IT&region=IT`;
    const response = await axios.get(url);
    
    // Normalizziamo la risposta per assomigliare a quella dei film
    const normalizedResults = response.data.results.map(item => ({
      ...item,
      title: item.name,
      release_date: item.first_air_date,
      media_type: "tv"
    }));
    
    res.json({ ...response.data, results: normalizedResults });
  } catch (error) {
    console.error("Errore ricerca serie tv:", error.message);
    res.status(500).json({ message: "Errore durante la comunicazione con il servizio esterno." });
  }
};

exports.discoverTv = async (req, res) => {
  try {
    const {
      category = "popular", // Per le serie TV: popular, top_rated, on_the_air, airing_today
      genre,
      release_date_gte,
      release_date_lte,
      vote_average_gte,
      vote_count_gte, // [NUOVO] Estrarre limite minimo voti
      with_original_language,
      with_keywords, // [NUOVO] Estrarre le keywords passate
      with_companies,    // [NUOVO] Per gli studi/case di produzione
      with_origin_country, // [NUOVO] Per il paese di produzione
      sort_by,
      page = 1,
    } = req.query;

    let endpoint = "/tv/popular";
    if (category === "top_rated") endpoint = "/tv/top_rated";
    if (category === "now_playing" || category === "on_the_air") endpoint = "/tv/on_the_air";
    if (category === "upcoming" || category === "airing_today") endpoint = "/tv/airing_today";

    const params = {
      api_key: API_KEY,
      language: "it-IT",
      page: page,
      sort_by: sort_by || "popularity.desc",
      // Non usiamo region per le Serie TV spesso (o lo usiamo con watch_region)
    };

    if (genre) params.with_genres = genre;
    if (release_date_gte) params["first_air_date.gte"] = release_date_gte;
    if (release_date_lte) params["first_air_date.lte"] = release_date_lte;
    if (vote_average_gte) params["vote_average.gte"] = vote_average_gte;
    if (vote_count_gte) params["vote_count.gte"] = parseInt(vote_count_gte); // Assicura che sia numero
    if (with_original_language) params.with_original_language = with_original_language;
    if (with_keywords) params.with_keywords = with_keywords;
    if (with_companies) params.with_companies = with_companies;
    if (with_origin_country) params.with_origin_country = with_origin_country;

    // Se c'è una categoria specifica e non c'è un ordinamento manuale,
    // impostiamo il sort_by corretto per quella categoria quando usiamo discover
    if (category === "top_rated" && !sort_by) params.sort_by = "vote_average.desc";

    let fetchUrl = `${BASE_URL}${endpoint}`;
    if (genre || release_date_gte || release_date_lte || vote_average_gte || vote_count_gte || with_original_language || with_keywords || with_companies || with_origin_country || (sort_by && sort_by !== "popularity.desc")) {
        fetchUrl = `${BASE_URL}/discover/tv`;
    }

    console.log(`🔍 DISCOVER TV URL: ${fetchUrl} | Params:`, { ...params, api_key: "HIDDEN" });

    const response = await axios.get(fetchUrl, { params });
    
    // Normalizziamo la risposta per assomigliare a quella dei film
    const normalizedResults = response.data.results.map(item => ({
      ...item,
      title: item.name,
      release_date: item.first_air_date,
      media_type: "tv"
    }));
    
    return res.json({
        results: normalizedResults,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
        page: parseInt(page),
    });

  } catch (error) {
    console.error("ERRORE DISCOVER TV:", error);
    res.status(500).json({ message: "Errore durante la ricerca.", error: error.message });
  }
};

exports.getTvDetails = async (req, res) => {
  const { tmdbId } = req.params;
  if (isNaN(tmdbId)) {
    return res.status(400).json({ message: "ID della serie tv non valido." });
  }

  const url = `${BASE_URL}/tv/${tmdbId}?api_key=${API_KEY}&language=it-IT&append_to_response=credits,recommendations,videos,watch/providers`;
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    const credits = data.credits;
    
    // Nelle serie TV, i "creators" sono tipicamente usati invece dei "directors"
    const director = data.created_by && data.created_by.length > 0 ? data.created_by[0] : null;
    const producer = credits?.crew?.find(
      (member) =>
        member.job === "Producer" ||
        member.job === "Executive Producer" ||
        member.job === "Co-Producer"
    );
    const cast = credits?.cast?.slice(0, 10) || [];
    
    const normalizedRecommendations = (data.recommendations?.results || []).map(item => ({
      ...item,
      title: item.name,
      release_date: item.first_air_date,
      media_type: "tv"
    }));

    res.json({
      id: data.id,
      title: data.name, // Normalizzato
      overview: data.overview,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      release_date: data.first_air_date, // Normalizzato
      tagline: data.tagline,
      genres: data.genres,
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      status: data.status,
      // Runtime format: un array di tempi, prendiamo il primo se c'è
      runtime: data.episode_run_time && data.episode_run_time.length > 0 ? data.episode_run_time[0] : null,
      original_language: data.original_language,
      vote_average: data.vote_average,
      vote_count: data.vote_count,
      director: director || null,
      producer: producer || null,
      cast: cast,
      videos: data.videos?.results || [],
      recommendations: normalizedRecommendations,
      collection: null, // Le serie tv di solito non hanno collection, ma stagioni
      media_type: "tv",
      watch_providers: {
        flatrate: data["watch/providers"]?.results?.IT?.flatrate || [],
        link: data["watch/providers"]?.results?.IT?.link || null
      },
      production_companies: data.production_companies || [], // [NUOVO]
      production_countries: data.production_countries || [], // [NUOVO]
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: "Serie TV non trovata." });
    }
    console.error("Errore recupero dettagli serie tv:", error.message);
    res.status(500).json({ message: "Errore di comunicazione con il servizio esterno." });
  }
};

exports.getTrendingTv = async (req, res) => {
  try {
    const timeWindow = req.query.timeWindow === "day" ? "day" : "week";
    const url = `${BASE_URL}/trending/tv/${timeWindow}?api_key=${API_KEY}&language=it-IT`;
    const response = await axios.get(url);
    
    const normalizedResults = response.data.results.map(item => ({
      ...item,
      title: item.name,
      release_date: item.first_air_date,
      media_type: "tv"
    }));
    
    res.json(normalizedResults);
  } catch (error) {
    console.error("Errore serie tv di tendenza:", error.message);
    res.status(500).json({ message: "Errore del servizio esterno." });
  }
};
