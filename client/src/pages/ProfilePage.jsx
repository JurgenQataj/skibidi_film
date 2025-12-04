import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./ProfilePage.module.css";
import MovieCard from "../components/MovieCard";
import UserCard from "../components/UserCard";
import Modal from "../components/Modal";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";

// 100 Pokémon: starter base e finale + migliori finali per ogni generazione
const pokemonAvatars = [
  // --- Gen 1 ---
  "001.png", "003.png", "004.png", "006.png", "007.png", "009.png", "065.png", "068.png", "094.png", "131.png", "143.png", "149.png", "150.png",
  // --- Gen 2 ---
  "152.png", "154.png", "155.png", "157.png", "158.png", "160.png", "181.png", "196.png", "197.png", "208.png", "212.png", "242.png", "248.png", "249.png", "250.png",
  // --- Gen 3 ---
  "252.png", "254.png", "255.png", "257.png", "258.png", "260.png", "282.png", "306.png", "334.png", "350.png", "373.png", "376.png", "380.png", "381.png", "384.png",
  // --- Gen 4 ---
  "387.png", "389.png", "390.png", "392.png", "393.png", "395.png", "407.png", "445.png", "448.png", "461.png", "464.png", "468.png", "472.png", "474.png", "478.png", "483.png", "484.png", "485.png", "487.png",
  // --- Gen 5 ---
  "495.png", "497.png", "498.png", "500.png", "501.png", "503.png", "530.png", "542.png", "549.png", "553.png", "576.png", "635.png", "637.png", "646.png",
  // --- Gen 6 ---
  "650.png", "652.png", "653.png", "655.png", "656.png", "658.png", "660.png", "681.png", "697.png", "715.png", "719.png", "720.png",
  // --- Gen 7 ---
  "722.png", "724.png", "725.png", "727.png", "728.png", "730.png", "745.png", "778.png", "784.png", "786.png", "787.png", "788.png",
  // --- Gen 8 ---
  "810.png", "812.png", "813.png", "815.png", "816.png", "818.png", "845.png", "849.png", "861.png", "869.png", "884.png", "887.png", "889.png", "890.png",
  // --- Gen 9 ---
  "906.png", "909.png", "912.png", "920.png", "925.png", "930.png", "937.png", "943.png", "954.png", "968.png", "977.png", "981.png", "990.png", "1010.png", "1025.png",
].map((n) => `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${n}`);

