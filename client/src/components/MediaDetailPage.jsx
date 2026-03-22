import React, { useRef, useState, useCallback } from "react";
import { FastAverageColor } from "fast-average-color";
import { Link } from "react-router-dom";
import styles from "./MediaDetailPage.module.css";
import AddReviewForm from "./AddReviewForm";
import MovieCard from "./MovieCard";
import EditReviewModal from "./EditReviewModal";
import { SkeletonWithLogo } from "./Skeleton";
import { FaRegHeart, FaHeart, FaRegComment } from "react-icons/fa";
import { useMediaDetail } from "../hooks/useMediaDetail";

// ─── Utility helpers (puri, nessuno stato) ─────────────────────────────────

const POSTER_BASE = "https://image.tmdb.org/t/p/";

export const formatCurrency = (num) =>
  num > 0 ? `${num.toLocaleString("it-IT")} $` : "N/A";

export const formatRuntime = (runtime) => {
  if (!runtime || runtime === 0) return "N/A";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export const formatReleaseDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatGenres = (genres) => {
  if (!genres || genres.length === 0) return "N/A";
  return genres
    .slice(0, 3)
    .map((g) => g.name)
    .join(", ");
};

export const formatRating = (rating) => {
  if (!rating || rating === 0) return "N/A";
  return rating.toFixed(1);
};

const getCountryFlagEmoji = (countryCode) => {
  if (!countryCode) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

export const formatCompanies = (companies, mode) => {
  if (!companies || companies.length === 0) return "N/A";
  return companies.slice(0, 2).map((c, index, arr) => (
    <span key={c.id}>
      <Link
        to={`/search?mode=${mode}&with_companies=${c.id}`}
        className={styles.personLink}
      >
        {c.name}
      </Link>
      {index < arr.length - 1 ? ", " : ""}
    </span>
  ));
};

export const formatCountriesWithFlags = (countries, mode) => {
  if (!countries || countries.length === 0) return "N/A";
  return countries.map((c, index, arr) => {
    const flag = getCountryFlagEmoji(c.iso_3166_1);
    return (
      <span key={c.iso_3166_1}>
        <Link
          to={`/search?mode=${mode}&with_origin_country=${c.iso_3166_1}`}
          className={styles.personLink}
        >
          {flag ? `${flag} ${c.name}` : c.name}
        </Link>
        {index < arr.length - 1 ? ", " : ""}
      </span>
    );
  });
};

export const getMainTrailer = (videos) => {
  if (!videos || videos.length === 0) return null;
  return (
    videos.find(
      (v) =>
        v.type === "Trailer" &&
        v.site === "YouTube" &&
        (v.name.includes("Official") || v.name.includes("Trailer"))
    ) ||
    videos.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    videos[0]
  );
};

// ─── Componente principale condiviso ──────────────────────────────────────

/**
 * @param {"movie"|"tv"} mediaType
 * @param {object}  labels  - Testi specifici per movie/tv
 *   labels.notFound        - es. "Film non trovato." / "Serie TV non trovata."
 *   labels.directorLabel   - es. "Regia" / "Regia/Creatore"
 *   labels.runtimeLabel    - es. "Durata" / "Durata Episodi"
 *   labels.releaseDateLabel- es. "Data Uscita" / "Prima Messa In Onda"
 *   labels.recommendationsTitle - es. "Film Consigliati" / "Serie TV Consigliate"
 *   labels.alreadyReviewedMsg   - es. "Hai già recensito questo film" / "...questa serie"
 *   labels.addToListSuccess     - es. "Film aggiunto alla lista!" / "Serie TV aggiunta alla lista!"
 * @param {React.ReactNode|null} extraInfoBoxes - infoBox aggiuntivi specifici del tipo
 */
function MediaDetailPage({ mediaType, labels, ExtraInfoComponent }) {
  const {
    tmdbId,
    media,
    recommendations,
    skibidiData,
    loading,
    error,
    loggedInUserId,
    hasUserReviewed,
    isInWatchlist,
    userLists,
    showLists,
    setShowLists,
    activeComments,
    commentText,
    setCommentText,
    editingReview,
    setEditingReview,
    fetchData,
    handleDeleteReview,
    handleWatchlistToggle,
    handleAddToList,
    handleReaction,
    toggleComments,
    handleAddComment,
    handleDeleteComment,
  } = useMediaDetail(mediaType);

  const [dynamicColors, setDynamicColors] = useState({ bg: null, primary: null });
  const commentInputRef = useRef(null);

  const handleReplyClick = (username) => {
    const newText = `@${username} `;
    setCommentText(newText);
    setTimeout(() => {
      const input = commentInputRef.current;
      if (input) {
        input.focus();
        input.setSelectionRange(newText.length, newText.length);
      }
    }, 100);
  };

  // Extract the dominant color via the express backend proxy API (fixes CORS in production)
  const handleColorExtraction = useCallback((posterPath) => {
    if (!posterPath) return;
    const fac = new FastAverageColor();
    const API_URL = import.meta.env.VITE_API_URL || "";
    const proxyUrl = `${API_URL}/api/tmdb-img/w92${posterPath}`;
    
    fac.getColorAsync(proxyUrl)
      .then(color => {
        const [r, g, b] = color.value;
        const bgRgba = `rgba(${r}, ${g}, ${b}, 0.18)`;
        setDynamicColors({ bg: bgRgba, primary: color.hex });
      })
      .catch(e => {
        console.warn("FastAverageColor error:", e);
        setDynamicColors({ bg: null, primary: null });
      });
  }, []);

  if (loading) return <SkeletonWithLogo />;
  if (error) return <p className={styles.loading}>{error}</p>;
  if (!media) return <p className={styles.loading}>{labels.notFound}</p>;

  const trailer = getMainTrailer(media.videos);

  return (
    <div 
      className={styles.pageContainer}
      style={{
        ...(dynamicColors.bg ? { '--dynamic-bg': dynamicColors.bg } : {}),
        ...(dynamicColors.primary ? { '--dynamic-primary': dynamicColors.primary } : {})
      }}
    >
      {/* ── HEADER ── */}
      <div
        className={styles.header}
        style={{
          backgroundImage: `url(${POSTER_BASE}w1280${media.backdrop_path})`,
        }}
      >
        <div className={styles.headerOverlay}>
          <div className={styles.headerContent}>
            <img
              src={
                media.poster_path
                  ? `${POSTER_BASE}w500${media.poster_path}`
                  : "https://placehold.co/300x450/1a1a2e/666?text=No+Image"
              }
              alt={`Locandina di ${media.title}`}
              className={styles.poster}
              onLoad={() => handleColorExtraction(media.poster_path)}
            />
            <div className={styles.details}>
              <h1 className={styles.title}>
                {media.title}{" "}
                {media.release_date
                  ? `(${new Date(media.release_date).getFullYear()})`
                  : ""}
              </h1>
              <p className={styles.tagline}>{media.tagline}</p>

              <div className={styles.director}>
                <strong>Regia:</strong>{" "}
                {media.director?.name ? (
                  <Link
                    to={`/person/${encodeURIComponent(media.director.name)}`}
                    className={styles.personLink}
                  >
                    {media.director.name}
                  </Link>
                ) : (
                  <span>Non disponibile</span>
                )}
              </div>

              {loggedInUserId && (
                <div className={styles.actions}>
                  <button
                    onClick={handleWatchlistToggle}
                    className={styles.actionButton}
                  >
                    {isInWatchlist ? "✔ Nella Watchlist" : "+ Watchlist"}
                  </button>
                  <button
                    onClick={() => setShowLists(!showLists)}
                    className={styles.actionButton}
                  >
                    Aggiungi a Lista
                  </button>
                  {showLists && (
                    <div className={styles.listsDropdown}>
                      {userLists.length > 0 ? (
                        userLists.map((list) => (
                          <button
                            key={list._id}
                            onClick={() =>
                              handleAddToList(list._id, labels.addToListSuccess)
                            }
                            className={styles.listButton}
                          >
                            {list.title}
                          </button>
                        ))
                      ) : (
                        <p>Non hai ancora creato liste.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENUTO PRINCIPALE ── */}
      <div className={styles.mainContent}>
        <div className={styles.overviewSection}>
          <h3>Trama</h3>
          <p className={styles.overview}>{media.overview}</p>
        </div>

        {loggedInUserId && !hasUserReviewed && (
          <div className={styles.reviewFormSection}>
            <AddReviewForm
              tmdbId={tmdbId}
              mediaType={mediaType}
              onReviewAdded={fetchData}
            />
          </div>
        )}

        {/* ── INFO BOX ── */}
        <div className={styles.infoSection}>
          {/* Regia */}
          <div className={styles.infoBox}>
            <h4>{labels.directorLabel}</h4>
            <p>
              {media.director?.name ? (
                <Link
                  to={`/person/${encodeURIComponent(media.director.name)}`}
                  className={styles.personLink}
                >
                  {media.director.name}
                </Link>
              ) : (
                "Non disponibile"
              )}
            </p>
          </div>

          {/* Durata */}
          <div className={styles.infoBox}>
            <h4>{labels.runtimeLabel}</h4>
            <p>{formatRuntime(media.runtime)}</p>
          </div>

          {/* Data */}
          <div className={styles.infoBox}>
            <h4>{labels.releaseDateLabel}</h4>
            <p>{formatReleaseDate(media.release_date)}</p>
          </div>

          {/* Rating TMDB */}
          <div className={styles.infoBox}>
            <h4>Rating TMDB</h4>
            <p>{formatRating(media.vote_average)}</p>
          </div>

          {/* Genere */}
          <div className={styles.infoBox}>
            <h4>Genere</h4>
            <p>{formatGenres(media.genres)}</p>
          </div>

          {/* Info box extra specifici del tipo (es. Stagioni/Episodi per TV, Budget/Botteghino per Movie) */}
          {ExtraInfoComponent && <ExtraInfoComponent media={media} />}

          {/* Produttore */}
          <div className={styles.infoBox}>
            <h4>Produttore</h4>
            <p>{media.producer?.name || "Non disponibile"}</p>
          </div>

          {/* Studi */}
          <div className={styles.infoBox}>
            <h4>Studi</h4>
            <p>{formatCompanies(media.production_companies, mediaType)}</p>
          </div>

          {/* Paese */}
          <div className={styles.infoBox}>
            <h4>Paese</h4>
            <p>{formatCountriesWithFlags(media.production_countries, mediaType)}</p>
          </div>

          {/* Lingua */}
          <div className={styles.infoBox}>
            <h4>Lingua</h4>
            <p>{media.original_language?.toUpperCase()}</p>
          </div>

          {/* Saga */}
          {media.collection && (
            <div className={styles.infoBox}>
              <h4>Saga</h4>
              <p>
                <Link
                  to={`/collection/${media.collection.id}`}
                  className={styles.personLink}
                >
                  {media.collection.name.replace(" - Collection", "")}
                </Link>
              </p>
            </div>
          )}

          {/* Dove Vederlo */}
          {media.watch_providers?.flatrate?.length > 0 && (
            <div className={styles.infoBox}>
              <h4>Dove Vederlo</h4>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
                {media.watch_providers.flatrate.map((provider) => {
                  const logoRender = (
                    <img
                      key={provider.provider_id}
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt={provider.provider_name}
                      title={provider.provider_name}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "6px",
                        cursor: media.watch_providers.link ? "pointer" : "default",
                      }}
                    />
                  );
                  return media.watch_providers.link ? (
                    <a
                      key={provider.provider_id}
                      href={media.watch_providers.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {logoRender}
                    </a>
                  ) : (
                    logoRender
                  );
                })}
              </div>
            </div>
          )}

          {/* Trailer */}
          {trailer && (
            <div className={styles.infoBox}>
              <h4>Trailer</h4>
              <p>
                <a
                  href={`https://youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.trailerLink}
                >
                  ▶️ YouTube
                </a>
              </p>
            </div>
          )}
        </div>

        {/* ── CAST ── */}
        <div className={styles.castSection}>
          <h2>Cast Principale</h2>
          <div className={styles.castGrid}>
            {media.cast?.map((actor) => (
              <div key={actor.id} className={styles.actorCard}>
                <img
                  src={
                    actor.profile_path
                      ? `${POSTER_BASE}w342${actor.profile_path}`
                      : "https://placehold.co/300x450/1a1a2e/666?text=No+Image"
                  }
                  alt={actor.name}
                />
                <Link
                  to={`/person/${encodeURIComponent(actor.name)}`}
                  className={styles.personLink}
                >
                  <strong>{actor.name}</strong>
                </Link>
                <span>{actor.character}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RACCOMANDAZIONI ── */}
        {recommendations.length > 0 && (
          <div className={styles.castSection}>
            <h2>{labels.recommendationsTitle}</h2>
            <div className={styles.recommendationsGrid}>
              {recommendations.map((rec) => (
                <div key={rec.id} className={styles.movieCardWrapper}>
                  <MovieCard movie={rec} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RECENSIONI ── */}
        <div className={styles.reviewsSection}>
          {loggedInUserId && hasUserReviewed && (
            <div className={styles.alreadyReviewedMessage}>
              <h3>{labels.alreadyReviewedMsg}</h3>
            </div>
          )}
          <h2 className={styles.reviewsTitle}>
            Recensioni della Community
            <span className={styles.reviewStats}>
              {skibidiData.averageRating} ★ ({skibidiData.reviewCount} voti)
            </span>
          </h2>
          <div className={styles.reviewsList}>
            {skibidiData.reviews?.map((review) => (
              <div key={review.id} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <Link
                    to={`/profile/${review.user_id}`}
                    className={styles.authorLink}
                  >
                    <strong className={styles.reviewAuthor}>
                      {review.username}
                    </strong>
                  </Link>
                  <div>
                    <span className={styles.reviewRating}>
                      {review.rating}/10
                    </span>
                    {loggedInUserId === review.user_id && (
                      <div className={styles.manageButtons}>
                        <button
                          onClick={() => setEditingReview(review)}
                          className={styles.editButton}
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className={styles.deleteButton}
                        >
                          Elimina
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className={styles.reviewComment}>{review.comment_text}</p>
                <div className={styles.reviewActions}>
                  <div className={styles.instBtnGroup}>
                    {(() => {
                      const rawReactions = review.user_reactions || [];
                      const hasLoved = rawReactions.some(
                        (r) =>
                          r.user?.toString() === loggedInUserId &&
                          r.reaction_type === "love"
                      );
                      const reactionCount = review.reactions?.love || 0;
                      return (
                        <button
                          onClick={() => handleReaction(review.id, "love")}
                          title="Love"
                          className={`${styles.instBtn} ${hasLoved ? styles.instBtnLiked : ""}`}
                        >
                          {hasLoved ? (
                            <FaHeart color="#e50914" />
                          ) : (
                            <FaRegHeart />
                          )}
                          <span style={hasLoved ? { color: "#e50914" } : {}}>
                            {reactionCount}
                          </span>
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => toggleComments(review.id)}
                      className={styles.instBtn}
                    >
                      <FaRegComment />
                      <span>{review.comment_count || 0}</span>
                    </button>
                  </div>
                </div>
                {activeComments.reviewId === review.id && (
                  <div className={styles.commentsSection}>
                    {activeComments.comments
                      .filter((c) => c.user)
                      .map((comment) => (
                        <div key={comment._id} className={styles.commentItem}>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", flex: 1 }}>
                            <Link
                              to={`/profile/${comment.user._id}`}
                              className={styles.authorLink}
                              style={{ marginRight: "5px" }}
                            >
                              <strong>{comment.user.username}:</strong>
                            </Link>
                            <span> {comment.comment_text}</span>
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginLeft: "auto", fontSize: "0.8rem", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleReplyClick(comment.user.username)}
                              style={{ background: "none", border: "none", color: "var(--dynamic-primary, #aaa)", cursor: "pointer", padding: 0 }}
                            >
                              Rispondi
                            </button>
                            {loggedInUserId === comment.user._id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment._id)}
                                className={styles.deleteCommentButton}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    <form
                      className={styles.commentForm}
                      onSubmit={(e) => handleAddComment(e, review.id)}
                    >
                      <input
                        ref={commentInputRef}
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Rispondi... usa @ per taggare"
                      />
                      <button type="submit">Invia</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MODALE MODIFICA ── */}
      {editingReview && (
        <EditReviewModal
          review={editingReview}
          onClose={() => setEditingReview(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}

export default MediaDetailPage;
