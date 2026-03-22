import React, { useRef, useState, useCallback } from "react";
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

  const [dynamicColors, setDynamicColors] = useState({ gradient: null, primary: null });
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

  // RGB → HSL conversion helper
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  };

  // Extract 2-3 vibrant, distinct colors from the poster via canvas pixel analysis
  const handleColorExtraction = useCallback((imagePath) => {
    if (!imagePath) return;
    const API_URL = import.meta.env.VITE_API_URL || "";
    const url = `${API_URL}/api/tmdb-img/w500${imagePath}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Downscale on canvas for faster processing
      const SCALE = 80;
      const canvas = document.createElement('canvas');
      canvas.width = SCALE;
      canvas.height = Math.round(SCALE * (img.naturalHeight / img.naturalWidth));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      // Collect all vivid pixels (high saturation, not too dark or too light)
      const vivid = [];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const [h, s, l] = rgbToHsl(r, g, b);
        // Keep only pixels that are colourful enough
        if (s > 25 && l > 12 && l < 88) {
          vivid.push({ r, g, b, h, s, l });
        }
      }

      if (vivid.length === 0) {
        setDynamicColors({ gradient: null, primary: null });
        return;
      }

      // Sort by saturation descending — most vivid first
      vivid.sort((a, b) => b.s - a.s);

      // Pick up to 3 colours that are hue-distinct (≥40° apart)
      const picked = [];
      const MIN_HUE_DIFF = 40;
      for (const px of vivid) {
        const tooClose = picked.some(p => {
          const diff = Math.abs(p.h - px.h);
          return Math.min(diff, 360 - diff) < MIN_HUE_DIFF;
        });
        if (!tooClose) {
          picked.push(px);
          if (picked.length === 3) break;
        }
      }

      // Boost each colour to make it pop (push towards more saturation)
      const boost = ({ r, g, b }) => {
        const avg = (r + g + b) / 3;
        const f = 1.8;
        return [
          Math.min(255, Math.round(avg + (r - avg) * f)),
          Math.min(255, Math.round(avg + (g - avg) * f)),
          Math.min(255, Math.round(avg + (b - avg) * f)),
        ];
      };

      const toHex = ([r, g, b]) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

      const colors = picked.map(p => boost(p));
      const [c1, c2, c3] = colors;

      // Build a full-page gradient covering 100% height
      const stop1 = c1 ? `rgba(${c1[0]},${c1[1]},${c1[2]},0.55) 0%` : '';
      const stop2 = c2 ? `rgba(${c2[0]},${c2[1]},${c2[2]},0.35) 30%` : '';
      const stop3 = c3 ? `rgba(${c3[0]},${c3[1]},${c3[2]},0.15) 60%` : '';
      const stops = [stop1, stop2, stop3].filter(Boolean).join(', ');
      const gradient = `linear-gradient(160deg, ${stops}, rgba(13,13,16,0) 90%)`;

      setDynamicColors({
        gradient,
        primary: toHex(c1 || colors[0]),
      });
    };
    img.onerror = () => {
      setDynamicColors({ gradient: null, primary: null });
    };
    img.src = url;
  }, []);


  if (loading) return <SkeletonWithLogo />;
  if (error) return <p className={styles.loading}>{error}</p>;
  if (!media) return <p className={styles.loading}>{labels.notFound}</p>;

  const trailer = getMainTrailer(media.videos);

  return (
    <div 
      className={styles.pageContainer}
      style={{
        ...(dynamicColors.gradient ? { '--dynamic-gradient': dynamicColors.gradient } : {}),
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
              onLoad={() => handleColorExtraction(media.backdrop_path || media.poster_path)}
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
