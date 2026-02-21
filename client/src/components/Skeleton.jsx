import React from "react";
import styles from "./Skeleton.module.css";

/**
 * Skeleton universale — si adatta alla dimensione del contenitore.
 * Usa width/height del parent per default.
 * Props: style, className
 */
const Skeleton = ({ style, className }) => (
  <div
    className={`${styles.skeleton} ${className || ""}`}
    style={style}
  />
);

export default Skeleton;

/* ── Compositi pronti all'uso ──────────────── */

/** Card film: proporzione 2:3 + barra titolo */
export const SkeletonMovieCard = () => (
  <div className={styles.movieCard}>
    <Skeleton className={styles.moviePoster} />
    <Skeleton className={styles.movieTitle} />
  </div>
);

/** Riga persona (ricerca) */
export const SkeletonPersonRow = () => (
  <div className={styles.personRow}>
    <Skeleton className={styles.circle44} />
    <div className={styles.lines}>
      <Skeleton className={styles.lineLong} />
      <Skeleton className={styles.lineShort} />
    </div>
  </div>
);

/** Card utente (Discover) */
export const SkeletonUserCard = () => (
  <div className={styles.userCard}>
    <Skeleton className={styles.circle64} />
    <Skeleton className={styles.lineMed} />
    <Skeleton className={styles.lineShort} />
  </div>
);

/** Card lista */
export const SkeletonListCard = () => (
  <div className={styles.listCard}>
    <Skeleton className={styles.square28} />
    <div className={styles.lines}>
      <Skeleton className={styles.lineLong} />
      <Skeleton className={styles.lineShort} />
    </div>
  </div>
);
