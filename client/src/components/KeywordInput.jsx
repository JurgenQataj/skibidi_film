import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import styles from "./KeywordInput.module.css";

const KeywordInput = ({ selectedKeywords, onChange }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/movies/keywords/search?query=${encodeURIComponent(query)}`);
        setSuggestions(response.data.results || []);
      } catch (error) {
        console.error("Errore ricerca keywords:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query, API_URL]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelectKeyword = (keyword) => {
    if (!selectedKeywords.find(k => k.id === keyword.id)) {
      onChange([...selectedKeywords, keyword]);
    }
    setQuery("");
    setShowSuggestions(false);
  };

  const handleRemoveKeyword = (keywordId) => {
    onChange(selectedKeywords.filter(k => k.id !== keywordId));
  };

  return (
    <div className={styles.keywordInputWrapper} ref={wrapperRef}>
      <div className={styles.selectedKeywords}>
        {selectedKeywords.map(k => (
          <span key={k.id} className={styles.keywordTag}>
            {k.name}
            <button
              className={styles.removeTagBtn}
              onClick={() => handleRemoveKeyword(k.id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      
      <div className={styles.inputContainer}>
        <input
          type="text"
          className={styles.inputField}
          placeholder="Cerca parole chiave (es. zombie, alien)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
        />
        {loading && <span className={styles.loadingSpinner}>...</span>}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className={styles.suggestionsList}>
          {suggestions.map((keyword) => (
            <li
              key={keyword.id}
              className={styles.suggestionItem}
              onClick={() => handleSelectKeyword(keyword)}
            >
              {keyword.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default KeywordInput;
