import React, { useState, useRef, useEffect } from 'react';
import styles from './CustomSelect.module.css';

const CustomSelect = ({ options, value, onChange, placeholder = "Seleziona...", multiple = false }) => {
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
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const newValue = arr.includes(optionValue)
        ? arr.filter(v => v !== optionValue)
        : [...arr, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  let displayValue = placeholder;
  if (multiple) {
    const selectedOptions = options.filter(opt => {
      const optValue = opt.value !== undefined ? opt.value : opt.id;
      return Array.isArray(value) && value.includes(optValue);
    });
    if (selectedOptions.length > 0) {
      displayValue = selectedOptions.map(opt => opt.name || opt.label).join(", ");
    }
  } else {
    const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.id === value);
    if (selectedOption) {
      displayValue = selectedOption.name || selectedOption.label;
    }
  }

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
            const isSelected = multiple
              ? (Array.isArray(value) && value.includes(optValue))
              : value === optValue;

            return (
              <li 
                key={optValue} 
                className={`${styles.optionItem} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleSelect(optValue)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(optValue); }}
                tabIndex={0}
                role="option"
                aria-selected={isSelected}
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
