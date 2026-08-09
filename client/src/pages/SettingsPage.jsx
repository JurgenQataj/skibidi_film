import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FiBell, FiDatabase, FiLogOut, FiDownload, FiAlertTriangle,
  FiCheck, FiX, FiShield, FiFilm, FiMessageSquare, FiHeart,
  FiUserPlus, FiAtSign, FiRepeat, FiCheckCircle, FiXCircle, FiAlertCircle
} from "react-icons/fi";
import {
  HiOutlineCloudDownload,
} from "react-icons/hi";
import styles from "./SettingsPage.module.css";
import useAuthStore from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

/* ── Tabs config (Solo Notifiche e Dati) ── */
const TABS = [
  { id: "notifications", label: "Notifiche", Icon: FiBell },
  { id: "data",          label: "Dati",      Icon: FiDatabase },
];

/* ── Modern Toggle Row Component ── */
function ModernToggleRow({ icon: Icon, iconBg, title, description, checked, onChange, disabled }) {
  return (
    <div className={`${styles.modernToggleRow} ${disabled ? styles.disabledRow : ""}`}>
      {Icon && (
        <div className={styles.toggleIconWrapper} style={{ background: iconBg }}>
          <Icon className={styles.toggleIcon} />
        </div>
      )}
      <div className={styles.toggleInfo}>
        <h4 className={styles.toggleTitle}>{title}</h4>
        <p className={styles.toggleDesc}>{description}</p>
      </div>
      <label className={styles.toggleSwitch}>
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
        <span className={styles.slider} />
      </label>
    </div>
  );
}

