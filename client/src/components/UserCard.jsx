import React from "react";
import { useNavigate } from "react-router-dom";
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
    </div>
  );
};

export default UserCard;
