import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

/**
 * Hook condiviso per la pagina di dettaglio film/serie TV.
 * @param {"movie"|"tv"} mediaType - Il tipo di media
 */
export function useMediaDetail(mediaType) {
  const { tmdbId } = useParams();
  const navigate = useNavigate();

  const [media, setMedia] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [skibidiData, setSkibidiData] = useState({
    reviews: [],
    averageRating: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [userLists, setUserLists] = useState([]);
  const [showLists, setShowLists] = useState(false);
  const [activeComments, setActiveComments] = useState({
    reviewId: null,
    comments: [],
  });
  const [commentText, setCommentText] = useState("");
  const [editingReview, setEditingReview] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "";
  const apiBasePath = mediaType === "movie" ? "movies" : "tv";

  const fetchData = useCallback(async () => {
    if (!tmdbId || tmdbId === "undefined") {
      navigate("/");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const userId = token ? jwtDecode(token).user.id : null;
      setLoggedInUserId(userId);

      const mediaPromise = axios.get(`${API_URL}/api/${apiBasePath}/${tmdbId}`);
      const reviewsPromise = axios.get(
        `${API_URL}/api/reviews/movie/${tmdbId}?mediaType=${mediaType}`
      );
      const promises = [mediaPromise, reviewsPromise];

      if (userId) {
        promises.push(
          axios.get(`${API_URL}/api/reviews/status/${tmdbId}?mediaType=${mediaType}`, { headers })
            .catch(() => null)
        );
        promises.push(
          axios.get(`${API_URL}/api/watchlist/status/${tmdbId}?mediaType=${mediaType}`, { headers })
            .catch(() => null)
        );
        promises.push(
          axios.get(`${API_URL}/api/users/${userId}/lists`, { headers })
            .catch(() => null)
        );
      }

      const results = await Promise.all(promises);
      const mediaData = results[0].data;

      setMedia(mediaData);

      if (mediaData && Array.isArray(mediaData.recommendations)) {
        setRecommendations(mediaData.recommendations);
      } else {
        setRecommendations([]);
      }

      setSkibidiData(results[1].data);

      if (userId && results.length > 2) {
        setHasUserReviewed(results[2]?.data?.hasReviewed || false);
        setIsInWatchlist(results[3]?.data?.isInWatchlist || false);
        const fetchedLists = results[4]?.data || [];
        setUserLists(fetchedLists.filter(list => list._id !== "watchlist"));
      }
    } catch (err) {
      console.error("Errore nel caricamento dati:", err);
      setError("Impossibile caricare i dati.");
    } finally {
      setLoading(false);
    }
  }, [tmdbId, API_URL, navigate, apiBasePath, mediaType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Sei sicuro di voler eliminare la tua recensione?"))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (error) {
      alert("Errore durante l'eliminazione della recensione.");
    }
  };

  const handleWatchlistToggle = async () => {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (isInWatchlist) {
        await axios.delete(`${API_URL}/api/watchlist/${tmdbId}?mediaType=${mediaType}`, config);
      } else {
        await axios.post(`${API_URL}/api/watchlist`, { tmdbId, mediaType }, config);
      }
      setIsInWatchlist(!isInWatchlist);
    } catch (error) {
      alert("Errore nell'aggiornamento della watchlist.");
    }
  };

  const handleAddToList = async (listId, successMessage) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_URL}/api/lists/${listId}/movies`,
        { tmdbId, mediaType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(successMessage);
      setShowLists(false);
    } catch (error) {
      alert(
        error.response?.data?.message || "Errore durante l'aggiunta alla lista."
      );
    }
  };

  const handleReaction = async (reviewId, reactionType) => {
    const token = localStorage.getItem("token");
    try {
      const resp = await axios.post(
        `${API_URL}/api/reactions/reviews/${reviewId}`,
        { reaction_type: reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSkibidiData((prev) => ({
        ...prev,
        reviews: prev.reviews.map((r) =>
          r.id === reviewId
            ? { ...r, reactions: resp.data.reactions, user_reactions: resp.data.reactions }
            : r
        ),
      }));
    } catch (error) {
      alert("Errore durante l'invio della reazione.");
    }
  };

  const toggleComments = async (reviewId) => {
    if (activeComments.reviewId === reviewId) {
      setActiveComments({ reviewId: null, comments: [] });
    } else {
      try {
        const response = await axios.get(
          `${API_URL}/api/comments/review/${reviewId}`
        );
        setActiveComments({ reviewId, comments: response.data });
      } catch (error) {
        console.error("Errore caricamento commenti:", error);
      }
    }
  };

  const handleAddComment = async (e, reviewId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/comments/review/${reviewId}`,
        { comment_text: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      setActiveComments({ reviewId, comments: response.data || [] });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Errore");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo commento?"))
      return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `${API_URL}/api/comments/review/${activeComments.reviewId}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const response = await axios.get(
        `${API_URL}/api/comments/review/${activeComments.reviewId}`
      );
      setActiveComments({
        reviewId: activeComments.reviewId,
        comments: response.data || [],
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Errore");
    }
  };

  return {
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
  };
}
