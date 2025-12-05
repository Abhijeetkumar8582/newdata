import React, { useEffect } from 'react';
import './DisplayImage.css';

/**
 * Display Image Component
 * Shows an image fullscreen - auto-closes after duration or persists until user closes
 */
const DisplayImage = ({ imageUrl, onClose, duration = null }) => {
  useEffect(() => {
    if (!imageUrl || !duration) return;

    // Auto-close after duration
    const timer = setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [imageUrl, duration, onClose]);

  if (!imageUrl) {
    return null;
  }

  const handleContainerClick = (e) => {
    // Only close if clicking on the backdrop, not the image itself
    if (e.target === e.currentTarget) {
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <div className="display-image-container" onClick={handleContainerClick}>
      <div className="display-image-wrapper">
        <img src={imageUrl} alt="Display" className="display-image" />
      </div>
      <button 
        className="display-image-close" 
        onClick={(e) => {
          e.stopPropagation();
          if (onClose) {
            onClose();
          }
        }}
        aria-label="Close image"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};

export default DisplayImage;

