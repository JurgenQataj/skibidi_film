import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./ProfilePage.module.css";
import MovieCard from "../components/MovieCard";
import UserCard from "../components/UserCard";
import Modal from "../components/Modal";
import { jwtDecode } from "jwt-decode";

const avatars = [
  "1.png",
  "4.png",
  "7.png",
  "25.png",
  "39.png",
  "52.png",
  "54.png",
  "6.png",
  "94.png",
  "99.png",
  "130.png",
  "131.png",
  "143.png",
  "149.png",
  "150.png",
];
const avatarBaseUrl =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";

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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      window.scrollTo(0, 0);
      try {
        const token = localStorage.getItem("token");
        const currentUserId = token ? jwtDecode(token).user.id : null;
        setLoggedInUserId(currentUserId);

        const [profileRes, statsRes, reviewsRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/${userId}/profile`),
          axios.get(`${API_URL}/api/users/${userId}/stats`),
          axios.get(`${API_URL}/api/users/${userId}/reviews`),
        ]);

        setProfile(profileRes.data);
        setStats(statsRes.data);
        setReviews(reviewsRes.data || []);

        if (currentUserId && currentUserId !== userId) {
          const followStatusRes = await axios.get(
            `${API_URL}/api/users/${userId}/follow-status`,
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
  }, [userId, API_URL]);

  const handleFollowToggle = async () => {
    const token = localStorage.getItem("token");
    const endpoint = isFollowing ? "unfollow" : "follow";
    const method = isFollowing ? "delete" : "post";
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const url = `${API_URL}/api/users/${userId}/${endpoint}`;

      if (method === "post") {
        await axios.post(url, {}, config);
      } else {
        await axios.delete(url, config);
      }

      setIsFollowing(!isFollowing);
      setStats((prevStats) => ({
        ...prevStats,
        followersCount: isFollowing
          ? prevStats.followersCount - 1
          : prevStats.followersCount + 1,
      }));
    } catch (error) {
      alert(`Errore durante l'operazione di ${endpoint}`);
    }
  };

  const showModalWith = async (type) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/users/${userId}/${type}`
      );
      setModalData({
        isOpen: true,
        title: type === "followers" ? "Follower" : "Seguiti",
        content: response.data,
      });
    } catch (error) {
      alert(`Errore nel caricamento di ${type}`);
    }
  };

  const handleOpenEditModal = () => {
    setEditBio(profile.bio || "");
    setEditAvatar(profile.avatar_url || "");
    setIsEditModalOpen(true);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const updatedProfile = await axios.put(
        `${API_URL}/api/users/profile`,
        { bio: editBio, avatar_url: editAvatar },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(updatedProfile.data);
      setIsEditModalOpen(false);
    } catch (error) {
      alert("Errore durante l'aggiornamento del profilo.");
    }
  };

  if (loading)
    return (
      <p style={{ color: "white", textAlign: "center" }}>Caricamento...</p>
    );
  if (!profile || !stats)
    return (
      <p style={{ color: "white", textAlign: "center" }}>Utente non trovato.</p>
    );

  const isOwnProfile = loggedInUserId === profile._id;
  const recentReviews = [...reviews].reverse().slice(0, 24);

  return (
    <>
      <Modal
        isOpen={modalData.isOpen}
        onClose={() => setModalData({ isOpen: false, title: "", content: [] })}
        title={modalData.title}
      >
        <div className={styles.userList}>
          {modalData.content &&
            modalData.content.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                onNavigate={() =>
                  setModalData({ isOpen: false, title: "", content: [] })
                }
              />
            ))}
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifica Profilo"
      >
        <form onSubmit={handleProfileUpdate}>
          <label className={styles.editLabel}>La tua Biografia</label>
          <textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            className={styles.bioTextarea}
            maxLength="150"
          />
          <label className={styles.editLabel}>Scegli un Avatar</label>
          <div className={styles.avatarGrid}>
            {avatars.map((avatarFile) => (
              <img
                key={avatarFile}
                src={`${avatarBaseUrl}${avatarFile}`}
                alt="avatar"
                className={`${styles.avatarOption} ${
                  editAvatar === `${avatarBaseUrl}${avatarFile}`
                    ? styles.selected
                    : ""
                }`}
                onClick={() => setEditAvatar(`${avatarBaseUrl}${avatarFile}`)}
              />
            ))}
          </div>
          <button type="submit" className={styles.saveButton}>
            Salva Modifiche
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Cronologia Completa di ${profile.username}`}
      >
        <ol className={styles.historyList}>
          {reviews.map((review) => (
            <li key={review._id} className={styles.historyItem}>
              <img
                src={`https://image.tmdb.org/t/p/w92${review.movie.poster_path}`}
                alt={`Poster di ${review.movie.title}`}
                className={styles.historyPoster}
              />
              <div className={styles.historyInfo}>
                <span className={styles.historyTitle}>
                  {review.movie.title}
                </span>
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
                <button
                  onClick={handleOpenEditModal}
                  className={styles.editButton}
                >
                  Modifica Profilo
                </button>
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
                <MovieCard key={review._id} movie={review.movie} />
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
