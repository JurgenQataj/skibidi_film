import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FiUser, FiSliders, FiBell, FiDatabase, FiLock,
  FiLogOut, FiDownload, FiTrash2, FiAlertTriangle,
} from "react-icons/fi";
import {
  HiOutlineSparkles,
  HiOutlineCloudDownload,
} from "react-icons/hi";
import styles from "./SettingsPage.module.css";
import useAuthStore from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

/* ── Tabs config ── */
const TABS = [
  { id: "profile",       label: "Profilo",       Icon: FiUser },
  { id: "preferences",   label: "Preferenze",    Icon: FiSliders },
  { id: "privacy",       label: "Privacy",        Icon: FiLock },
  { id: "notifications", label: "Notifiche",     Icon: FiBell },
  { id: "data",          label: "Dati",           Icon: FiDatabase },
];

/* ── Tiny reusable Toggle Row ── */
function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleInfo}>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <label className={styles.toggleSwitch}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className={styles.slider} />
      </label>
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || "";

/* ── Notifications Tab (connected to backend) ── */
function NotificationsTab({ token }) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState("unknown"); // "granted", "denied", "default", "unsupported"

  // Fetch preferences from backend
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/notification-preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPrefs(res.data);
      } catch (err) {
        console.error("Errore fetch preferenze notifiche:", err);
        // Fallback defaults
        setPrefs({
          push_enabled: true,
          comments: true,
          reactions: true,
          followers: true,
          mentions: true,
          thread_replies: true,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();

    // Check browser push permission status
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }
  }, [token]);

  // Save a single preference toggle
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
      // Rollback
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

      {/* Push permission status */}
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

      {/* Master switch */}
      <div className={styles.card}>
        <ToggleRow
          title="Push Abilitate"
          description="Interruttore principale. Se disattivato, nessuna push verrà inviata."
          checked={prefs.push_enabled}
          onChange={() => togglePref('push_enabled')}
        />
      </div>

      {/* Granular toggles (disabled if master is off) */}
      <div className={styles.card} style={{ opacity: prefs.push_enabled ? 1 : 0.5, pointerEvents: prefs.push_enabled ? 'auto' : 'none' }}>
        <ToggleRow
          title="💬 Commenti"
          description="Quando qualcuno commenta una tua recensione."
          checked={prefs.comments}
          onChange={() => togglePref('comments')}
        />
        <ToggleRow
          title="❤️ Reazioni"
          description="Quando qualcuno reagisce a una tua recensione."
          checked={prefs.reactions}
          onChange={() => togglePref('reactions')}
        />
        <ToggleRow
          title="👤 Nuovi Follower"
          description="Quando qualcuno inizia a seguirti."
          checked={prefs.followers}
          onChange={() => togglePref('followers')}
        />
        <ToggleRow
          title="📢 Menzioni"
          description="Quando qualcuno ti menziona con @username."
          checked={prefs.mentions}
          onChange={() => togglePref('mentions')}
        />
        <ToggleRow
          title="🔄 Risposte nei Thread"
          description="Quando qualcuno risponde in un thread a cui partecipi."
          checked={prefs.thread_replies}
          onChange={() => togglePref('thread_replies')}
        />
      </div>
    </>
  );
}

