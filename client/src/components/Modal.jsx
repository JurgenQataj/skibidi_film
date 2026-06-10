import React from "react";
import styles from "./Modal.module.css";

function Modal({ isOpen, onClose, title, children, size }) {
  if (!isOpen) return null;

  const modalClass = `${styles.modal} ${size === "large" ? styles.modalLarge : ""}`;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            X
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
