import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import styles from "./NotificationsPage.module.css";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { SkeletonWithLogo } from "../components/Skeleton";
import { MdNotificationsActive, MdNotificationsOff, MdSend, MdSettings, MdInfoOutline, MdCheckCircle } from "react-icons/md";
import { subscribeUserToPush, checkPushSubscriptionStatus } from "../utils/pushNotifications";
import { useToast } from "../context/ToastContext";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [followLoadingMap, setFollowLoadingMap] = useState({});
  const { toast } = useToast();

  // Paginazione
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Push Notification state
  const [pushInfo, setPushInfo] = useState({
    browserPermission: "default",
    subscribed: false,
    hasActiveSubscription: false,
    deviceCount: 0
  });
  const [pushActionLoading, setPushActionLoading] = useState(false);
  const [testPushStatus, setTestPushStatus] = useState(null);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "";

  const refreshPushStatus = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      const status = await checkPushSubscriptionStatus(token);
      setPushInfo(status);
    }
  };

  useEffect(() => {
    const fetchNotificationsAndFollowing = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        let currentUserId = null;
        try {
          const decoded = jwtDecode(token);
          currentUserId = decoded.user?.id || decoded.user?._id;
        } catch (e) {
          console.error("Errore decoding token:", e);
        }

        const [notificationsRes, followingRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/notifications?page=1&limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          currentUserId
            ? axios.get(`${API_URL}/api/users/${currentUserId}/following`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
        ]);

        if (notificationsRes.status === "fulfilled") {
          const data = notificationsRes.value.data;
          if (Array.isArray(data)) {
            setNotifications(data);
            setHasMore(false);
          } else if (data?.notifications) {
            setNotifications(data.notifications);
            setHasMore(data.hasMore || false);
            setPage(data.page || 1);
          }
        }

        if (followingRes.status === "fulfilled" && followingRes.value?.data) {
          const ids = new Set(
            followingRes.value.data.map((u) => (typeof u === "string" ? u : u._id))
          );
          setFollowingIds(ids);
        }
      } catch (error) {
        console.error("Errore nel caricamento delle notifiche:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotificationsAndFollowing();
    refreshPushStatus();
  }, [API_URL]);

  const loadMoreNotifications = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const token = localStorage.getItem("token");
      const nextPage = page + 1;
      const res = await axios.get(`${API_URL}/api/notifications?page=${nextPage}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      if (data?.notifications) {
        setNotifications((prev) => [...prev, ...data.notifications]);
        setHasMore(data.hasMore || false);
        setPage(data.page || nextPage);
      }
    } catch (err) {
      console.error("Errore caricamento altre notifiche:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleEnablePush = async () => {
    setPushActionLoading(true);
    setTestPushStatus(null);
    try {
      if (!('Notification' in window)) {
        alert("Il tuo browser non supporta le notifiche Push.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const token = localStorage.getItem("token");
        if (token) {
          await subscribeUserToPush(token);
          localStorage.removeItem("dismissedNotificationPrompt");
        }
      } else if (permission === "denied") {
        setShowAndroidGuide(true);
      }
    } catch (err) {
      console.error("Errore abilitazione push:", err);
    } finally {
      await refreshPushStatus();
      setPushActionLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushActionLoading(true);
    setTestPushStatus(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/api/push/test-push`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestPushStatus({
        type: "success",
        message: `📲 Notifica di prova inviata! (Dispositivi raggiunti: ${res.data.sent || 0})`
      });
    } catch (err) {
      console.error("Errore invio test push:", err);
      setTestPushStatus({
        type: "error",
        message: "❌ Errore durante l'invio della notifica di prova. Verifica di aver attivato le notifiche."
      });
    } finally {
      setPushActionLoading(false);
    }
  };

  const handleFollowToggle = async (e, targetUserId) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token || !targetUserId || followLoadingMap[targetUserId]) return;

    setFollowLoadingMap((prev) => ({ ...prev, [targetUserId]: true }));
    const isFollowing = followingIds.has(targetUserId);
    const endpoint = isFollowing ? "unfollow" : "follow";
    const method = isFollowing ? "delete" : "post";

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (method === "post") {
        await axios.post(`${API_URL}/api/users/${targetUserId}/${endpoint}`, {}, config);
      } else {
        await axios.delete(`${API_URL}/api/users/${targetUserId}/${endpoint}`, config);
      }

      setFollowingIds((prev) => {
        const newSet = new Set(prev);
        if (isFollowing) {
          newSet.delete(targetUserId);
        } else {
          newSet.add(targetUserId);
        }
        return newSet;
      });
    } catch (err) {
      console.error("Errore durante l'operazione di follow:", err);
      if (toast) toast("Errore durante l'operazione", "error");
    } finally {
      setFollowLoadingMap((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const getNotificationLink = (notification) => {
    if (!notification || !notification.sender) return "/";

    switch (notification.type) {
      case "new_follower":
        return `/profile/${notification.sender._id || notification.sender}`;
      case "new_reaction":
      case "new_comment":
      case "review_mention":
      case "comment_mention":
      case "following_review":
      case "thread_comment":
      case "comment_like":
        if (notification.targetReview && notification.targetReview.movie) {
          const movie = notification.targetReview.movie;
          const tmdbId = movie.tmdb_id || movie._id;
          const mediaType = movie.media_type === "tv" ? "tv" : "movie";
          const reviewId = notification.targetReview._id || notification.targetReview;
          if (tmdbId) {
            return `/${mediaType}/${tmdbId}${reviewId ? `?reviewId=${reviewId}` : ""}`;
          }
        }
        return "/";
      case "chat_mention":
        return "/discover";
      default:
        return "/";
    }
  };

  const getNotificationText = (notification) => {
    if (!notification || !notification.sender) return "Nuova notifica da un utente eliminato.";

    const movieTitle = notification.targetReview?.movie?.title ? (
      <> su <em>{notification.targetReview.movie.title}</em></>
    ) : null;

    switch (notification.type) {
      case "following_review":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha pubblicato una nuova recensione{movieTitle || "."}
          </>
        );
      case "new_follower":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha iniziato a seguirti.
          </>
        );
      case "new_reaction":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha messo like alla tua recensione{movieTitle || "."}
          </>
        );
      case "new_comment":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha commentato la tua recensione{movieTitle || "."}
          </>
        );
      case "thread_comment":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha risposto al tuo commento{movieTitle || "."}
          </>
        );
      case "comment_like":
        return (
          <>
            <strong>{notification.sender.username}</strong> ha messo me piace al tuo commento{movieTitle || "."}
          </>
        );
      case "review_mention":
        return (
          <>
            <strong>{notification.sender.username}</strong> ti ha menzionato in una recensione{movieTitle || "."}
          </>
        );
      case "comment_mention":
        return (
          <>
            <strong>{notification.sender.username}</strong> ti ha menzionato in un commento{movieTitle || "."}
          </>
        );
      case "chat_mention":
        return (
          <>
            <strong>{notification.sender.username}</strong> ti ha menzionato nella chat globale.
          </>
        );
      default:
        return (
          <>
            <strong>{notification.sender.username}</strong> ti ha inviato una notifica{movieTitle || "."}
          </>
        );
    }
  };

  const getNotificationSideElements = (notification) => {
    if (!notification) return null;

    if (notification.type === "new_follower") {
      if (!notification.sender || !notification.sender._id) return null;
      const targetUserId = notification.sender._id;
      const isFollowing = followingIds.has(targetUserId);
      const isLoading = followLoadingMap[targetUserId];

      return (
        <button 
          className={`${styles.followBackButton} ${
            isFollowing ? styles.following : styles.notFollowing
          }`} 
          onClick={(e) => handleFollowToggle(e, targetUserId)}
          disabled={isLoading}
        >
          {isFollowing ? "Segui già" : "Segui"}
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
         loading="lazy" decoding="async" />
      );
    }

    // Default or chat
    return null;
  };

  const timeAgo = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it });
  };

  if (loading) return <SkeletonWithLogo />;

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Le tue Notifiche</h1>

      {/* --- PUSH NOTIFICATION CONTROL BANNER --- */}
      <div className={styles.pushCard}>
        <div className={styles.pushHeader}>
          <div className={styles.pushTitleGroup}>
            {pushInfo.browserPermission === "granted" && pushInfo.subscribed ? (
              <MdNotificationsActive className={`${styles.pushIcon} ${styles.active}`} />
            ) : (
              <MdNotificationsOff className={`${styles.pushIcon} ${styles.inactive}`} />
            )}
            <div>
              <h3 className={styles.pushTitle}>Notifiche Push sul tuo Dispositivo</h3>
              <p className={styles.pushSubtitle}>
                {pushInfo.browserPermission === "granted" && pushInfo.subscribed ? (
                  <span className={styles.statusOk}>
                    <MdCheckCircle style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Attive su questo telefono ({pushInfo.deviceCount} {pushInfo.deviceCount === 1 ? "dispositivo" : "dispositivi"})
                  </span>
                ) : pushInfo.browserPermission === "denied" ? (
                  <span className={styles.statusError}>
                    ⚠️ Bloccate dal browser. Segui le istruzioni qui sotto per riattivarle.
                  </span>
                ) : (
                  <span className={styles.statusWarn}>
                    ⚠️ Non ancora abilitate o da risincronizzare
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.pushActions}>
          <button 
            className={styles.enableBtn}
            onClick={handleEnablePush}
            disabled={pushActionLoading}
          >
            <MdNotificationsActive size={18} />
            {pushActionLoading ? "Attivazione in corso..." : "Attiva / Risincronizza Push"}
          </button>

          {pushInfo.browserPermission === "granted" && (
            <button 
              className={styles.testBtn}
              onClick={handleTestPush}
              disabled={pushActionLoading}
            >
              <MdSend size={16} />
              Invia Prova
            </button>
          )}

          <Link to="/settings" className={styles.settingsLinkBtn} title="Preferenze Notifiche">
            <MdSettings size={18} />
          </Link>
        </div>

        {testPushStatus && (
          <div className={`${styles.testStatusBox} ${styles[testPushStatus.type]}`}>
            {testPushStatus.message}
          </div>
        )}

        {/* Android / Browser Guide expander if denied or requested */}
        {(pushInfo.browserPermission === "denied" || showAndroidGuide) && (
          <div className={styles.androidGuideBox}>
            <h4><MdInfoOutline size={18} /> Come sbloccare le notifiche su Android / Chrome:</h4>
            <ol>
              <li>Tocca l'icona del <strong>lucchetto 🔒</strong> o <strong>impostazioni ⚙️</strong> nella barra degli indirizzi in alto.</li>
              <li>Seleziona <strong>Impostazioni sito</strong> o <strong>Permessi</strong>.</li>
              <li>Trova la voce <strong>Notifiche</strong> e impostala su <strong>Consenti</strong>.</li>
              <li>Torna qui e clicca sul pulsante <strong>"Attiva / Risincronizza Push"</strong> in alto.</li>
            </ol>
          </div>
        )}
      </div>

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
                <img                   src={
                    notification?.sender?.avatar_url ||
                    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png"
                  }
                  alt="avatar"
                  className={styles.avatar}
                 loading="lazy" decoding="async" />
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

        {hasMore && (
          <div style={{ textAlign: "center", marginTop: "24px", marginBottom: "16px" }}>
            <button
              onClick={loadMoreNotifications}
              disabled={loadingMore}
              style={{
                padding: "12px 28px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {loadingMore ? "Caricamento in corso..." : "Carica altre notifiche"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
