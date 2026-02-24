import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import styles from "./NotificationsPage.module.css";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(response.data);
      } catch (error) {
        console.error("Errore nel caricamento delle notifiche:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [API_URL]);

  const getNotificationLink = (notification) => {
    // CONTROLLO DI SICUREZZA
    if (!notification || !notification.sender) return "/";

    switch (notification.type) {
      case "new_follower":
        return `/profile/${notification.sender._id}`;
      case "new_reaction":
      case "new_comment":
      case "review_mention":
      case "comment_mention":
        // CONTROLLO DI SICUREZZA ANCORA PIÙ SPECIFICO
        if (
          notification.targetReview &&
          notification.targetReview.movie &&
          notification.targetReview.movie.tmdb_id
        ) {
          return `/${notification.targetReview.movie.media_type === "tv" ? "tv" : "movie"}/${notification.targetReview.movie.tmdb_id}`;
        }
        return "/"; // Link di fallback se i dati sono corrotti
      case "chat_mention":
        return "/discover";
      default:
        return "/";
    }
  };

  const getNotificationText = (notification) => {
    // Gestione notifica senza mittente valido
    if (!notification || !notification.sender) return "Nuova notifica da un utente eliminato.";

    switch (notification.type) {
      case "new_follower":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha iniziato a
            seguirti.
          </>
        );
      case "new_reaction":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha messo like alla
            tua recensione.
          </>
        );
      case "new_comment":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha commentato la tua
            recensione.
          </>
        );
      case "review_mention":
        return (
          <>
            <strong>{notification.sender.username}</strong> ti ha menzionato in una
            recensione.
          </>
        );
      case "comment_mention":
        return (
          <>
            <strong>{notification.sender.username}</strong> ti ha menzionato in un
            commento.
          </>
        );
      case "chat_mention":
        return (
          <>
            <strong>{notification.sender.username}</strong> ti ha menzionato nella
            chat globale.
          </>
        );
      default:
        return "Nuova notifica.";
    }
  };

  const getNotificationSideElements = (notification) => {
    if (!notification) return null;

    if (notification.type === "new_follower") {
      return (
        <button 
          className={styles.followBackButton} 
          onClick={(e) => {
            e.preventDefault(); 
            // Here you could add follow-back logic
          }}
        >
          Visualizza
        </button>
      );
    }
    
    // For mentions or likes related to a review with a movie/tv
    if (notification.targetReview?.movie?.poster_path) {
      const posterBaseUrl = "https://image.tmdb.org/t/p/w92";
      return (
        <img 
          src={`${posterBaseUrl}${notification.targetReview.movie.poster_path}`} 
          className={styles.thumbnail}
          alt="poster"
        />
      );
    }

    // Default or chat
    return null;
  };

  const timeAgo = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it });
  };

  if (loading)
    return <p className={styles.statusText}>Caricamento notifiche...</p>;

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Le tue Notifiche</h1>
      <div className={styles.notificationsList}>
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <Link
              to={getNotificationLink(notification)}
              key={notification._id}
              className={styles.notificationLink}
            >
              <div
                className={`${styles.notificationItem} ${
                  !notification.read ? styles.unread : ""
                }`}
              >
                <img
                  src={
                    notification?.sender?.avatar_url ||
                    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png"
                  }
                  alt="avatar"
                  className={styles.avatar}
                />
                <div className={styles.notificationContent}>
                  <p className={styles.notificationText}>
                    {getNotificationText(notification)}
                  </p>
                  <span className={styles.timestamp}>
                    {timeAgo(notification.createdAt)}
                  </span>
                </div>
                <div className={styles.sideElement}>
                  {getNotificationSideElements(notification)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className={styles.statusText}>Nessuna notifica per ora.</p>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