/* ── Toast notification ── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.toast} ${styles[`toast_${type}`]}`}>
      {type === "success" ? <FiCheck /> : <FiX />}
      <span>{message}</span>
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || "";

/* ── Notifications Tab (Redesigned & Modernized) ── */
function NotificationsTab({ token }) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState("unknown");

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/notification-preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPrefs(res.data);
      } catch (err) {
        console.error("Errore fetch preferenze notifiche:", err);
        setPrefs({
          push_enabled: true, comments: true, reactions: true,
          followers: true, mentions: true, thread_replies: true,
          followed_reviews: true,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }
  }, [token]);

  const togglePref = useCallback(async (field) => {
    if (!prefs || saving) return;
    const newValue = !prefs[field];
    const optimistic = { ...prefs, [field]: newValue };
    setPrefs(optimistic);
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/users/notification-preferences`, 
        { [field]: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Errore salvataggio preferenza:", err);
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }, [prefs, saving, token]);

  if (loading || !prefs) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Caricamento preferenze...</p>
      </div>
    );
  }

  const statusConfig = {
    granted: {
      label: "Attive e Funzionanti",
      desc: "Questo dispositivo riceve correttamente le notifiche push in tempo reale.",
      badgeClass: styles.statusBadgeActive,
      Icon: FiCheckCircle,
    },
    denied: {
      label: "Bloccate dal Browser",
      desc: "Sblocca le autorizzazioni notifiche nelle impostazioni del browser.",
      badgeClass: styles.statusBadgeBlocked,
      Icon: FiXCircle,
    },
    default: {
      label: "Da Abilitare",
      desc: "Non hai ancora concesso il permesso notifiche sul browser.",
      badgeClass: styles.statusBadgeWarn,
      Icon: FiAlertCircle,
    },
    unsupported: {
      label: "Non Supportate",
      desc: "Il browser corrente non supporta il sistema Web Push.",
      badgeClass: styles.statusBadgeBlocked,
      Icon: FiXCircle,
    },
  };

  const currentStatus = statusConfig[pushStatus] || statusConfig.default;
  const StatusIcon = currentStatus.Icon;

  return (
    <div className={styles.notificationsTabContainer}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerTitleGroup}>
          <div className={styles.headerIconBadge}>
            <FiBell />
          </div>
          <div>
            <h2 className={styles.sectionTitle}>Centro Preferenze Push</h2>
            <p className={styles.sectionDesc}>
              Personalizza le notifiche in tempo reale sul tuo dispositivo. Le modifiche sono istantanee.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Browser Status Card */}
      <div className={styles.browserStatusCard}>
        <div className={styles.statusHeaderRow}>
          <div className={styles.statusInfoGroup}>
            <div className={styles.statusPulseDotGroup}>
              <span className={`${styles.pulseDot} ${currentStatus.badgeClass}`} />
              <h4 className={styles.statusTitle}>Stato Push Browser</h4>
            </div>
            <p className={styles.statusDesc}>{currentStatus.desc}</p>
          </div>
          <div className={`${styles.statusBadgePill} ${currentStatus.badgeClass}`}>
            <StatusIcon size={14} />
            <span>{currentStatus.label}</span>
          </div>
        </div>
      </div>

      {/* Master Toggle Switch Card */}
      <div className={`${styles.masterToggleCard} ${prefs.push_enabled ? styles.masterActive : styles.masterInactive}`}>
        <ModernToggleRow
          icon={FiShield}
          iconBg="linear-gradient(135deg, #e50914, #a1001c)"
          title="Notifiche Push Generali"
          description="Interruttore principale. Disattivandolo non riceverai alcuna notifica su questo dispositivo."
          checked={prefs.push_enabled}
          onChange={() => togglePref("push_enabled")}
        />
      </div>

      {/* Categorized Preferences */}
      <div className={`${styles.categoriesWrapper} ${!prefs.push_enabled ? styles.disabledSection : ""}`}>
        {!prefs.push_enabled && (
          <div className={styles.disabledOverlayBadge}>
            <FiShield size={16} />
            <span>Attiva le Notifiche Push Generali per personalizzare le categorie</span>
          </div>
        )}

        {/* Group 1: Attività & Seguiti */}
        <div className={styles.categoryCard}>
          <h3 className={styles.categoryHeading}>
            <span className={styles.categoryHeadingDot} style={{ background: '#e50914' }} />
            Attività & Seguiti
          </h3>
          <ModernToggleRow
            icon={FiFilm}
            iconBg="rgba(229, 9, 20, 0.2)"
            title="Recensioni dei Seguiti"
            description="Ricevi una notifica push esterna quando un utente che segui pubblica una recensione."
            checked={prefs.followed_reviews}
            onChange={() => togglePref("followed_reviews")}
            disabled={!prefs.push_enabled}
          />
          <ModernToggleRow
            icon={FiUserPlus}
            iconBg="rgba(34, 197, 94, 0.2)"
            title="Nuovi Follower"
            description="Ricevi un avviso immediato quando qualcuno inizia a seguire il tuo profilo."
            checked={prefs.followers}
            onChange={() => togglePref("followers")}
            disabled={!prefs.push_enabled}
          />
        </div>

        {/* Group 2: Interazioni sulle tue Recensioni */}
        <div className={styles.categoryCard}>
          <h3 className={styles.categoryHeading}>
            <span className={styles.categoryHeadingDot} style={{ background: '#3b82f6' }} />
            Le Tue Recensioni
          </h3>
          <ModernToggleRow
            icon={FiMessageSquare}
            iconBg="rgba(59, 130, 246, 0.2)"
            title="Commenti"
            description="Ricevi una notifica quando qualcuno lascia un commento sotto una tua recensione."
            checked={prefs.comments}
            onChange={() => togglePref("comments")}
            disabled={!prefs.push_enabled}
          />
          <ModernToggleRow
            icon={FiHeart}
            iconBg="rgba(239, 68, 68, 0.2)"
            title="Reazioni"
            description="Notifica quando altri utenti aggiungono un like o reazione alle tue recensioni."
            checked={prefs.reactions}
            onChange={() => togglePref("reactions")}
            disabled={!prefs.push_enabled}
          />
        </div>

        {/* Group 3: Menzioni & Chat */}
        <div className={styles.categoryCard}>
          <h3 className={styles.categoryHeading}>
            <span className={styles.categoryHeadingDot} style={{ background: '#a855f7' }} />
            Menzioni & Conversazioni
          </h3>
          <ModernToggleRow
            icon={FiAtSign}
            iconBg="rgba(168, 85, 247, 0.2)"
            title="Menzioni (@username)"
            description="Ricevi un avviso quando vieni menzionato nei commenti o nella Chat Globale."
            checked={prefs.mentions}
            onChange={() => togglePref("mentions")}
            disabled={!prefs.push_enabled}
          />
          <ModernToggleRow
            icon={FiRepeat}
            iconBg="rgba(6, 182, 212, 0.2)"
            title="Risposte nei Thread"
            description="Notifica quando altri utenti rispondono in una discussione in cui sei intervenuto."
            checked={prefs.thread_replies}
            onChange={() => togglePref("thread_replies")}
            disabled={!prefs.push_enabled}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
function SettingsPage() {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("notifications");

  /* Toast state */
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  /* Export */
  const [exporting, setExporting] = useState(false);

  if (!token) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.notLogged}>
          <p>Devi effettuare l'accesso per visualizzare le impostazioni.</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* ── Export helpers ── */
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await axios.get(`${API_URL}/api/users/export-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;

      if (format === "json") {
        downloadFile(JSON.stringify(data, null, 2), "skibidi_film_export.json", "application/json;charset=utf-8");
        showToast("Export JSON scaricato!");
      } else {
        // CSV
        const csvRows = ["Titolo,TMDB ID,Tipo,Voto,Commento,Spoiler,Regista,Generi,Data"];
        for (const r of (data.reviews || [])) {
          const row = [
            `"${(r.movie_title || "").replace(/"/g, '""')}"`,
            r.tmdb_id || "",
            r.media_type || "",
            r.rating || "",
            `"${(r.comment || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            r.is_spoiler ? "Sì" : "No",
            `"${(r.director || "").replace(/"/g, '""')}"`,
            `"${(r.genres || "").replace(/"/g, '""')}"`,
            r.date ? new Date(r.date).toLocaleDateString("it-IT") : "",
          ];
          csvRows.push(row.join(","));
        }
        // Watchlist section
        csvRows.push(""); 
        csvRows.push("--- WATCHLIST ---");
        csvRows.push("Titolo,TMDB ID,Tipo,Anno");
        for (const w of (data.watchlist || [])) {
          csvRows.push([
            `"${(w.title || "").replace(/"/g, '""')}"`,
            w.tmdb_id || "",
            w.media_type || "",
            w.release_year || "",
          ].join(","));
        }
        downloadFile("\uFEFF" + csvRows.join("\n"), "skibidi_film_export.csv", "text/csv;charset=utf-8");
        showToast("Export CSV scaricato!");
      }
    } catch (err) {
      console.error("Errore export:", err);
      showToast("Errore durante l'esportazione.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      localStorage.removeItem("suggestionsCache");
      showToast("Cache svuotata con successo!");
    } catch {
      showToast("Errore nello svuotamento della cache.", "error");
    }
  };

  /* ── Tab panels ── */
  const renderContent = () => {
    switch (activeTab) {
      /* ── NOTIFICATIONS ── */
      case "notifications":
        return <NotificationsTab token={token} />;

      /* ── DATA ── */
      case "data":
        return (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Dati e Archiviazione</h2>
              <p className={styles.sectionDesc}>Esporta o gestisci i tuoi dati personali.</p>
            </div>

            <div className={styles.card}>
              <button 
                className={styles.dataBtn} 
                onClick={() => handleExport("csv")}
                disabled={exporting}
              >
                <FiDownload className={styles.dataBtnIcon} />
                <span className={styles.dataBtnText}>
                  <span className={styles.dataBtnLabel}>
                    {exporting ? "Esportazione..." : "Esporta in CSV"}
                  </span>
                  <span className={styles.dataBtnSub}>Recensioni, watchlist e valutazioni</span>
                </span>
              </button>
              <button 
                className={styles.dataBtn} 
                onClick={() => handleExport("json")}
                disabled={exporting}
              >
                <HiOutlineCloudDownload className={styles.dataBtnIcon} />
                <span className={styles.dataBtnText}>
                  <span className={styles.dataBtnLabel}>
                    {exporting ? "Esportazione..." : "Esporta in JSON"}
                  </span>
                  <span className={styles.dataBtnSub}>Formato completo per backup manuale</span>
                </span>
              </button>
            </div>

            <div className={styles.dangerCard}>
              <p className={styles.dangerTitle}>🗑 Gestione Cache</p>
              <p className={styles.dangerDesc}>
                Svuota la cache locale per liberare spazio. Non elimina nessun dato del tuo account.
              </p>
              <button className={styles.dangerBtn} onClick={handleClearCache}>
                <FiAlertTriangle /> Svuota Cache Recente
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Mobile-only page title */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageHeaderTitle}>Impostazioni</h1>
      </div>

      <div className={styles.layout}>
        {/* ── Sidebar / Tab Nav ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>Impostazioni</div>

          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`${styles.navBtn} ${activeTab === id ? styles.active : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {activeTab === id && <span className={styles.activePill} />}
              <Icon className={styles.navBtnIcon} />
              <span className={styles.navBtnLabel}>{label}</span>
            </button>
          ))}

          <div className={styles.sidebarDivider} />

          <button className={styles.logoutBtn} onClick={handleLogout}>
            <FiLogOut />
            Logout
          </button>
        </aside>

        {/* ── Content ── */}
        <main className={styles.contentPanel} key={activeTab}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;
