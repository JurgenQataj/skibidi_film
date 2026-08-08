import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FiBell, FiDatabase, FiLogOut, FiDownload, FiAlertTriangle,
  FiCheck, FiX,
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

/* ── Tiny reusable Toggle Row ── */
function ToggleRow({ title, description, checked, onChange, disabled }) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleInfo}>
        <h4>{title}</h4>
        <p>{description}</p>
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

/* ── Notifications Tab (connected to backend) ── */
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
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        Caricamento preferenze...
      </div>
    );
  }

  const pushStatusLabel = {
    granted: "✅ Attive",
    denied: "❌ Bloccate dal browser",
    default: "⚠️ Non ancora richieste",
    unsupported: "❌ Non supportate",
  };

  return (
    <>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Notifiche Push</h2>
        <p className={styles.sectionDesc}>
          Controlla quali notifiche vuoi ricevere. Le modifiche sono salvate automaticamente.
        </p>
      </div>

      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <div>
            <h4 style={{ margin: 0, color: 'var(--text-primary, #fff)' }}>Stato Push Browser</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
              {pushStatusLabel[pushStatus] || pushStatus}
            </p>
          </div>
          {pushStatus === 'denied' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)', maxWidth: 200, textAlign: 'right' }}>
              Vai nelle impostazioni del browser per sbloccare le notifiche.
            </p>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <ToggleRow
          title="Push Abilitate"
          description="Interruttore principale. Se disattivato, nessuna push verrà inviata."
          checked={prefs.push_enabled}
          onChange={() => togglePref('push_enabled')}
        />
      </div>

      <div className={styles.card} style={{ opacity: prefs.push_enabled ? 1 : 0.5, pointerEvents: prefs.push_enabled ? 'auto' : 'none' }}>
        <ToggleRow title="💬 Commenti" description="Quando qualcuno commenta una tua recensione."
          checked={prefs.comments} onChange={() => togglePref('comments')} />
        <ToggleRow title="❤️ Reazioni" description="Quando qualcuno reagisce a una tua recensione."
          checked={prefs.reactions} onChange={() => togglePref('reactions')} />
        <ToggleRow title="👤 Nuovi Follower" description="Quando qualcuno inizia a seguirti."
          checked={prefs.followers} onChange={() => togglePref('followers')} />
        <ToggleRow title="📢 Menzioni" description="Quando qualcuno ti menziona con @username."
          checked={prefs.mentions} onChange={() => togglePref('mentions')} />
        <ToggleRow title="🔄 Risposte nei Thread" description="Quando qualcuno risponde in un thread a cui partecipi."
          checked={prefs.thread_replies} onChange={() => togglePref('thread_replies')} />
      </div>
    </>
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        downloadFile(JSON.stringify(data, null, 2), "skibidi_film_export.json", "application/json");
        showToast("Export JSON scaricato!");
      } else {
        // CSV
        const csvRows = ["Titolo,TMDB ID,Tipo,Voto,Commento,Spoiler,Regista,Generi,Data"];
        for (const r of data.reviews) {
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
        for (const w of data.watchlist) {
          csvRows.push([
            `"${(w.title || "").replace(/"/g, '""')}"`,
            w.tmdb_id || "",
            w.media_type || "",
            w.release_year || "",
          ].join(","));
        }
        downloadFile(csvRows.join("\n"), "skibidi_film_export.csv", "text/csv;charset=utf-8");
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
