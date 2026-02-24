import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./UserCard.module.css";

const MAX_USERNAME_LENGTH = 11;

const UserCard = ({ user, onNavigate }) => {
  const navigate = useNavigate();
  const avatar =
    user.avatar_url ||
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png";

  const displayName =
    user.username.length > MAX_USERNAME_LENGTH
      ? user.username.slice(0, MAX_USERNAME_LENGTH)
      : user.username;

  const [isFollowing, setIsFollowing] = useState(null);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const token = localStorage.getItem("token");
  const loggedInUserId = token ? jwtDecode(token).user.id : null;

  useEffect(() => {
    if (!token || !loggedInUserId || loggedInUserId === user._id) return;
    const fetchStatus = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const res = await axios.get(`${API_URL}/api/users/${user._id}/follow-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFollowing(res.data.isFollowing);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
  }, [user._id, token, loggedInUserId]);

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    if (!token) return;
    setLoadingFollow(true);
    const API_URL = import.meta.env.VITE_API_URL || "";
    const endpoint = isFollowing ? "unfollow" : "follow";
    const method = isFollowing ? "delete" : "post";
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (method === "post") {
        await axios.post(`${API_URL}/api/users/${user._id}/${endpoint}`, {}, config);
      } else {
        await axios.delete(`${API_URL}/api/users/${user._id}/${endpoint}`, config);
      }
      setIsFollowing(!isFollowing);
    } catch (err) {
      alert("Errore durante l'operazione");
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleClick = () => {
    if (onNavigate) onNavigate();
    navigate(`/profile/${user._id}`);
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.avatarWrapper}>
        <img
          src={avatar}
          alt={`Avatar di ${user.username}`}
          className={styles.avatar}
        />
      </div>
      <div className={styles.userInfo}>
        <div className={styles.username} title={user.username}>
          {displayName}
        </div>
        {user.followers_count !== undefined && (
          <div className={styles.followers}>
            {user.followers_count} follower
          </div>
        )}
      </div>
      
      <div className={styles.actionsBox}>
        {loggedInUserId && loggedInUserId !== user._id && isFollowing !== null && (
          <button 
            className={`${styles.followBtn} ${isFollowing ? styles.following : styles.notFollowing}`}
            onClick={handleFollowToggle}
            disabled={loadingFollow}
          >
            {isFollowing ? "Segui già" : "Segui"}
          </button>
        )}
        <button className={styles.dotsBtn} onClick={(e) => e.stopPropagation()}>⋮</button>
      </div>
    </div>
  );
};

export default UserCard;