/* ── Main Component ── */
function SettingsPage() {
  const { token, logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  /* local state for settings */
  const [theme, setTheme]                         = useState("dark");
  const [language, setLanguage]                   = useState("it");
  const [startPage, setStartPage]                 = useState("feed");
  const [privateProfile, setPrivateProfile]       = useState(false);
  const [hideHistory, setHideHistory]             = useState(false);


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

  /* ── Tab panels ── */
  const renderContent = () => {
    switch (activeTab) {

      /* ── PROFILE ── */
      case "profile":
        return (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Profilo e Account</h2>
              <p className={styles.sectionDesc}>Gestisci la tua identità e i dati personali.</p>
            </div>

            {/* Avatar */}
            <div className={styles.card}>
              <div className={styles.settingLabel}>Foto Profilo</div>
              <div className={styles.avatarRow} style={{ marginTop: 10 }}>
                <div className={styles.avatar}>
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className={styles.avatarInfo}>
                  <p>JPG o PNG, max 5 MB. L'immagine verrà ritagliata circolare.</p>
                  <button className={styles.secondaryBtn}>Cambia Foto</button>
                </div>
              </div>
            </div>

            {/* Identity fields */}
            <div className={styles.card}>
              <div className={styles.settingRow}>
                <label className={styles.settingLabel}>Username</label>
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder="Il tuo username"
                  defaultValue={user?.username || ""}
                />
              </div>
              <div className={styles.settingRow}>
                <label className={styles.settingLabel}>Email</label>
                <input
                  type="email"
                  className={styles.inputField}
                  placeholder="La tua email"
                  defaultValue={user?.email || ""}
                />
              </div>
              <div className={styles.settingRow}>
                <label className={styles.settingLabel}>Nuova Password</label>
                <input
                  type="password"
                  className={styles.inputField}
                  placeholder="Lascia vuoto per non cambiare"
                />
              </div>
              <div className={styles.settingRow}>
                <label className={styles.settingLabel}>Biografia</label>
                <textarea
                  className={styles.inputField}
                  rows={3}
                  placeholder="Scrivi qualcosa su di te…"
                />
              </div>
              <div className={styles.btnRow}>
                <button className={styles.primaryBtn}>Salva Modifiche</button>
              </div>
            </div>

            {/* Danger zone */}
            <div className={styles.dangerCard}>
              <p className={styles.dangerTitle}>⚠ Zona Pericolo</p>
              <p className={styles.dangerDesc}>
                L'eliminazione dell'account è permanente e irreversibile. Tutti i tuoi dati, liste e statistiche verranno cancellati.
              </p>
              <button className={styles.dangerBtn}>
                <FiTrash2 /> Elimina Account
              </button>
            </div>
          </>
        );

      /* ── PREFERENCES ── */
      case "preferences":
        return (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Aspetto e Preferenze</h2>
              <p className={styles.sectionDesc}>Personalizza l'interfaccia e l'esperienza dell'app.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.settingRow}>
                <label className={styles.settingLabel}>Tema</label>
                <select
                  className={styles.selectField}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="dark">🌑 Modalità Scura</option>
                  <option value="light">☀️ Modalità Chiara</option>
                  <option value="system">⚙️ Sincronizza col Sistema</option>
                </select>
              </div>
              <div className={styles.settingRow}>
                <label className={styles.settingLabel}>Lingua</label>
                <select
                  className={styles.selectField}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="it">🇮🇹 Italiano</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
              <div className={styles.settingRow}>
                <label className={styles.settingLabel}>Pagina di Avvio</label>
                <select
                  className={styles.selectField}
                  value={startPage}
                  onChange={(e) => setStartPage(e.target.value)}
                >
                  <option value="feed">Feed (Home)</option>
                  <option value="discover">Scopri</option>
                  <option value="horizon">Skibidi Horizon</option>
                </select>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.primaryBtn}>Salva Preferenze</button>
              </div>
            </div>
          </>
        );

      /* ── PRIVACY ── */
      case "privacy":
        return (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Privacy e Social</h2>
              <p className={styles.sectionDesc}>Controllo totale su chi può vedere cosa.</p>
            </div>

            <div className={styles.card}>
              <ToggleRow
                title="Profilo Privato"
                description="Solo tu o i tuoi seguaci potranno vedere liste e statistiche."
                checked={privateProfile}
                onChange={() => setPrivateProfile(!privateProfile)}
              />
              <ToggleRow
                title="Cronologia Nascosta"
                description="Non registrare automaticamente i trailer visualizzati nella cronologia."
                checked={hideHistory}
                onChange={() => setHideHistory(!hideHistory)}
              />
            </div>
          </>
        );

      /* ── NOTIFICATIONS ── */
      case "notifications":
        return (
          <NotificationsTab token={token} />
        );

      /* ── DATA ── */
      case "data":
        return (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Dati e Archiviazione</h2>
              <p className={styles.sectionDesc}>Esporta o gestisci i tuoi dati personali.</p>
            </div>

            <div className={styles.card}>
              <button className={styles.dataBtn}>
                <FiDownload className={styles.dataBtnIcon} />
                <span className={styles.dataBtnText}>
                  <span className={styles.dataBtnLabel}>Esporta in CSV</span>
                  <span className={styles.dataBtnSub}>Watchlist, cronologia e valutazioni</span>
                </span>
              </button>
              <button className={styles.dataBtn}>
                <HiOutlineCloudDownload className={styles.dataBtnIcon} />
                <span className={styles.dataBtnText}>
                  <span className={styles.dataBtnLabel}>Esporta in JSON</span>
                  <span className={styles.dataBtnSub}>Formato completo per backup manuale</span>
                </span>
              </button>
            </div>

            <div className={styles.dangerCard}>
              <p className={styles.dangerTitle}>🗑 Gestione Cache</p>
              <p className={styles.dangerDesc}>
                Svuota la cache locale per liberare spazio. Non elimina nessun dato del tuo account.
              </p>
              <button className={styles.dangerBtn}>
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
