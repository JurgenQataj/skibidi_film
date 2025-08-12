import React from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";
import { FaHome, FaSearch, FaUser, FaListUl, FaGlobe } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";

function Navbar() {
  const token = localStorage.getItem("token");
  let userId = null;

  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      userId = decodedToken.user.id;
    } catch (error) {
      console.error("Token non valido:", error);
      // In caso di token malformato, lo rimuoviamo per sicurezza
      localStorage.removeItem("token");
    }
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link to="/" className={styles.logo}>
          Skibidi Film
        </Link>
        <div className={styles.navLinks}>
          <Link to="/" className={styles.navLink}>
            <FaHome /> Feed
          </Link>
          <Link to="/search" className={styles.navLink}>
            <FaSearch /> Cerca
          </Link>
          <Link to="/discover" className={styles.navLink}>
            <FaGlobe /> Scopri Utenti
          </Link>
          <Link to="/my-lists" className={styles.navLink}>
            <FaListUl /> Le Mie Liste
          </Link>

          {userId && (
            <Link to={`/profile/${userId}`} className={styles.navLink}>
              <FaUser /> Profilo
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
