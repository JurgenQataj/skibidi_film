import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./ProfilePage.module.css";
import MovieCard from "../components/MovieCard";
import UserCard from "../components/UserCard";
import Modal from "../components/Modal";
import { jwtDecode } from "jwt-decode";

function ProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState({
    isOpen: false,
    title: "",
    content: [],
  });
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      window.scrollTo(0, 0);
      try {
        const token = localStorage.getItem("token");
        const currentUserId = token ? jwtDecode(token).user.id : null;
        setLoggedInUserId(currentUserId);

        const [profileRes, statsRes, reviewsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/users/${userId}/profile`),
          axios.get(`http://localhost:5000/api/users/${userId}/stats`),
          axios.get(`http://localhost:5000/api/users/${userId}/reviews`),
        ]);

        setProfile(profileRes.data);
        setStats(statsRes.data);
        setReviews(reviewsRes.data || []);

        if (currentUserId && currentUserId !== Number(userId)) {
          const followStatusRes = await axios.get(
            `http://localhost:5000/api/users/${userId}/follow-status`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setIsFollowing(followStatusRes.data.isFollowing);
        } else {
          setIsFollowing(false);
        }
      } catch (error) {
        console.error("Errore caricamento profilo:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleFollowToggle = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (isFollowing) {
        await axios.delete(
          `http://localhost:5000/api/users/${userId}/unfollow`,
          config
        );
      } else {
        await axios.post(
          `http://localhost:5000/api/users/${userId}/follow`,
          {},
          config
        );
      }
      setIsFollowing(!isFollowing);
      setStats((prev) => ({
        ...prev,
        followersCount: isFollowing
          ? prev.followersCount - 1
          : prev.followersCount + 1,
      }));
    } catch (error) {
      console.error("Errore nel follow/unfollow:", error);
    }
  };

  const showModalWith = async (type) => {
    const url =
      type === "followers"
        ? `http://localhost:5000/api/users/${userId}/followers`
        : `http://localhost:5000/api/users/${userId}/following`;
    const title = type === "followers" ? "Follower" : "Seguiti";
    try {
      const token = localStorage.getItem("token");
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const response = await axios.get(url, config);
      setModalData({ isOpen: true, title, content: response.data || [] });
    } catch (error) {
      console.error("Errore nel caricare la lista utenti:", error);
    }
  };

  if (loading)
    return (
      <p
        style={{
          color: "white",
          textAlign: "center",
          fontSize: "2rem",
          paddingTop: "50px",
        }}
      >
        Caricamento...
      </p>
    );
  if (!profile || !stats)
    return (
      <p style={{ color: "white", textAlign: "center" }}>
        Utente non trovato o errore nel caricamento.
      </p>
    );

  const isOwnProfile = loggedInUserId === Number(userId);
  const recentReviews = [...reviews].reverse().slice(0, 24);

  return (
    <>
      <Modal
        isOpen={modalData.isOpen}
        onClose={() => setModalData({ isOpen: false })}
        title={modalData.title}
      >
        <div className={styles.userList}>
          {modalData.content && modalData.content.length > 0 ? (
            modalData.content.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onNavigate={() => setModalData({ isOpen: false })}
              />
            ))
          ) : (
            <p>Nessun utente da mostrare.</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Cronologia Completa di ${profile.username}`}
      >
        <ol className={styles.historyList}>
          {reviews.map((review, index) => (
            <li key={review.tmdb_id + index} className={styles.historyItem}>
              <img
                src={`https://image.tmdb.org/t/p/w92${review.poster_path}`}
                alt=""
                className={styles.historyPoster}
              />
              <div className={styles.historyInfo}>
                <span className={styles.historyTitle}>{review.title}</span>
              </div>
              <span className={styles.historyRating}>{review.rating}/10</span>
            </li>
          ))}
        </ol>
      </Modal>

      <div className={styles.pageContainer}>
        <header className={styles.profileHeader}>
          <img
            src={
              profile.avatar_url ||
              "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png"
            }
            alt="Avatar"
            className={styles.avatar}
          />
          <div className={styles.profileInfo}>
            <h1 className={styles.username}>{profile.username}</h1>
            <p className={styles.bio}>
              {profile.bio || "Questo utente non ha ancora una biografia."}
            </p>
            <div className={styles.statsContainer}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.moviesReviewed}</div>
                <div className={styles.statLabel}>Film Recensiti</div>
              </div>
              <div
                className={styles.statItemClickable}
                onClick={() => showModalWith("followers")}
              >
                <div className={styles.statValue}>{stats.followersCount}</div>
                <div className={styles.statLabel}>Follower</div>
              </div>
              <div
                className={styles.statItemClickable}
                onClick={() => showModalWith("following")}
              >
                <div className={styles.statValue}>{stats.followingCount}</div>
                <div className={styles.statLabel}>Seguiti</div>
              </div>
            </div>
            {loggedInUserId &&
              (isOwnProfile ? (
                <button className={styles.editButton}>Modifica Profilo</button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  className={styles.followButton}
                >
                  {isFollowing ? "Segui già" : "Segui"}
                </button>
              ))}
          </div>
        </header>

        <section>
          <h2 className={styles.sectionTitle}>Ultime Recensioni</h2>
          <div className={styles.reviewsGrid}>
            {recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <MovieCard key={review.tmdb_id} movie={review} />
              ))
            ) : (
              <p>Questo utente non ha ancora recensito nessun film.</p>
            )}
          </div>
          {reviews.length > 24 && (
            <div className={styles.showAllContainer}>
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className={styles.showAllButton}
              >
                Mostra Tutta la Cronologia ({reviews.length} film)
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default ProfilePage;
