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
      backgroundColor: "rgba(0, 0, 0, 0.6)", 
      backdropFilter: "blur(5px)",
      WebkitBackdropFilter: "blur(5px)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <div style={{
        background: "rgba(20, 15, 30, 0.6)", 
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        color: "white", padding: "24px", borderRadius: "16px", 
        width: "90%", maxWidth: "500px", 
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
      }}>
        <h2 style={{marginTop:0, marginBottom: "20px", fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.02em"}}>Modifica Recensione</h2>
        
        <form onSubmit={handleSubmit} style={{display:"flex", flexDirection:"column", gap:"20px"}}>
          <div>
            <label style={{display:"block", marginBottom:"8px", fontSize:"0.9rem", color:"#ccc"}}>Voto (0-10)</label>
            <input 
              type="number" step="0.1" min="0" max="10" 
              value={rating} 
              onChange={e => setRating(e.target.value)}
              style={{
                width:"100%", padding:"12px 14px", borderRadius:"12px", 
                border:"1px solid rgba(255, 255, 255, 0.06)", background:"rgba(255, 255, 255, 0.04)",
                color: "white", outline: "none", fontSize: "1rem", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", boxSizing: "border-box", transition: "all 0.2s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(138, 75, 175, 0.8)";
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                e.target.style.boxShadow = "0 0 0 4px rgba(138, 75, 175, 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.06)";
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
          <div>
            <label style={{display:"block", marginBottom:"8px", fontSize:"0.9rem", color:"#ccc"}}>Commento</label>
            <textarea 
              value={comment} 
              onChange={e => setComment(e.target.value)}
              rows="4"
              style={{
                width:"100%", padding:"12px 14px", borderRadius:"12px", 
                border:"1px solid rgba(255, 255, 255, 0.06)", background:"rgba(255, 255, 255, 0.04)",
                color: "white", outline: "none", resize:"vertical", fontSize: "1rem", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", boxSizing: "border-box", minHeight: "80px", transition: "all 0.2s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(138, 75, 175, 0.8)";
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                e.target.style.boxShadow = "0 0 0 4px rgba(138, 75, 175, 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.06)";
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
          
          {error && <p style={{color:"#ff8a8a", margin: "-10px 0 0"}}>{error}</p>}

          <div style={{display:"flex", justifyContent:"flex-end", gap:"12px", marginTop: "10px"}}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding:"12px 24px", borderRadius:"12px", border:"none", cursor:"pointer", 
                background:"rgba(255, 255, 255, 0.1)", color:"white", transition: "background 0.2s",
                fontSize: "1rem", fontWeight: "500"
              }}
              onMouseOver={(e) => e.target.style.background = "rgba(255, 255, 255, 0.15)"}
              onMouseOut={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
            >
              Annulla
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                padding:"12px 24px", borderRadius:"10px", border:"none", cursor:"pointer", 
                background: loading ? "#cecece" : "linear-gradient(135deg, var(--primary-color), #5c2d7e)", 
                color: "white", fontWeight: "600", fontSize: "0.95rem", letterSpacing: "0.3px", transition: "all 0.2s ease", fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
              }}
              onMouseOver={(e) => {
                if(!loading) {
                  e.target.style.opacity = "0.9";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 15px rgba(138, 75, 175, 0.4)";
                }
              }}
              onMouseOut={(e) => {
                if(!loading) {
                  e.target.style.opacity = "1";
                  e.target.style.transform = "none";
                  e.target.style.boxShadow = "none";
                }
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
