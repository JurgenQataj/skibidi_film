import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import styles from "./ProfilePage.module.css";
import MovieCard from "../components/MovieCard";
import UserCard from "../components/UserCard";
import Modal from "../components/Modal";
import { jwtDecode } from "jwt-decode";
import useAuthStore from "../store/useAuthStore";

import { FaChartBar, FaListUl, FaChevronDown, FaChevronUp, FaSignOutAlt } from "react-icons/fa";
import { FiMenu, FiSettings, FiTarget, FiBookmark, FiChevronRight } from "react-icons/fi";
import { SkeletonMovieCard, SkeletonUserCard, SkeletonListCard, SkeletonWithLogo } from "../components/Skeleton";

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

function useProfileActions({
  profile, setProfile, userId, isFollowing, setIsFollowing,
  setStats, setModalData, setEditBio, setEditAvatar,
  setEditEmail, setEditUsername, setIsEditModalOpen,
  logout, navigate, API_URL
}) {
  const handleFollowToggle = async () => {
    const token = localStorage.getItem("token");
    const endpoint = isFollowing ? "unfollow" : "follow";
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const url = `${API_URL}/api/users/${userId}/${endpoint}`;
    try {
      if (isFollowing) {
        await axios.delete(url, config);
      } else {
        await axios.post(url, {}, config);
      }
      setIsFollowing((prev) => !prev);
      setStats((prevStats) => ({
        ...prevStats,
        followersCount: prevStats.followersCount + (isFollowing ? -1 : 1),
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
    setEditUsername(profile.username || "");
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
          email: editEmail,
          username: editUsername
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

  return {
    handleFollowToggle,
    showModalWith,
    handleOpenEditModal,
    handleProfileUpdate,
    handleDeleteAccount
  };
}

function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState({ isOpen: false, title: "", content: [] });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTvHistoryModalOpen, setIsTvHistoryModalOpen] = useState(false);
  const [isListsModalOpen, setIsListsModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Chiudi menu se si clicca fuori (semplificato con onClick sul container principale)
  const closeSettingsMenu = () => setIsSettingsMenuOpen(false);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // MODALE MODIFICA
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [showEditAvatars, setShowEditAvatars] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      window.scrollTo(0, 0);
      try {
        const token = localStorage.getItem("token");
        const currentUserId = token ? jwtDecode(token).user.id : null;
        setLoggedInUserId(currentUserId);

        const cacheBuster = `_t=${Date.now()}`;
        const [profileRes, statsRes, reviewsRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/${userId}/profile?${cacheBuster}`),
          axios.get(`${API_URL}/api/users/${userId}/stats`),
          axios.get(`${API_URL}/api/users/${userId}/reviews`),
        ]);

        setProfile(profileRes.data);
        setStats(statsRes.data);
        setReviews(reviewsRes.data || []);

        // Carica le liste pubbliche dell'utente
        try {
          const listsRes = await axios.get(`${API_URL}/api/users/${userId}/lists`);
          setLists(listsRes.data || []);
        } catch { setLists([]); }

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
  }, [userId, API_URL, location.key]);

  const {
    handleFollowToggle,
    showModalWith,
    handleOpenEditModal,
    handleProfileUpdate,
    handleDeleteAccount
  } = useProfileActions({
    profile, setProfile, userId, isFollowing, setIsFollowing,
    setStats, setModalData, setEditBio, setEditAvatar,
    setEditEmail, setEditUsername, setIsEditModalOpen,
    logout, navigate, API_URL
  });

  const handleNavToSettings = () => { setIsSettingsMenuOpen(false); navigate('/settings'); };
  const handleNavToGoals   = () => { setIsSettingsMenuOpen(false); navigate(`/profile/${userId}/goals`); };
  const handleNavToSaved   = () => { setIsSettingsMenuOpen(false); };
  const handleLogout       = () => { logout(); navigate("/login"); };
  const handleListsClick   = () => isOwnProfile ? navigate("/my-lists") : setIsListsModalOpen(true);
  const makeStatKeyDown    = (fn) => (e) => { if (e.key === 'Enter') fn(); };

  if (loading) return <SkeletonWithLogo />;
  if (!profile || !stats) return <p style={{ color: "white", textAlign: "center" }}>Utente non trovato.</p>;

  const isOwnProfile = loggedInUserId === profile._id;
  const recentReviews = reviews.slice(0, 60);

  // Split reviews
  const movieReviews = reviews.filter(r => r.movie && r.movie.media_type !== "tv");
  const tvReviews = reviews.filter(r => r.movie && r.movie.media_type === "tv");

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
        <form onSubmit={handleProfileUpdate} className={styles.editForm}>
          <label className={styles.editLabel}>Username</label>
          <input
            type="text"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
            maxLength={10}
            className={styles.editInput}
            placeholder="Max 10 caratteri"
          />

          <label className={styles.editLabel}>Email (per recupero password)</label>
          <input 
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            className={styles.editInput}
            placeholder="Inserisci la tua email"
          />

          <label className={styles.editLabel}>La tua Biografia</label>
          <textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            className={styles.bioTextarea}
            maxLength="150"
          />

          <button type="submit" className={styles.saveButton}>Salva Modifiche</button>
          
          <div className={styles.avatarToggleContainer}>
            <button 
              type="button" 
              className={styles.avatarToggleBtn}
              onClick={() => setShowEditAvatars(!showEditAvatars)}
            >
              <span>Scegli un Avatar Pokémon (HQ)</span>
              {showEditAvatars ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {showEditAvatars && (
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
            )}
          </div>
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
        title={`Cronologia Film di ${profile.username}`}
      >
        <ol className={styles.historyList}>
          {movieReviews.map((review, index) => (
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
              </div>
              <span className={styles.historyRating}>{review.rating}/10</span>
            </li>
          ))}
        </ol>
      </Modal>

      <Modal
        isOpen={isTvHistoryModalOpen}
        onClose={() => setIsTvHistoryModalOpen(false)}
        title={`Cronologia Serie TV di ${profile.username}`}
      >
        <ol className={styles.historyList}>
          {tvReviews.map((review, index) => (
            <li 
              key={review._id} 
              className={styles.historyItem}
              onClick={() => navigate(`/tv/${review.movie.tmdb_id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/tv/${review.movie.tmdb_id}`); }}
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
                <span className={styles.historyTitle}>{review.movie.name || review.movie.title}</span>
              </div>
              <span className={styles.historyRating}>{review.rating}/10</span>
            </li>
          ))}
        </ol>
      </Modal>

      {/* Modal Liste */}
      <Modal
        isOpen={isListsModalOpen}
        onClose={() => setIsListsModalOpen(false)}
        title={isOwnProfile ? "Le mie Liste" : `Liste di ${profile.username}`}
      >
        <div className={styles.userList}>
          {lists.filter((l) => l._id !== "watchlist" && l.id !== "watchlist").length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Nessuna lista creata.</p>
          ) : (
            lists
              .filter((l) => l._id !== "watchlist" && l.id !== "watchlist")
              .map((list) => (
                <Link
                  key={list._id}
                  to={`/list/${list._id}`}
                  className={styles.listCard}
                  onClick={() => setIsListsModalOpen(false)}
                >
                  <span className={styles.listCardIcon}>🎬</span>
                  <div>
                    <div className={styles.listCardTitle}>{list.title}</div>
                    {list.description && (
                      <div className={styles.listCardDesc}>{list.description}</div>
                    )}
                  </div>
                </Link>
              ))
          )}
        </div>
      </Modal>

      <div className={styles.profileWrapper} onClick={closeSettingsMenu} role="presentation" onKeyDown={(e) => { if (e.key === 'Escape') closeSettingsMenu(); }}>
        <div className={styles.pageContainer}>
        {/* ── Header stile Instagram ── */}
        <header className={styles.profileHeader}>
          {isOwnProfile && (
            <div className={styles.profileSettingsContainer}>
              <button 
                className={styles.profileSettingsBtn} 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsMenuOpen(!isSettingsMenuOpen);
                }}
                aria-label="Opzioni Profilo"
              >
                <FiMenu />
              </button>
              
              {isSettingsMenuOpen && (
                <div className={styles.settingsDropdownMenu}>
                  <button onClick={handleNavToSettings} className={styles.dropdownMenuItem}>
                    <FiSettings className={styles.menuIcon} />
                    <span className={styles.menuText}>Impostazioni</span>
                    <FiChevronRight className={styles.menuChevron} />
                  </button>
                  <button onClick={handleNavToGoals} className={styles.dropdownMenuItem}>
                    <FiTarget className={styles.menuIcon} />
                    <span className={styles.menuText}>Obiettivi</span>
                    <FiChevronRight className={styles.menuChevron} />
                  </button>
                  <button onClick={handleNavToSaved} className={styles.dropdownMenuItem}>
                    <FiBookmark className={styles.menuIcon} />
                    <span className={styles.menuText}>Salvati</span>
                    <FiChevronRight className={styles.menuChevron} />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className={styles.instaTopSection}>
            <img
              src={profile.avatar_url || "https://assets.pokemon.com/assets/cms2/img/pokedex/full/151.png"}
              alt="Avatar"
              className={styles.avatar}
            />
            <div className={styles.rightInfoContainer}>
              <h1 className={styles.username}>{profile.username}</h1>
              <div className={styles.statsContainer}>
                <div className={styles.statItemClickable} onClick={() => setIsHistoryModalOpen(true)} onKeyDown={makeStatKeyDown(() => setIsHistoryModalOpen(true))} tabIndex={0} role="button">
                  <div className={styles.statValue}>{stats.moviesReviewed}</div>
                  <div className={styles.statLabel}>Film</div>
                </div>
                <div className={styles.statItemClickable} onClick={() => setIsTvHistoryModalOpen(true)} onKeyDown={makeStatKeyDown(() => setIsTvHistoryModalOpen(true))} tabIndex={0} role="button">
                  <div className={styles.statValue}>{stats.tvShowsReviewed || 0}</div>
                  <div className={styles.statLabel}>Serie TV</div>
                </div>
                <div className={styles.statItemClickable} onClick={() => showModalWith("followers")} onKeyDown={makeStatKeyDown(() => showModalWith("followers"))} tabIndex={0} role="button">
                  <div className={styles.statValue}>{stats.followersCount}</div>
                  <div className={styles.statLabel}>Follower</div>
                </div>
                <div className={styles.statItemClickable} onClick={() => showModalWith("following")} onKeyDown={makeStatKeyDown(() => showModalWith("following"))} tabIndex={0} role="button">
                  <div className={styles.statValue}>{stats.followingCount}</div>
                  <div className={styles.statLabel}>Seguiti</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.bioAndActions}>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
            <div className={styles.actionsRow}>
              {loggedInUserId && (
                isOwnProfile ? (
                  <button onClick={handleOpenEditModal} className={styles.editButton}>Modifica Profilo</button>
                ) : (
                  <button onClick={handleFollowToggle} className={styles.followButton}>
                    {isFollowing ? "Segui già" : "Segui"}
                  </button>
                )
              )}
              <div className={styles.iconBtn} onClick={() => navigate(`/profile/${userId}/stats`)} onKeyDown={makeStatKeyDown(() => navigate(`/profile/${userId}/stats`))} tabIndex={0} role="button" title="Stats">
                <FaChartBar />
              </div>
              <div className={styles.iconBtn} onClick={handleListsClick} onKeyDown={makeStatKeyDown(handleListsClick)} tabIndex={0} role="button" title="Liste">
                <FaListUl />
              </div>
              {isOwnProfile && (
                <div
                  className={styles.iconBtn}
                  onClick={handleLogout}
                  onKeyDown={makeStatKeyDown(handleLogout)}
                  tabIndex={0} role="button"
                  title="Logout"
                  style={{ color: '#e50914' }}
                >
                  <FaSignOutAlt />
                </div>
              )}
            </div>
          </div>
        </header>

        <section>
          {profile.completedCollections && profile.completedCollections.length > 0 && (
            <div className={styles.badgesWrapper}>
              <div className={styles.badgesHeader}>
                <h2 className={styles.sectionTitle} style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  Saghe Completate ({profile.completedCollections.length})
                </h2>
                {profile.completedCollections.length > (isMobile ? 7 : 10) && (
                  <button 
                    onClick={() => setShowAllBadges(!showAllBadges)} 
                    className={styles.badgeToggleBtn}
                    title={showAllBadges ? "Mostra meno" : "Mostra tutte"}
                  >
                    {showAllBadges ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                )}
              </div>
              <div className={styles.badgesGrid}>
                {(showAllBadges ? profile.completedCollections : profile.completedCollections.slice(0, isMobile ? 7 : 10)).map(coll => (
                  <Link key={coll.id} to={`/collection/${coll.id}`} className={styles.badgeCard}>
                    <img src={coll.poster_path ? `https://image.tmdb.org/t/p/w200${coll.poster_path}` : "https://placehold.co/300x450/1a1a2e/666?text=No+Image"} alt={coll.name} />
                    <div className={styles.badgeName}>{coll.name}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <h2 className={styles.sectionTitle} style={{ marginTop: '20px' }}>Ultime Recensioni</h2>
          <div className={styles.reviewsGrid}>
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <SkeletonMovieCard key={i} />
              ))
            ) : recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <MovieCard key={review._id} movie={{...review.movie, media_type: review.movie.media_type || "movie"}} hideTitle={true} />
              ))
            ) : (
              <p>Questo utente non ha ancora recensito nessun film.</p>
            )}
          </div>
          {movieReviews.length > 0 && (
            <div className={styles.showAllContainer} style={{ marginBottom: "10px" }}>
              <button 
                onClick={() => setIsHistoryModalOpen(true)} 
                className={styles.showAllButton}
              >
                Cronologia Film ({movieReviews.length})
              </button>
            </div>
          )}
          {tvReviews.length > 0 && (
            <div className={styles.showAllContainer}>
              <button 
                onClick={() => setIsTvHistoryModalOpen(true)} 
                className={styles.showAllButton}
              >
                Cronologia Serie TV ({tvReviews.length})
              </button>
            </div>
          )}
        </section>
      </div>
      </div>
    </>
  );
}

export default ProfilePage;