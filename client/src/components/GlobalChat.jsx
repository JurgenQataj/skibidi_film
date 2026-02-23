import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import styles from './GlobalChat.module.css';

const GlobalChat = () => {
  const { token } = useAuth();
  let user = null;
  if (token) {
    try {
      user = jwtDecode(token).user;
    } catch (err) {}
  }
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesListRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chat`);
      setMessages(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Errore recupero messaggi chat:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Polling ogni 5 secondi
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const isInitialMount = useRef(true);

  const scrollToBottom = (behavior = 'auto') => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTo({
        top: messagesListRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    if (isInitialMount.current && messages.length > 0) {
      // Al primo caricamento andiamo giù senza animazione
      scrollToBottom('auto');
      isInitialMount.current = false;
    } else if (!isInitialMount.current) {
      // Sui nuovi messaggi (polling/invio), scrolliamo dolcemente
      scrollToBottom('smooth');
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/api/chat`,
        { text: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Optimistic update
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (error) {
      console.error("Errore invio messaggio:", error);
      alert("Errore nell'invio del messaggio.");
    }
  };

  return (
    <div className={styles.chatContainer}>
      <h3 className={styles.chatTitle}>💬 Forum Globale</h3>
      
      <div className={styles.messagesList} ref={messagesListRef}>
        {loading ? (
          <p className={styles.loadingText}>Caricamento messaggi...</p>
        ) : messages.length === 0 ? (
          <p className={styles.emptyText}>Ancora nessun messaggio. Rompi il ghiaccio!</p>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg._id} 
              className={`${styles.messageWrapper} ${msg.user?._id === user?.id ? styles.ownMessage : ''}`}
            >
              <img 
                src={msg.user?.avatar_url || 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/151.png'} 
                alt="Avatar" 
                className={styles.messageAvatar}
              />
              <div className={styles.messageContent}>
                <span className={styles.messageAuthor}>{msg.user?.username || 'Gengar'}</span>
                <div className={styles.messageBody}>
                  <p className={styles.messageText}>{msg.text}</p>
                  <span className={styles.messageTime}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {user ? (
        <form onSubmit={handleSendMessage} className={styles.chatForm}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Scrivi un messaggio..."
            className={styles.chatInput}
            maxLength={500}
          />
          <button type="submit" className={styles.sendButton} disabled={!newMessage.trim()}>
            Invia
          </button>
        </form>
      ) : (
        <div className={styles.loginPrompt}>
          Devi effettuare il log in per chattare.
        </div>
      )}
    </div>
  );
};

export default GlobalChat;
