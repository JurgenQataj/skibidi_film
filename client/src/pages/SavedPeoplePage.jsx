import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./SavedPeoplePage.module.css";
import { SkeletonWithLogo, SkeletonMovieCard } from "../components/Skeleton";
import MovieCard from "../components/MovieCard";
import { jwtDecode } from "jwt-decode";
import { FiUser, FiTrash2, FiChevronLeft, FiSearch, FiFilm, FiAward, FiStar, FiActivity } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const axiosInstance = axios;

export default function SavedPeoplePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  
  // Dettagli del talento selezionato (Pannello destro)
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const currentUserId = token ? jwtDecode(token).user.id : null;
        setLoggedInUserId(currentUserId);

        // Carica profilo utente (per i talenti salvati e username)
        const userRes = await axiosInstance.get(`${API_URL}/api/users/${userId}/profile`);
        setUsername(userRes.data.username);
        const savedData = userRes.data.savedPeople ? [...userRes.data.savedPeople].reverse() : [];
        setPeople(savedData);
        
        // Seleziona il primo talento come default (se presente)
        if (savedData.length > 0) {
          handleSelectPerson(savedData[0]);
        }

        // Carica le recensioni dell'utente per incrociare le statistiche (film visti)
        try {
          const reviewsRes = await axiosInstance.get(`${API_URL}/api/users/${userId}/reviews`);
          setReviews(reviewsRes.data || []);
        } catch {
          setReviews([]);
        }
      } catch (error) {
        console.error("Errore nel caricamento degli elementi salvati", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, API_URL]);

  const handleSelectPerson = async (person) => {
    setSelectedPerson(person);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await axiosInstance.get(`${API_URL}/api/movies/person/${encodeURIComponent(person.name)}`);
      setDetailData(res.data);
    } catch (error) {
      console.error("Errore nel recupero dettagli talento:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeletePerson = async (e, personId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      await axiosInstance.delete(`${API_URL}/api/users/${userId}/saved-people/${personId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedPeople = people.filter((p) => p.id !== personId);
      setPeople(updatedPeople);
      
      // Se abbiamo cancellato il talento selezionato, seleziona il prossimo o azzera
      if (selectedPerson?.id === personId) {
        if (updatedPeople.length > 0) {
          handleSelectPerson(updatedPeople[0]);
        } else {
          setSelectedPerson(null);
          setDetailData(null);
        }
      }
    } catch (error) {
      console.error("Errore nella rimozione della persona dai salvati", error);
    }
  };

  // Calcola quanti film recensiti dall'utente vedono la partecipazione del talento
  const getSeenCount = (personName) => {
    if (!reviews || reviews.length === 0) return 0;
    const nameLower = personName.toLowerCase();
    return reviews.filter((r) => {
      if (!r.movie) return false;
      const cast = (r.movie.cast || []).map((c) => c.toLowerCase());
      const director = (r.movie.director || "").toLowerCase();
      return cast.includes(nameLower) || director === nameLower;
    }).length;
  };

  // Calcola il numero di film unici recensiti con ALMENO uno dei talenti salvati
  const getUniqueSeenWithSavedTalents = () => {
    if (!reviews || reviews.length === 0 || people.length === 0) return 0;
    const peopleNamesLower = people.map((p) => p.name.toLowerCase());
    return reviews.filter((r) => {
      if (!r.movie) return false;
      const cast = (r.movie.cast || []).map((c) => c.toLowerCase());
      const director = (r.movie.director || "").toLowerCase();
      const hasSavedActor = cast.some((c) => peopleNamesLower.includes(c));
      const hasSavedDirector = peopleNamesLower.includes(director);
      return hasSavedActor || hasSavedDirector;
    }).length;
  };

  // Trova il talento più visto in assoluto tra quelli salvati
  const getMostViewedTalent = () => {
    if (people.length === 0 || !reviews || reviews.length === 0) return null;
    let maxCount = -1;
    let topTalent = null;
    people.forEach((p) => {
      const count = getSeenCount(p.name);
      if (count > maxCount && count > 0) {
        maxCount = count;
        topTalent = { name: p.name, count, profile_path: p.profile_path };
      }
    });
    return topTalent;
  };

  // Ottiene i film con voto più alto del talento
  const getTopMovies = () => {
    if (!detailData) return [];
    const all = [...(detailData.directed || []), ...(detailData.acted || [])];
    const unique = [];
    const seenIds = new Set();
    all.forEach((m) => {
      const id = m.tmdb_id || m.id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        unique.push(m);
      }
    });
    return unique.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 4);
  };

  if (loading) return <SkeletonWithLogo />;

  const isOwnProfile = loggedInUserId === userId;
  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const topTalent = getMostViewedTalent();
  const topMovies = getTopMovies();

  return (
    <div className={styles.pageWrapper}>
      {/* Dynamic blurred backdrop showing portrait of selected talent */}
      {selectedPerson && (
        <div 
          className={styles.dynamicBackdrop} 
          style={{ 
            backgroundImage: `url(${selectedPerson.profile_path ? `https://image.tmdb.org/t/p/w300${selectedPerson.profile_path}` : ''})` 
          }} 
        />
      )}
      
      <header className={styles.headerContainer}>
        <div className={styles.titleArea}>
          <span className={styles.superTitle}>Osservatorio Personale</span>
          <h1 className={styles.mainTitle}>I Talenti di {username}</h1>
        </div>
        <button 
          className={styles.backButton} 
          onClick={() => navigate(`/profile/${userId}`)}
          aria-label="Torna al profilo"
        >
          <FiChevronLeft size={20} />
          <span>Profilo</span>
        </button>
      </header>

      <main className={styles.contentArea}>
        {people.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⭐</div>
            <h2 className={styles.emptyTitle}>Nessun talento salvato</h2>
            <p className={styles.emptyDesc}>
              Visita il profilo di attori o registi e clicca su "Salva" per far nascere il tuo osservatorio cinematografico personale.
            </p>
          </div>
        ) : (
          <div className={styles.dashboardLayout}>
            {/* PANNELLO SINISTRO: Griglia e Ricerca */}
            <div className={styles.leftPanel}>
              {/* Widget Statistiche Rapide */}
              <div className={styles.statsCard}>
                <div className={styles.statBox}>
                  <span className={styles.statNumber}>{people.length}</span>
                  <span className={styles.statText}>Talenti</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statNumber}>{getUniqueSeenWithSavedTalents()}</span>
                  <span className={styles.statText}>Film Visti</span>
                </div>
                {topTalent && (
                  <div className={`${styles.statBox} ${styles.topTalentBox}`}>
                    <span className={styles.statLabelText}>Più Visto</span>
                    <span className={styles.statValueText}>
                      {topTalent.name} ({topTalent.count} 🎬)
                    </span>
                  </div>
                )}
              </div>

              {/* Ricerca */}
              <div className={styles.searchContainer}>
                <FiSearch className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchBar}
                  placeholder="Filtra per nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Griglia dei Talenti */}
              {filteredPeople.length === 0 ? (
                <div className={styles.noResults}>
                  Nessun talento corrisponde alla ricerca.
                </div>
              ) : (
                <div className={styles.grid}>
                  {filteredPeople.map((person, index) => {
                    const delay = `${Math.min(index * 0.03, 0.3)}s`;
                    const seenCount = getSeenCount(person.name);
                    const isSelected = selectedPerson?.id === person.id;
                    
                    return (
                      <div 
                        key={person.id} 
                        className={`${styles.actorCardContainer} ${isSelected ? styles.selectedCard : ""}`}
                        style={{ animationDelay: delay }}
                        onClick={() => handleSelectPerson(person)}
                      >
                        <div className={styles.actorCard}>
                          <div className={styles.imageWrapper}>
                            <img 
                              className={styles.image} 
                              src={person.profile_path ? `https://image.tmdb.org/t/p/w300${person.profile_path}` : "https://placehold.co/300x450/1a1a2e/666?text=?"} 
                              alt={person.name} 
                              loading="lazy"
                            />
                          </div>
                          {seenCount > 0 && (
                            <div className={styles.seenBadge}>
                              <span>🎬 {seenCount} visti</span>
                            </div>
                          )}
                          <div className={styles.overlay}>
                            <div className={styles.nameInfo}>
                              <h3 className={styles.actorName}>{person.name}</h3>
                            </div>
                          </div>
                        </div>
                        {isOwnProfile && (
                          <button
                            className={styles.removePersonBtn}
                            onClick={(e) => handleDeletePerson(e, person.id)}
                            title="Rimuovi dai salvati"
                            aria-label="Rimuovi"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANNELLO DESTRO: Talent Showcase & Explore */}
            <div className={styles.rightPanel}>
              <AnimatePresence mode="wait">
                {selectedPerson ? (
                  <motion.div
                    key={selectedPerson.id}
                    className={styles.showcaseCard}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Header Showcase */}
                    <div className={styles.showcaseHeader}>
                      <img 
                        src={selectedPerson.profile_path ? `https://image.tmdb.org/t/p/w500${selectedPerson.profile_path}` : "https://placehold.co/300x450/1a1a2e/666?text=?"} 
                        alt={selectedPerson.name}
                        className={styles.showcaseAvatar}
                      />
                      <div className={styles.showcaseHeaderInfo}>
                        <h2 className={styles.showcaseName}>{selectedPerson.name}</h2>
                        <div className={styles.showcaseMetaRow}>
                          <span className={styles.showcaseSeenPill}>
                            <FiActivity style={{ marginRight: '4px' }} />
                            {getSeenCount(selectedPerson.name)} Film Visti
                          </span>
                          <Link 
                            to={`/person/${encodeURIComponent(selectedPerson.name)}`}
                            className={styles.viewProfileBtn}
                          >
                            Pagina Completa &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Biografia / Info */}
                    <div className={styles.showcaseSection}>
                      <h4 className={styles.showcaseSubTitle}>
                        <FiUser style={{ marginRight: '6px' }} /> Biografia
                      </h4>
                      {detailLoading ? (
                        <div className={styles.detailLoader}>
                          <div className={styles.spinner} />
                          <span>Caricamento biografia da TMDB...</span>
                        </div>
                      ) : detailData?.biography ? (
                        <p className={styles.showcaseBioText}>
                          {detailData.biography}
                        </p>
                      ) : (
                        <p className={styles.showcaseBioPlaceholder}>
                          Nessuna biografia aggiuntiva disponibile su TMDB in italiano.
                        </p>
                      )}
                    </div>

                    {/* Film di Maggior Successo */}
                    <div className={styles.showcaseSection}>
                      <h4 className={styles.showcaseSubTitle}>
                        <FiAward style={{ marginRight: '6px' }} /> I migliori capolavori
                      </h4>
                      {detailLoading ? (
                        <div className={styles.movieSkeletonRow}>
                          {Array.from({ length: 2 }).map((_, i) => (
                            <SkeletonMovieCard key={i} />
                          ))}
                        </div>
                      ) : topMovies.length > 0 ? (
                        <div className={styles.showcaseMovieGrid}>
                          {topMovies.map((movie) => (
                            <MovieCard
                              key={movie.id || movie.tmdb_id}
                              movie={{...movie, id: movie.tmdb_id || movie.id}}
                              hideTitle={true}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className={styles.showcaseBioPlaceholder}>
                          Nessun film trovato per questo talento nel database locale.
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className={styles.selectPrompt}>
                    <FiStar className={styles.selectPromptIcon} />
                    <h3>Seleziona un talento</h3>
                    <p>Clicca su un attore o regista a sinistra per aprire la sua scheda di osservazione ed esplorare le sue statistiche e opere migliori.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
