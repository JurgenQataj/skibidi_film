import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";
import {
  FaHome,
  FaSearch,
  FaUser,
  FaGlobe,
  FaBell,
  FaPlayCircle,
  FaGamepad,
} from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

function Navbar() {
  const [notifications, setNotifications] = useState([]);

  const token = localStorage.getItem("token");
  let userId = null;

  if (token) {
    try {
      userId = jwtDecode(token).user.id;
    } catch (error) {
      console.error("Token non valido:", error);
      localStorage.removeItem("token");
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const response = await axios.get(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(response.data);
      } catch (error) {
        console.error("Errore caricamento notifiche:", error);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleBellClick = async () => {
    if (unreadCount > 0) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const response = await axios.put(
          `${API_URL}/api/notifications/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setNotifications(response.data);
      } catch (error) {
        console.error("Errore nel segnare le notifiche come lette:", error);
      }
    }
  };

  const timeAgo = (date) => {
    if (!date) return "";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it });
  };

  const getNotificationLink = (notification) => {
    if (!notification || !notification.sender) return "/";
    switch (notification.type) {
      case "new_follower": return `/profile/${notification.sender._id}`;
      case "new_reaction":
      case "new_comment":
      case "thread_comment":
      case "comment_mention":
        if (notification.targetReview?.movie?.tmdb_id) {
          return `/${notification.targetReview.movie.media_type === "tv" ? "tv" : "movie"}/${notification.targetReview.movie.tmdb_id}`;
        }
        return "/";
      case "chat_mention":
        return "/discover";
      default: return "/";
    }
  };


  const getNotificationText = (notification) => {
    if (!notification || !notification.sender) return "Nuova notifica";
    switch (notification.type) {
      case "new_follower":
        return <span><strong>{notification.sender.username}</strong> ha iniziato a seguirti</span>;
      case "new_reaction":
        return <span><strong>{notification.sender.username}</strong> ha messo like alla tua recensione</span>;
      case "new_comment":
        return <span><strong>{notification.sender.username}</strong> ha commentato la tua recensione</span>;
      case "thread_comment":
        return <span><strong>{notification.sender.username}</strong> ha commentato un post che hai commentato</span>;
      case "comment_mention":
        return <span><strong>{notification.sender.username}</strong> ti ha menzionato in un commento</span>;
      case "chat_mention":
        return <span><strong>{notification.sender.username}</strong> ti ha menzionato nella chat globale</span>;
      default:
        return <span>Nuova notifica da {notification.sender.username}</span>;
    }
  };

  return (
    <>
      {/* Mobile Topbar con Logo (visibile solo su mobile) */}
      <div className={styles.mobileTopbar}>
        <Link to="/" className={styles.mobileLogo}>
          <img src="/icona3.png" alt="logo" className={styles.logoImg} />
          Skibidi Film
        </Link>
      </div>

      <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link to="/" className={styles.logo}>
          <img src="/icona3.png" alt="logo" className={styles.logoImg} />
          Skibidi Film
        </Link>
        <div className={styles.navLinks}>
          <Link to="/" className={styles.navLink}>
            <FaHome /> <span>Feed</span>
          </Link>
          <Link to="/search" className={styles.navLink}>
            <FaSearch /> <span>Cerca</span>
          </Link>
          <Link to="/discover" className={styles.navLink}>
            <FaGlobe /> <span>Scopri</span>
          </Link>
          <Link to="/horizon" className={styles.navLink}>
            <FaPlayCircle /> <span>Horizon</span>
          </Link>
          <Link to="/rating-game" className={styles.navLink}>
            <FaGamepad /> <span>Rating Game</span>
          </Link>

          {userId && (
            <>
              <div className={`${styles.notificationContainer} ${styles.mobileHideNotif}`}>
                <Link to="/notifications" onClick={handleBellClick} className={styles.navLink}>
                  <FaBell /> <span>Notifiche</span>
                  {unreadCount > 0 && (
                    <span className={`${styles.notificationBadge} ${styles.notificationBadgePulse}`}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </div>
              <Link to={`/profile/${userId}`} className={styles.navLink}>
                <FaUser /> <span>Profilo</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}

export default Navbar;
