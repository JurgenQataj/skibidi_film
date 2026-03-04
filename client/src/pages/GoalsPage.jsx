import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import styles from "./GoalsPage.module.css";
import { FiTarget, FiPlus, FiArrowLeft, FiTrash2 } from "react-icons/fi";

function GoalsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingGoal, setViewingGoal] = useState(null); 
  const [newGoalValue, setNewGoalValue] = useState(100);
  
  const defaultYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [error, setError] = useState("");

  let loggedInUserId = null;
  if (token) {
    try {
      const decoded = jwtDecode(token);
      loggedInUserId = decoded.user?.id || decoded.id; 
    } catch (err) {
      console.error("Token non valido", err);
    }
  }

  const isOwnProfile = loggedInUserId === userId;
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    fetchGoals();
  }, [userId]);

  const fetchGoals = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users/${userId}/goals`);
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Errore nel caricamento degli obiettivi:", err);
    } finally {
      setLoading(false);
    }
  };

  const safeGoals = Array.isArray(goals) ? goals : [];

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (newGoalValue < 1) {
      setError("Il target deve essere maggiore di 0");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/users/goals`,
        { targetFrequency: Number(newGoalValue), year: selectedYear },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsModalOpen(false);
      setNewGoalValue(100);
      setSelectedYear(defaultYear);
      setError("");
      fetchGoals(); // Ricarica
    } catch (err) {
      setError(err.response?.data?.message || "Errore durante la creazione.");
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Vuoi davvero eliminare questo obiettivo?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/users/goals/${goalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <FiArrowLeft />
        </button>
        <h1 className={styles.title}>Obiettivi</h1>
        {isOwnProfile ? (
          <button onClick={() => setIsModalOpen(true)} className={styles.addGoalBtn}>
            <FiPlus />
          </button>
        ) : (
          <div style={{ width: 40 }} /> /* Spacer per centrare il titolo */
        )}
      </header>

      <main className={styles.content}>
        {loading ? (
          <div className={styles.loader}></div>
        ) : safeGoals.length === 0 ? (
          <div className={styles.emptyState}>
            <FiTarget className={styles.emptyIcon} />
            <p>Nessun obiettivo impostato.</p>
            {isOwnProfile && (
              <button onClick={() => setIsModalOpen(true)} className={styles.createFirstBtn}>
                Crea il tuo primo Obiettivo
              </button>
            )}
          </div>
        ) : (
          <div className={styles.goalsList}>
            {safeGoals.map(goal => {
              const progress = Math.min((goal.currentCount / goal.targetFrequency) * 100, 100).toFixed(1);
              const isCompleted = goal.currentCount >= goal.targetFrequency;

              return (
                <div 
                  key={goal._id} 
                  className={styles.goalCard} 
                  onClick={() => setViewingGoal(goal)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewingGoal(goal); }}
                  tabIndex={0}
                  role="button"
                >
                  <div className={styles.goalHeader}>
                    <div>
                      <h2 className={styles.goalTitle}>{goal.title} {goal.year}</h2>
                      <p className={styles.goalSubtitle}>
                        {goal.currentCount} di {goal.targetFrequency} film visti
                      </p>
                    </div>
                    {isOwnProfile && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal._id); }} 
                        className={styles.deleteBtn}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>

                  <div className={styles.progressContainer}>
                    <div className={styles.progressBarBg}>
                      <div 
                        className={`${styles.progressBarFill} ${isCompleted ? styles.completed : ""}`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className={styles.progressText}>{progress}%</span>
                  </div>
                  
                  {isCompleted && <p className={styles.completedMessage}>🎉 Obiettivo raggiunto! Complimenti!</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODALE CREAZIONE */}
      {isModalOpen && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => setIsModalOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(false); }}
          tabIndex={0}
          role="button"
        >
          <div 
            className={styles.modalContent} 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
            tabIndex={0}
            role="dialog"
          >
            <h2>Imposta l'Obiettivo</h2>
            <p className={styles.modalDesc}>Scegli un anno e quanti film vuoi guardare.</p>
            
            <form onSubmit={handleCreateGoal} className={styles.modalForm}>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className={styles.goalSelect}
              >
                {[defaultYear, defaultYear + 1, defaultYear + 2].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <input 
                type="number" 
                value={newGoalValue} 
                onChange={(e) => setNewGoalValue(e.target.value)}
                min="1"
                className={styles.goalInput}
              />
              {error && <p className={styles.errorText}>{error}</p>}
              
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  Annulla
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  Salva Obiettivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE VISUALIZZAZIONE FILM VISTI */}
      {viewingGoal && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => setViewingGoal(null)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewingGoal(null); }}
          tabIndex={0}
          role="button"
        >
          <div 
            className={styles.largeModalContent} 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
            tabIndex={0}
            role="dialog"
          >
            <header className={styles.largeModalHeader}>
              <div>
                <h2>{viewingGoal.title} {viewingGoal.year}</h2>
                <p className={styles.modalDesc}>
                  Hai visto {viewingGoal.watchedMovies?.length || 0} film quest'anno.
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setViewingGoal(null)}>X</button>
            </header>

            {viewingGoal.watchedMovies && viewingGoal.watchedMovies.length > 0 ? (
              <div className={styles.moviesGrid}>
                {viewingGoal.watchedMovies.map((movie, index) => (
                  <MovieCard 
                    key={index} 
                    movie={{
                      tmdb_id: movie.movieId,
                      title: movie.title,
                      poster_path: movie.poster_path, // Fallback gestito in MovieCard
                      vote_average: movie.rating,
                      media_type: "movie" // Forziamo a movie per default, come in ProfilePage (se non è noto)
                    }} 
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>Nessun film recensito per questo obiettivo.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalsPage;
