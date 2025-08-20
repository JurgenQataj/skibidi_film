import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";
import {
  FaHome,
  FaSearch,
  FaUser,
  FaListUl,
  FaGlobe,
  FaBell,
} from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

function Navbar() {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
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
    const interval = setInterval(fetchNotifications, 60000); // Aggiorna ogni minuto
    return () => clearInterval(interval);
  }, [token]);

  const handleBellClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        // *** MODIFICA: Salva la risposta del server ***
        const response = await axios.put(
          `${API_URL}/api/notifications/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // *** MODIFICA: Aggiorna lo stato con i dati dalla risposta ***
        setNotifications(response.data);
      } catch (error) {
        console.error("Errore nel segnare le notifiche come lette:", error);
      }
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link to="/" className={styles.logo}>
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
          <Link to="/my-lists" className={styles.navLink}>
            <FaListUl /> <span>Liste</span>
          </Link>

          {userId && (
            <>
              <div className={styles.notificationContainer}>
                <button onClick={handleBellClick} className={styles.navLink}>
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className={styles.notificationBadge}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className={styles.notificationDropdown}>
                    {notifications.slice(0, 5).map((n) => (
                      <div key={n._id} className={styles.notificationItem}>
                        {n.type === "new_follower" &&
                          `Nuovo follower: ${n.sender.username}`}
                        {n.type === "new_reaction" &&
                          `${n.sender.username} ha messo like alla tua recensione`}
                        {n.type === "new_comment" &&
                          `${n.sender.username} ha commentato la tua recensione`}
                      </div>
                    ))}
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className={styles.showAllLink}
                    >
                      Mostra tutte
                    </Link>
                  </div>
                )}
              </div>
              <Link to={`/profile/${userId}`} className={styles.navLink}>
                <FaUser /> <span>Profilo</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
