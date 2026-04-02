import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import useAuthStore from "../store/useAuthStore";
import { jwtDecode } from 'jwt-decode';
import styles from './GlobalChat.module.css';

const API_URL = import.meta.env.VITE_API_URL || '';

// Renderizza testo con @mention evidenziate
function renderText(text) {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className={styles.mentionTag}>{part}</span>
      : part
  );
}

// ── MessageBubble ────────────────────────────────────────────────────────────
function getBubbleRadiusClass(isSingle, isFirst, isLast, styles) {
  if (isSingle) return '';
  if (isFirst)  return styles.bubbleFirst;
  if (isLast)   return styles.bubbleLast;
  return styles.bubbleMiddle;
}

function MessageBubble({ msg, mi, groupLength, isOwn, user, hoveredMsg, selectedMsg, deletingId, setHoveredMsg, setSelectedMsg, handleLike, handleDelete, styles }) {
  const isFirst   = mi === 0;
  const isLast    = mi === groupLength - 1;
  const isSingle  = groupLength === 1;
  const likeCount = (msg.likes || []).length;
  const isLiked   = user && (msg.likes || []).some(
    (id) => (id._id || id).toString() === user.id
  );
  const isDeleting  = deletingId === msg._id;
  const radiusClass = getBubbleRadiusClass(isSingle, isFirst, isLast, styles);

  const toggleSelected = () =>
    setSelectedMsg((prev) => (prev === msg._id ? null : msg._id));
  const handleRowKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') toggleSelected();
  };

  return (
    <div
      key={msg._id}
      className={`${styles.messageRow} ${isOwn ? styles.ownRow : ''} ${isDeleting ? styles.deleting : ''}`}
      onMouseEnter={() => setHoveredMsg(msg._id)}
      onMouseLeave={() => setHoveredMsg(null)}
      onClick={toggleSelected}
      onKeyDown={handleRowKeyDown}
      tabIndex={0}
      role="button"
    >
      {/* Avatar: solo sull'ultimo msg di ogni gruppo altrui */}
      {!isOwn ? (
        isLast || isSingle ? (
          <img
            src={msg.user?.avatar_url || 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/151.png'}
            alt="avatar"
            className={styles.messageAvatar}
          />
        ) : (
          <div className={styles.avatarSpace} />
        )
      ) : null}

      {/* Bolla */}
      <div className={styles.bubbleWrap}>
        <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble} ${radiusClass}`}>
          <p className={styles.messageText}>{renderText(msg.text)}</p>
        </div>

        {/* Meta (ora, like, spunta) — solo sull'ultimo del gruppo */}
        {(isLast || isSingle) && (
          <div className={styles.bubbleMeta}>
            {likeCount > 0 && <span className={styles.likeCount}>❤️ {likeCount}</span>}
            <span className={styles.messageTime}>
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && <span className={styles.readTick}>✓✓</span>}
          </div>
        )}
      </div>

      {/* Azioni hover/tap — inline accanto alla bolla */}
      {user && (hoveredMsg === msg._id || selectedMsg === msg._id) && !msg._optimistic && (
        <div className={styles.messageActions}>
          <button
            className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
            onClick={(e) => { e.stopPropagation(); handleLike(msg._id); }}
            title="Like"
          >❤️</button>
          {isOwn && (
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={(e) => { e.stopPropagation(); handleDelete(msg._id); }}
              title="Elimina"
            >🗑️</button>
          )}
        </div>
      )}
    </div>
  );
}


// Raggruppa messaggi consecutivi dello stesso autore
function groupMessages(messages) {
  const groups = [];
  let current = null;
  messages.forEach((msg) => {
    const authorId = msg.user?._id || msg.user?.id;
    if (current && current.authorId === authorId) {
      current.msgs.push(msg);
    } else {
      current = { authorId, msgs: [msg] };
      groups.push(current);
    }
  });
  return groups;
}

const QUICK_EMOJIS = ['😂', '❤️', '🔥', '👏', '😍', '🤯', '😭', '🎬'];

const GlobalChat = () => {
  const { token } = useAuthStore();
  let user = null;
  if (token) { try { user = jwtDecode(token).user; } catch (e) {} }

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sendPulse, setSendPulse] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesListRef = useRef(null);
  const inputRef = useRef(null);
  const isInitialMount = useRef(true);

  // Fetch
  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chat`);
      setMessages(res.data);
      setLoading(false);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Auto scroll smooth
  const scrollToBottom = (behavior = 'auto') => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTo({ top: messagesListRef.current.scrollHeight, behavior });
    }
  };

  useEffect(() => {
    if (isInitialMount.current && messages.length > 0) {
      scrollToBottom('auto');
      isInitialMount.current = false;
    } else if (!isInitialMount.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  // @mention search
  useEffect(() => {
    if (!mentionSearch) { setMentionUsers([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/search?q=${mentionSearch}&limit=5`);
        setMentionUsers(res.data || []);
      } catch { setMentionUsers([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [mentionSearch]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    const cursor = e.target.selectionStart;
    const upToCursor = value.slice(0, cursor);
    const atMatch = upToCursor.match(/(?:^|\s)@(\w*)$/);
    if (atMatch) {
      setMentionSearch(atMatch[1]);
      setMentionPosition(cursor - atMatch[1].length - 1);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionSearch('');
      setMentionPosition(null);
    }
  };

  const handleSelectMention = (username) => {
    if (mentionPosition === null) return;
    const before = newMessage.slice(0, mentionPosition);
    const after = newMessage.slice(mentionPosition + mentionSearch.length + 1);
    setNewMessage(`${before}@${username} ${after}`);
    setShowMentionDropdown(false);
    setMentionSearch('');
    setMentionPosition(null);
    inputRef.current?.focus();
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Send con pulse
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    // Animazione pulse sul bottone
    setSendPulse(true);
    setTimeout(() => setSendPulse(false), 500);

    const optimistic = {
      _id: `tmp-${Date.now()}`,
      user: { _id: user.id, username: user.username, avatar_url: user.avatar_url },
      text: newMessage.trim(),
      likes: [],
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((p) => [...p, optimistic]);
    const text = newMessage.trim();
    setNewMessage('');
    setShowMentionDropdown(false);
    try {
      const tkn = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/chat`, { text }, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      setMessages((p) => p.map((m) => (m._id === optimistic._id ? res.data : m)));
    } catch {
      setMessages((p) => p.filter((m) => m._id !== optimistic._id));
    }
  };

  // Like
  const updateLikeState = (messages, msgId, userId) =>
    messages.map((m) => {
      if (m._id !== msgId) return m;
      const liked = (m.likes || []).some((id) => (id._id || id).toString() === userId);
      return {
        ...m,
        likes: liked
          ? (m.likes || []).filter((id) => (id._id || id).toString() !== userId)
          : [...(m.likes || []), userId],
      };
    });

  const handleLike = async (msgId) => {
    if (!user) return;
    setMessages((p) => updateLikeState(p, msgId, user.id));
    try {
      const tkn = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/chat/${msgId}/like`, {}, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
    } catch { fetchMessages(); }
  };

  // Delete
  const handleDelete = async (msgId) => {
    if (!window.confirm('Eliminare questo messaggio?')) return;
    setDeletingId(msgId);
    try {
      const tkn = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/chat/${msgId}`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      setMessages((p) => p.filter((m) => m._id !== msgId));
    } catch { console.error('Errore delete'); }
    finally { setDeletingId(null); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setShowMentionDropdown(false); setShowEmojiPicker(false); }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  };

  const groups = groupMessages(messages);

  return (
    <div className={styles.chatContainer}>
      {/* ── Sticky Header ── */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <div className={styles.chatHeaderIcon}>🎬</div>
          <div>
            <div className={styles.chatTitle}>Forum Globale</div>
            <div className={styles.chatSubtitle}>{messages.length} messaggi</div>
          </div>
        </div>
        <div className={styles.chatOnlineIndicator}>
          <span className={styles.onlineDot} /> Live
        </div>
      </div>

      {/* ── Messaggi ── */}
      <div className={styles.messagesList} ref={messagesListRef}>
        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.loadingDots}><span /><span /><span /></div>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <span>👻</span>
            <p>Ancora nessun messaggio. Rompi il ghiaccio!</p>
          </div>
        ) : (
          groups.map((group, gi) => {
            const isOwn = group.authorId === user?.id;
            const firstMsg = group.msgs[0];
            return (
              <div key={`g-${gi}`} className={styles.messageGroup}>
                {!isOwn && (
                  <div className={styles.messageAuthor}>
                    {firstMsg.user?.username || 'Utente'}
                  </div>
                )}
                {group.msgs.map((msg, mi) => (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    mi={mi}
                    groupLength={group.msgs.length}
                    isOwn={isOwn}
                    user={user}
                    hoveredMsg={hoveredMsg}
                    selectedMsg={selectedMsg}
                    deletingId={deletingId}
                    setHoveredMsg={setHoveredMsg}
                    setSelectedMsg={setSelectedMsg}
                    handleLike={handleLike}
                    handleDelete={handleDelete}
                    styles={styles}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* ── Input Area ── */}
      {user ? (
        <div className={styles.inputArea}>
          {/* Mention Dropdown */}
          {showMentionDropdown && mentionUsers.length > 0 && (
            <div className={styles.mentionDropdown}>
              {mentionUsers.map((u) => (
                <button
                  key={u._id}
                  className={styles.mentionOption}
                  onMouseDown={(e) => { e.preventDefault(); handleSelectMention(u.username); }}
                >
                  <img
                    src={u.avatar_url || 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/151.png'}
                    alt={u.username}
                    className={styles.mentionAvatar}
                  />
                  <span>@{u.username}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Emoji Picker */}
          {showEmojiPicker && (
            <div className={styles.emojiPicker}>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className={styles.emojiBtn}
                  onMouseDown={(e) => { e.preventDefault(); handleEmojiClick(emoji); }}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className={styles.chatForm}>
            {/* Emoji trigger */}
            <button
              type="button"
              className={styles.emojiTrigger}
              onClick={() => setShowEmojiPicker((v) => !v)}
              aria-label="Emoji"
              title="Emoji"
            >
              😊
            </button>

            <div className={styles.inputWrapper}>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Scrivi un messaggio… usa @ per taggare"
                className={styles.chatInput}
                maxLength={500}
                autoComplete="off"
              />
            </div>

            {/* Send button con pulse */}
            <button
              type="submit"
              className={`${styles.sendButton} ${sendPulse ? styles.sendPulse : ''}`}
              disabled={!newMessage.trim()}
              aria-label="Invia"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.loginPrompt}>
          <span>🔐</span> Accedi per partecipare alla chat
        </div>
      )}
    </div>
  );
};

export default GlobalChat;