function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState({ isOpen: false, title: "", content: [] });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // MODALE MODIFICA
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editEmail, setEditEmail] = useState(""); 

  const API_URL = import.meta.env.VITE_API_URL || "";

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
      const response = await axios.get(`${API_URL}/api/users/${userId}/${type}`);
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
    setEditEmail(profile.email || ""); 
    setIsEditModalOpen(true);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const updatedProfile = await axios.put(
        `${API_URL}/api/users/profile`,
        { 
          bio: editBio, 
          avatar_url: editAvatar,
          email: editEmail 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(updatedProfile.data);
      setIsEditModalOpen(false);
      alert("Profilo aggiornato!");
    } catch (error) {
      alert(error.response?.data?.message || "Errore durante l'aggiornamento.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      "Questa azione è irreversibile. Per confermare, scrivi il tuo username:"
    );
    if (confirmation === profile.username) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Account eliminato con successo.");
        logout();
        navigate("/login");
      } catch (error) {
        alert("Errore durante l'eliminazione dell'account.");
      }
    } else if (confirmation !== null) {
      alert("Username non corretto. Eliminazione annullata.");
    }
  };

  if (loading) return <p style={{ color: "white", textAlign: "center" }}>Caricamento...</p>;
  if (!profile || !stats) return <p style={{ color: "white", textAlign: "center" }}>Utente non trovato.</p>;

  const isOwnProfile = loggedInUserId === profile._id;
  const recentReviews = reviews.slice(0, 24);

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
                onNavigate={() => setModalData({ isOpen: false, title: "", content: [] })}
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
          <label className={styles.editLabel}>Email (per recupero password)</label>
          <input 
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            style={{
              width: '100%', 
              padding: '8px', 
              marginBottom: '15px', 
              borderRadius: '4px', 
              border: '1px solid #333', 
              backgroundColor: '#222', 
              color: 'white'
            }}
            placeholder="Inserisci la tua email"
          />

          <label className={styles.editLabel}>La tua Biografia</label>
          <textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            className={styles.bioTextarea}
            maxLength="150"
          />
          <label className={styles.editLabel}>Scegli un Avatar Pokémon (HQ)</label>
          <div className={styles.avatarGrid}>
            {pokemonAvatars.map((url) => (
              <img
                key={url}
                src={url}
                alt="avatar Pokémon"
                className={`${styles.avatarOption} ${editAvatar === url ? styles.selected : ""}`}
                onClick={() => setEditAvatar(url)}
              />
            ))}
          </div>
          <button type="submit" className={styles.saveButton}>Salva Modifiche</button>
        </form>
        <hr className={styles.divider} />
        <div className={styles.dangerZone}>
          <h3 className={styles.dangerTitle}>Zona Pericolo</h3>
          <button onClick={handleDeleteAccount} className={styles.deleteAccountButton}>
            Elimina Account
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Cronologia Completa di ${profile.username}`}
      >
        <ol className={styles.historyList}>
          {reviews.map((review, index) => (
            <li key={review._id} className={styles.historyItem}>
              <span className={styles.historyNumber}>{index + 1}</span>
              <img
                src={review.movie.poster_path ? `https://image.tmdb.org/t/p/w92${review.movie.poster_path}` : "https://placehold.co/92x138?text=No+Img"}
                alt={`Poster di ${review.movie.title}`}
                className={styles.historyPoster}
              />
              <div className={styles.historyInfo}>
                <span className={styles.historyTitle}>{review.movie.title}</span>
              </div>
              <span className={styles.historyRating}>{review.rating}/10</span>
            </li>
          ))}
        </ol>
      </Modal>

      <div className={styles.pageContainer}>
        <header className={styles.profileHeader}>
          <img
            src={profile.avatar_url || "https://assets.pokemon.com/assets/cms2/img/pokedex/full/151.png"}
            alt="Avatar"
            className={styles.avatar}
          />
          <div className={styles.profileInfo}>
            <h1 className={styles.username}>{profile.username}</h1>
            <p className={styles.bio}>{profile.bio || "Questo utente non ha ancora una biografia."}</p>
            <div className={styles.statsContainer}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.moviesReviewed}</div>
                <div className={styles.statLabel}>Film Recensiti</div>
              </div>
              <div className={styles.statItemClickable} onClick={() => showModalWith("followers")}>
                <div className={styles.statValue}>{stats.followersCount}</div>
                <div className={styles.statLabel}>Follower</div>
              </div>
              <div className={styles.statItemClickable} onClick={() => showModalWith("following")}>
                <div className={styles.statValue}>{stats.followingCount}</div>
                <div className={styles.statLabel}>Seguiti</div>
              </div>
              {/* NUOVO TASTO STATS */}
              <div 
                className={styles.statItemClickable} 
                onClick={() => navigate(`/profile/${userId}/stats`)}
                style={{ cursor: "pointer", marginLeft: "10px" }}
              >
                <div className={styles.statValue}>📊</div>
                <div className={styles.statLabel}>Stats</div>
              </div>
            </div>
            {loggedInUserId && (
              isOwnProfile ? (
                <button onClick={handleOpenEditModal} className={styles.editButton}>Modifica Profilo</button>
              ) : (
                <button onClick={handleFollowToggle} className={styles.followButton}>
                  {isFollowing ? "Segui già" : "Segui"}
                </button>
              )
            )}
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
              <button onClick={() => setIsHistoryModalOpen(true)} className={styles.showAllButton}>
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