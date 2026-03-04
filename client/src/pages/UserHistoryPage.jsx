import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./UserHistoryPage.module.css";
import { FaChevronLeft } from "react-icons/fa";

function UserHistoryPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const filter = searchParams.get("filter");
  const value = searchParams.get("value");
  const subValue = searchParams.get("subValue");

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/api/users/${userId}/filtered-history?filter=${filter}&value=${value}&subValue=${subValue}`
        );
        setReviews(res.data);
        
        // Fetch username for the title
        const userRes = await axios.get(`${API_URL}/api/users/${userId}/profile`);
        setUsername(userRes.data.username);
      } catch (err) {
        console.error("Errore caricamento history:", err);
        setError("Impossibile caricare la cronologia.");
      } finally {
        setLoading(false);
      }
    };

    if (userId && filter && value) {
      fetchHistory();
    } else {
      setError("Parametri mancanti.");
      setLoading(false);
    }
  }, [userId, filter, value, subValue, API_URL]);

  const getTitle = () => {
    switch (filter) {
      case "actor": return `Film con ${value}`;
      case "director": return `Film diretti da ${value}`;
      case "genre": return `Film di genere ${value}`;
      case "decade": return `Film degli anni ${value}`;
      case "studio": return `Film prodotti da ${value}`;
      case "country": return `Film prodotti in ${value}`;
      case "language": return `Film in lingua ${value}`;
      case "keyword": return `Film con tema: ${value}`;
      case "crew": return `Film con ${value} (${subValue})`;
      default: return "Cronologia Film";
    }
  };

  if (loading) return <div className={styles.loading}>Caricamento in corso...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <FaChevronLeft /> Torna alle statistiche
      </button>

      <header className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
        <p className={styles.subtitle}>Cronologia di {username} • {reviews.length} film trovati</p>
      </header>

      {reviews.length === 0 ? (
        <div className={styles.empty}>Nessun film trovato per questo filtro.</div>
      ) : (
        <ol className={styles.historyList}>
          {reviews.map((review, index) => (
            <li 
              key={review._id} 
              className={styles.historyItem}
              onClick={() => navigate(`/movie/${review.movie.tmdb_id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/movie/${review.movie.tmdb_id}`); }}
              tabIndex={0}
              role="button"
            >
              <span className={styles.historyNumber}>{index + 1}</span>
              <img
                src={review.movie.poster_path ? `https://image.tmdb.org/t/p/w185${review.movie.poster_path}` : "https://placehold.co/185x278?text=No+Img"}
                alt={`Poster di ${review.movie.title}`}
                className={styles.historyPoster}
              />
              <div className={styles.historyInfo}>
                <span className={styles.historyTitle}>{review.movie.title}</span>
                <span className={styles.historyDetails}>
                  {review.movie.release_year || new Date(review.movie.release_date).getFullYear()} 
                  {review.movie.director && ` • Regia di ${review.movie.director}`}
                </span>
              </div>
              <span className={styles.historyRating}>{review.rating}/10</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default UserHistoryPage;
