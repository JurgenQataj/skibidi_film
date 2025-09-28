const Movie = require("../models/Movie");
const Review = require("../models/Review");
const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

exports.getMovieSuggestions = async (req, res) => {
  try {
    const searchQuery = req.query.query;
    if (!searchQuery || searchQuery.length < 2) {
      return res.json({ results: [] });
    }
    if (!API_KEY) {
      return res
        .status(500)
        .json({ message: "API key not configured", results: [] });
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
    res.status(500).json({ message: error.message, results: [] });
  }
};

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
    res
      .status(500)
      .json({
        message: "Errore durante la comunicazione con il servizio esterno.",
      });
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
      with_keywords,
      sort_by,
      page = 1,
    } = req.query;

    console.log("=== FILTRO LINGUA RIGOROSO ===");
    console.log("1. FILTRI RICHIESTI:", {
      categoria: category,
      genere: genre,
      lingua: with_original_language,
      ordinamento: sort_by,
    });

    const hasFilters = !!(
      genre ||
      release_date_gte ||
      release_date_lte ||
      vote_average_gte ||
      with_original_language ||
      with_keywords ||
      sort_by
    );

    if (!hasFilters && category === "popular") {
      // Film popolari senza filtri = box office
      console.log("2. → FILM POPOLARI: Box office decrescente");

      let allMovies = [];
      const endpoints = [
        { name: "popular", url: "/movie/popular", pages: 40 },
        { name: "top_rated", url: "/movie/top_rated", pages: 30 },
        { name: "now_playing", url: "/movie/now_playing", pages: 20 },
      ];

      for (const endpointInfo of endpoints) {
        for (let tmdbPage = 1; tmdbPage <= endpointInfo.pages; tmdbPage++) {
          try {
            const params = {
              api_key: API_KEY,
              language: "it-IT",
              page: tmdbPage,
            };
            const response = await axios.get(`${BASE_URL}${endpointInfo.url}`, {
              params,
            });
            const pageResults = response.data.results || [];

            if (pageResults.length === 0) continue;

            const newMovies = pageResults.filter(
              (movie) => !allMovies.some((existing) => existing.id === movie.id)
            );

            allMovies = allMovies.concat(newMovies);
          } catch (error) {
            continue;
          }
        }
      }

      const sortedByRevenue = allMovies.sort((a, b) => {
        const revenueA = a.revenue || 0;
        const revenueB = b.revenue || 0;

        if (revenueA > 0 && revenueB > 0) {
          return revenueB - revenueA;
        }

        if (revenueA > 0 && revenueB === 0) return -1;
        if (revenueA === 0 && revenueB > 0) return 1;

        return (b.vote_count || 0) - (a.vote_count || 0);
      });

      const results = sortedByRevenue.slice(0, 18);

      return res.json({
        results: results,
        total_pages: Math.ceil(sortedByRevenue.length / 18),
        total_results: sortedByRevenue.length,
        results_per_page: 18,
        page: parseInt(page),
      });
    } else if (!hasFilters) {
      // Altre categorie senza filtri
      let endpoint;
      switch (category) {
        case "now_playing":
          endpoint = "/movie/now_playing";
          break;
        case "top_rated":
          endpoint = "/movie/top_rated";
          break;
        case "upcoming":
          endpoint = "/movie/upcoming";
          break;
        default:
          endpoint = "/movie/popular";
          break;
      }

      const params = { api_key: API_KEY, language: "it-IT", page: page };
      const response = await axios.get(`${BASE_URL}${endpoint}`, { params });
      let results = response.data.results.slice(0, 18);

      return res.json({
        results: results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
        results_per_page: 18,
        page: parseInt(page),
      });
    }

    // *** CON FILTRI: RACCOLTA MASSIVA ***
    console.log("2. → CON FILTRI: Raccolta massiva");

    let allMovies = [];

    const endpoints = [
      { name: "popular", url: "/movie/popular", pages: 60 },
      { name: "top_rated", url: "/movie/top_rated", pages: 50 },
      { name: "now_playing", url: "/movie/now_playing", pages: 30 },
      { name: "upcoming", url: "/movie/upcoming", pages: 25 },
      { name: "trending_day", url: "/trending/movie/day", pages: 10 },
      { name: "trending_week", url: "/trending/movie/week", pages: 5 },
    ];

    if (category && category !== "popular") {
      const categoryEndpoint = endpoints.find((ep) => ep.name === category);
      if (categoryEndpoint) {
        categoryEndpoint.pages = 80;
        const otherEndpoints = endpoints.filter((ep) => ep.name !== category);
        endpoints.splice(
          0,
          endpoints.length,
          categoryEndpoint,
          ...otherEndpoints
        );
      }
    }

    console.log("3. → RACCOLTA MASSIVA:");

    for (const endpointInfo of endpoints) {
      console.log(`   → ${endpointInfo.name}: ${endpointInfo.pages} pagine`);

      let consecutiveEmptyPages = 0;

      for (let tmdbPage = 1; tmdbPage <= endpointInfo.pages; tmdbPage++) {
        try {
          const params = {
            api_key: API_KEY,
            language: "it-IT",
            page: tmdbPage,
          };
          const response = await axios.get(`${BASE_URL}${endpointInfo.url}`, {
            params,
          });
          const pageResults = response.data.results || [];

          if (pageResults.length === 0) {
            consecutiveEmptyPages++;
            if (consecutiveEmptyPages >= 3) {
              break;
            }
            continue;
          } else {
            consecutiveEmptyPages = 0;
          }

          const newMovies = pageResults.filter(
            (movie) => !allMovies.some((existing) => existing.id === movie.id)
          );

          allMovies = allMovies.concat(newMovies);

          if (tmdbPage % 15 === 0) {
            console.log(
              `     → Pagina ${tmdbPage}: totale film ${allMovies.length}`
            );
          }
        } catch (error) {
          consecutiveEmptyPages++;
          if (consecutiveEmptyPages >= 5) {
            break;
          }
          continue;
        }
      }

      if (allMovies.length >= 5000) {
        console.log("   → Limite 5000 film raggiunto");
        break;
      }
    }

    console.log("4. → FILM TOTALI RACCOLTI:", allMovies.length);

    // *** FILTRI JAVASCRIPT ***
    let filteredMovies = allMovies;

    // FILTRO DATE
    if (release_date_gte || release_date_lte) {
      const beforeDate = filteredMovies.length;

      filteredMovies = filteredMovies.filter((movie) => {
        if (!movie.release_date) return false;

        const movieDate = movie.release_date;
        let passes = true;

        if (release_date_gte && movieDate < release_date_gte) {
          passes = false;
        }
        if (release_date_lte && movieDate > release_date_lte) {
          passes = false;
        }

        return passes;
      });

      console.log(`5. → FILTRO DATE: ${beforeDate} → ${filteredMovies.length}`);
    }

    // FILTRO GENERE
    if (genre) {
      const genreId = parseInt(genre);
      const beforeGenre = filteredMovies.length;

      filteredMovies = filteredMovies.filter(
        (movie) => movie.genre_ids && movie.genre_ids.includes(genreId)
      );

      console.log(
        `6. → FILTRO GENERE (${genreId}): ${beforeGenre} → ${filteredMovies.length}`
      );
    }

    // FILTRO VALUTAZIONE
    if (vote_average_gte && parseFloat(vote_average_gte) > 0) {
      const minRating = parseFloat(vote_average_gte);
      const beforeRating = filteredMovies.length;
      filteredMovies = filteredMovies.filter((movie) => {
        const movieRating = parseFloat(movie.vote_average || 0);
        return movieRating >= minRating;
      });
      console.log(
        `7. → FILTRO VALUTAZIONE (≥${minRating}): ${beforeRating} → ${filteredMovies.length}`
      );
    }

    // *** FILTRO LINGUA RIGOROSO - CORREZIONE ***
    if (with_original_language) {
      const beforeLang = filteredMovies.length;

      // Debug distribuzione lingue
      const languageCount = {};
      filteredMovies.forEach((movie) => {
        const lang = movie.original_language || "unknown";
        languageCount[lang] = (languageCount[lang] || 0) + 1;
      });

      console.log(`8. → FILTRO LINGUA RIGOROSO (${with_original_language}):`);
      console.log(`   → Prima del filtro: ${beforeLang} film`);

      // Top lingue presenti
      const topLanguages = Object.entries(languageCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
      console.log(
        "   → Lingue presenti:",
        topLanguages.map(([lang, count]) => `${lang}(${count})`).join(", ")
      );

      // *** FILTRO STANDARD PER TUTTE LE LINGUE - SOLO LINGUA ORIGINALE ***
      filteredMovies = filteredMovies.filter(
        (movie) => movie.original_language === with_original_language
      );

      console.log(`   → Dopo il filtro: ${filteredMovies.length} film`);
      console.log(
        `   → SOLO film con lingua originale: ${with_original_language}`
      );

      if (filteredMovies.length > 0) {
        console.log("   → Esempi film nella lingua richiesta:");
        filteredMovies.slice(0, 8).forEach((movie, i) => {
          console.log(
            `     ${i + 1}. ${movie.title} (${movie.original_language}) - ${
              movie.release_date
            }`
          );
        });
      } else {
        console.log("   → NESSUN FILM TROVATO con questa lingua originale!");
        console.log(
          `   → Suggerimento: Prova lingue più comuni come: en(${
            languageCount["en"] || 0
          }), fr(${languageCount["fr"] || 0}), es(${languageCount["es"] || 0})`
        );
      }
    }

    // Ordinamento
    if (sort_by) {
      console.log("9. → ORDINAMENTO:", sort_by);

      if (sort_by === "popularity.desc") {
        filteredMovies.sort((a, b) => {
          const revenueA = a.revenue || 0;
          const revenueB = b.revenue || 0;

          if (revenueA > 0 && revenueB > 0) {
            return revenueB - revenueA;
          }
          if (revenueA > 0 && revenueB === 0) return -1;
          if (revenueA === 0 && revenueB > 0) return 1;

          return (b.vote_count || 0) - (a.vote_count || 0);
        });
      } else if (sort_by === "popularity.asc") {
        filteredMovies.sort((a, b) => {
          const revenueA = a.revenue || 0;
          const revenueB = b.revenue || 0;

          if (revenueA > 0 && revenueB > 0) {
            return revenueA - revenueB;
          }
          if (revenueA > 0 && revenueB === 0) return 1;
          if (revenueA === 0 && revenueB > 0) return -1;

          return (a.vote_count || 0) - (b.vote_count || 0);
        });
      } else if (sort_by === "vote_average.desc") {
        filteredMovies.sort(
          (a, b) => (b.vote_average || 0) - (a.vote_average || 0)
        );
      } else if (sort_by === "vote_average.asc") {
        filteredMovies.sort(
          (a, b) => (a.vote_average || 0) - (b.vote_average || 0)
        );
      } else if (sort_by === "release_date.desc") {
        filteredMovies.sort((a, b) =>
          (b.release_date || "").localeCompare(a.release_date || "")
        );
      } else if (sort_by === "release_date.asc") {
        filteredMovies.sort((a, b) =>
          (a.release_date || "").localeCompare(b.release_date || "")
        );
      }
    } else {
      console.log("9. → ORDINAMENTO PREDEFINITO: vote_count");
      filteredMovies.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    }

    // Paginazione
    const resultsPerPage = 18;
    const requestedPage = parseInt(page);
    const startIndex = (requestedPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const paginatedResults = filteredMovies.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredMovies.length / resultsPerPage);

    console.log("10. → RISULTATI FINALI:", {
      totaliDopoFiltri: filteredMovies.length,
      paginaCorrente: requestedPage,
      risultatiPagina: paginatedResults.length,
      pagineTotali: totalPages,
    });

    console.log("=== FINE FILTRO LINGUA RIGOROSO ===");

    return res.json({
      results: paginatedResults,
      total_pages: totalPages,
      total_results: filteredMovies.length,
      results_per_page: resultsPerPage,
      page: requestedPage,
    });
  } catch (error) {
    console.error("ERRORE FILTRO LINGUA:", error);
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
    res
      .status(500)
      .json({ message: "Errore di comunicazione con il servizio esterno." });
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
