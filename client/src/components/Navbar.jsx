import React from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";
import {
  FaHome,
  FaSearch,
  FaUser,
  FaGlobe,
  FaPlayCircle,
  FaGamepad,
} from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();

  const isImmersivePage = 
    location.pathname.startsWith('/horizon') || 
    location.pathname.startsWith('/rating-game') ||
    location.pathname.startsWith('/actor-age-game') ||
    location.pathname.startsWith('/guess-actor') ||
    location.pathname.startsWith('/guess-year') ||
    location.pathname.startsWith('/news');

  const token = localStorage.getItem("token");
  let userId = null;

  if (token) {
    try {
      userId = jwtDecode(token).user.id;
    } catch (error) {
      console.error("Token non valido:", error);
      localStorage.removeItem("token");
    }
  }

  return (
    <>
      {/* Mobile Topbar con Logo (visibile solo su mobile) */}
      <div className={`${styles.mobileTopbar} ${isImmersivePage ? styles.immersiveTopbar : ""}`}>
        <Link to="/" className={styles.mobileLogo}>
          <img src="/icona3.png" alt="logo" className={styles.logoImg} />
          Skibidi Film
        </Link>
      </div>

      <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link to="/" className={styles.logo}>
          <img src="/icona3.png" alt="logo" className={styles.logoImg} />
          Skibidi Film
        </Link>
        <div className={styles.navLinks}>
          <Link to="/" className={styles.navLink}>
            <FaHome /> <span>Feed</span>
          </Link>
          <Link to="/search" className={styles.navLink}>
            <FaSearch /> <span>Cerca</span>
          </Link>
          <Link to="/discover" className={styles.navLink}>
            <FaGlobe /> <span>Scopri</span>
          </Link>
          <Link to="/horizon" className={styles.navLink}>
            <FaPlayCircle /> <span>Horizon</span>
          </Link>

          <Link to="/rating-game" className={styles.navLink}>
            <FaGamepad /> <span>Games</span>
          </Link>

          {userId && (
            <>

              <Link to={`/profile/${userId}`} className={styles.navLink}>
                <FaUser /> <span>Profilo</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}

export default Navbar;
