import React from "react";
import MediaDetailPage from "../components/MediaDetailPage";
import styles from "../components/MediaDetailPage.module.css";

const MOVIE_LABELS = {
  notFound: "Film non trovato.",
  directorLabel: "Regia",
  runtimeLabel: "Durata",
  releaseDateLabel: "Data Uscita",
  recommendationsTitle: "Film Consigliati",
  alreadyReviewedMsg: "Hai già recensito questo film",
  addToListSuccess: "Film aggiunto alla lista!",
};

/**
 * Info box specifici per i film (Budget + Botteghino + Produttore).
 * Vengono iniettati dentro MediaDetailPage tramite la prop `extraInfoBoxes`.
 * Il componente riceve `media` come prop.
 */
function MovieExtraInfo({ media }) {
  const formatCurrency = (num) =>
    num > 0 ? `${num.toLocaleString("it-IT")} $` : "N/A";

  return (
    <>
      <div className={styles.infoBox}>
        <h4>Costo</h4>
        <p>{formatCurrency(media?.budget)}</p>
      </div>
      <div className={styles.infoBox}>
        <h4>Botteghino</h4>
        <p>{formatCurrency(media?.revenue)}</p>
      </div>
    </>
  );
}

function MovieDetailPage() {
  return (
    <MediaDetailPage
      mediaType="movie"
      labels={MOVIE_LABELS}
      ExtraInfoComponent={MovieExtraInfo}
    />
  );
}

export default MovieDetailPage;