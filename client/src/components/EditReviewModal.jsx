import React, { useState } from "react";
import axios from "axios";

function EditReviewModal({ review, onClose, onUpdate }) {
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment_text || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "";

      await axios.put(
        `${API_URL}/api/reviews/${review.id}`, // review object from formattedReviews has .id not ._id
        { rating, comment_text: comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onUpdate(); // Refresh parent
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Errore aggiornamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <div style={{
        background: "#222", color: "white", padding: "20px", borderRadius: "10px", width: "90%", maxWidth: "500px", border: "1px solid #444"
      }}>
        <h2 style={{marginTop:0}}>Modifica Recensione</h2>
        
        <form onSubmit={handleSubmit} style={{display:"flex", flexDirection:"column", gap:"15px"}}>
          <div>
            <label style={{display:"block", marginBottom:"5px"}}>Voto (0-10)</label>
            <input 
              type="number" step="0.1" min="0" max="10" 
              value={rating} 
              onChange={e => setRating(e.target.value)}
              style={{width:"100%", padding:"10px", borderRadius:"5px", border:"none"}}
            />
          </div>
          <div>
            <label style={{display:"block", marginBottom:"5px"}}>Commento</label>
            <textarea 
              value={comment} 
              onChange={e => setComment(e.target.value)}
              rows="4"
              style={{width:"100%", padding:"10px", borderRadius:"5px", border:"none", resize:"vertical"}}
            />
          </div>
          
          {error && <p style={{color:"red"}}>{error}</p>}

          <div style={{display:"flex", justifyContent:"flex-end", gap:"10px"}}>
            <button 
              type="button" 
              onClick={onClose}
              style={{padding:"10px 20px", borderRadius:"5px", border:"none", cursor:"pointer", background:"#555", color:"white"}}
            >
              Annulla
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                padding:"10px 20px", borderRadius:"5px", border:"none", cursor:"pointer", 
                background: loading ? "#cecece" : "#8a4baf", 
                color: "white", fontWeight: "bold"
              }}
            >
              {loading ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditReviewModal;
