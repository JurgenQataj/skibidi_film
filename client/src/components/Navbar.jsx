import React from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";
import { Home, Search, Compass, Tv2, Gamepad2, UserRound } from "lucide-react";
import { jwtDecode } from "jwt-decode";

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

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

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
          <Link to="/" className={`${styles.navLink} ${isActive("/") ? styles.navLinkActive : ""}`}>
            <Home size={20} strokeWidth={1.5} />
            <span>Feed</span>
          </Link>
          <Link to="/search" className={`${styles.navLink} ${isActive("/search") ? styles.navLinkActive : ""}`}>
            <Search size={20} strokeWidth={1.5} />
            <span>Cerca</span>
          </Link>
          <Link to="/discover" className={`${styles.navLink} ${isActive("/discover") ? styles.navLinkActive : ""}`}>
            <Compass size={20} strokeWidth={1.5} />
            <span>Scopri</span>
          </Link>
          <Link to="/horizon" className={`${styles.navLink} ${isActive("/horizon") ? styles.navLinkActive : ""}`}>
            <Tv2 size={20} strokeWidth={1.5} />
            <span>Horizon</span>
          </Link>
          <Link to="/rating-game" className={`${styles.navLink} ${isActive("/rating-game") ? styles.navLinkActive : ""}`}>
            <Gamepad2 size={20} strokeWidth={1.5} />
            <span>Games</span>
          </Link>

          {userId && (
            <>
              <Link to={`/profile/${userId}`} className={`${styles.navLink} ${location.pathname.startsWith("/profile") ? styles.navLinkActive : ""}`}>
                <UserRound size={20} strokeWidth={1.5} />
                <span>Profilo</span>
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

