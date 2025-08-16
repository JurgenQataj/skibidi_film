import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UserCard.module.css";

const UserCard = ({ user, onNavigate }) => {
  const navigate = useNavigate();
  const avatar =
    user.avatar_url ||
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png";

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(); // Chiude il pop-up prima di navigare
    }
    // **LA CORREZIONE: usa user._id invece di user.id**
    navigate(`/profile/${user._id}`);
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <img
        src={avatar}
        alt={`Avatar di ${user.username}`}
        className={styles.avatar}
      />
      <div className={styles.userInfo}>
        <div className={styles.username}>{user.username}</div>
        {user.followers_count !== undefined && (
          <div className={styles.followers}>
            {user.followers_count} Follower
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;
