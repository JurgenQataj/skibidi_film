const axios = require("axios");
const OmdbCache = require("../models/OmdbCache");

const OMDB_API_KEY = process.env.OMDB_API_KEY || "f816b1d6";

/**
 * Arricchisce un array di film/serie tv con i voti IMDb e Rotten Tomatoes
 * pescando prima dalla cache interna e facendo chiamate OMDb solo per i mancanti.
 */
async function enrichWithOmdbRatings(items) {
  if (!items || items.length === 0) return items;

  // 1. Estrai gli ID validi
  const itemIds = items.map(item => item.tmdb_id || item.id).filter(Boolean);
  if (itemIds.length === 0) return items;

  // 2. Cerca nella cache DB
  const cachedData = await OmdbCache.find({ 
    tmdb_id: { $in: itemIds }
  });
  
  const cacheMap = new Map();
  // Costruisci chiave unica: tmdb_id-media_type
  cachedData.forEach(c => cacheMap.set(`${c.tmdb_id}-${c.media_type}`, c));

  // 3. Trova quali mancano
  const missingItems = items.filter(item => {
    const id = item.tmdb_id || item.id;
    const mType = item.media_type || 'movie';
    return id && !cacheMap.has(`${id}-${mType}`);
  });

  // 4. Fetch da OMDb per i mancanti (in sequenza per evitare Rate Limit di TMDB)
  for (const item of missingItems) {
    try {
      const id = item.tmdb_id || item.id;
      const mType = item.media_type || 'movie';
      
      // 4.1 Recupera imdb_id da TMDB per essere accurati al 100%
      const TMDB_API_KEY = process.env.TMDB_API_KEY;
      const tmdbUrl = `https://api.themoviedb.org/3/${mType}/${id}/external_ids?api_key=${TMDB_API_KEY}`;
      let imdbId = null;
      try {
        const tmdbRes = await axios.get(tmdbUrl);
        imdbId = tmdbRes.data.imdb_id;
      } catch (err) {
        console.error(`TMDB error fetching external_ids for ${mType} ${id}:`, err.message);
      }

      let res = { data: { Response: "False" } };
      
      if (imdbId) {
        const url = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}`;
        res = await axios.get(url);
      } else {
        // Fallback: search by title if no imdbId
        const title = item.title || item.name;
        const yearStr = item.release_date || item.first_air_date || item.release_year;
        const year = yearStr ? new Date(yearStr).getFullYear() : "";
        if (title) {
          const fallbackUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}&y=${year}&type=${mType === 'tv' ? 'series' : 'movie'}`;
          res = await axios.get(fallbackUrl);
        }
      }

      if (res.data && res.data.Response !== "False") {
        let rotten = null;
        if (res.data.Ratings) {
          const rt = res.data.Ratings.find(r => r.Source === "Rotten Tomatoes");
          if (rt) rotten = rt.Value;
        }

        const newCache = {
          tmdb_id: id,
          media_type: mType,
          imdb_rating: res.data.imdbRating && res.data.imdbRating !== "N/A" ? res.data.imdbRating : null,
          imdb_votes: res.data.imdbVotes !== "N/A" ? res.data.imdbVotes : null,
          rotten_tomatoes: rotten,
          metascore: res.data.Metascore !== "N/A" ? res.data.Metascore : null,
          updated_at: new Date()
        };

        await OmdbCache.findOneAndUpdate(
          { tmdb_id: id, media_type: mType },
          { $set: newCache },
          { upsert: true, new: true }
        );

        cacheMap.set(`${id}-${mType}`, newCache);
      } else {
        // Salva un record "vuoto" per evitare di richiederlo ogni volta se non esiste su OMDb
        const emptyCache = {
          tmdb_id: id,
          media_type: mType,
          updated_at: new Date()
        };
        await OmdbCache.findOneAndUpdate(
          { tmdb_id: id, media_type: mType },
          { $set: emptyCache },
          { upsert: true }
        );
        cacheMap.set(`${id}-${mType}`, emptyCache);
      }
      
      // Delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (err) {
      console.error(`Errore fetch OMDb per ${item.title || item.name}:`, err.message);
    }
  }

  // 5. Arricchisci gli items originali restituendo il nuovo array
  // Importante: per i mongoose document (.toObject()) o JSON classici
  return items.map(item => {
    const isDoc = typeof item.toObject === 'function';
    const rawItem = isDoc ? item.toObject() : item;
    
    const id = rawItem.tmdb_id || rawItem.id;
    const mType = rawItem.media_type || 'movie';
    const cached = cacheMap.get(`${id}-${mType}`);
    
    if (cached) {
      return {
        ...rawItem,
        imdb_rating: cached.imdb_rating,
        rotten_tomatoes: cached.rotten_tomatoes,
        metascore: cached.metascore
      };
    }
    return rawItem;
  });
}

module.exports = {
  enrichWithOmdbRatings
};
