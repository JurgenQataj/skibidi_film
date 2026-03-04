import React from "react";
import MediaDetailPage from "../components/MediaDetailPage";
import styles from "../components/MediaDetailPage.module.css";

const TV_LABELS = {
  notFound: "Serie TV non trovata.",
  directorLabel: "Regia/Creatore",
  runtimeLabel: "Durata Episodi",
  releaseDateLabel: "Prima Messa In Onda",
  recommendationsTitle: "Serie TV Consigliate",
  alreadyReviewedMsg: "Hai già recensito questa serie",
  addToListSuccess: "Serie TV aggiunta alla lista!",
};

/**
 * Info box specifici per le serie TV (Stato + Stagioni + Episodi).
 * Il componente riceve `media` come prop.
 */
function TvExtraInfo({ media }) {
  return (
    <>
      <div className={styles.infoBox}>
        <h4>Stato</h4>
        <p>{media?.status || "Non disponibile"}</p>
      </div>
      <div className={styles.infoBox}>
        <h4>Stagioni</h4>
        <p>{media?.number_of_seasons || "N/A"}</p>
      </div>
      <div className={styles.infoBox}>
        <h4>Episodi</h4>
        <p>{media?.number_of_episodes || "N/A"}</p>
      </div>
    </>
  );
}

function TvShowDetailPage() {
  return (
    <MediaDetailPage
      mediaType="tv"
      labels={TV_LABELS}
      ExtraInfoComponent={TvExtraInfo}
    />
  );
}

export default TvShowDetailPage;