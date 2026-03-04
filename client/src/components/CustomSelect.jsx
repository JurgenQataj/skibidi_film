import React, { useState, useRef, useEffect } from 'react';
import styles from './CustomSelect.module.css';

const CustomSelect = ({ options, value, onChange, placeholder = "Seleziona..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.id === value);
  const displayValue = selectedOption ? (selectedOption.name || selectedOption.label) : placeholder;

  return (
    <div className={styles.customSelectContainer} ref={selectRef}>
      <div 
        className={`${styles.selectHeader} ${isOpen ? styles.open : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); }}
        tabIndex={0}
        role="button"
      >
        <span>{displayValue}</span>
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}>▼</span>
      </div>
      
      {isOpen && (
        <ul className={styles.optionsList}>
          {options.map((option) => {
            const optValue = option.value !== undefined ? option.value : option.id;
            const optLabel = option.name || option.label;
            return (
              <li 
                key={optValue} 
                className={`${styles.optionItem} ${value === optValue ? styles.selected : ''}`}
                onClick={() => handleSelect(optValue)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(optValue); }}
                tabIndex={0}
                role="option"
                aria-selected={value === optValue}
              >
                {optLabel}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
