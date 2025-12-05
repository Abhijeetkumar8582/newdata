import React from 'react';
import './HeroCard.css';

/**
 * Hero Card Component
 * Displays Microsoft Bot Framework hero cards and image attachments
 */
const HeroCard = ({ card, onSelect }) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(card);
    }
  };

  // Handle image URL format (direct image attachment)
  const imageUrl = card.url || (card.images && card.images.length > 0 ? card.images[0].url : null);

  return (
    <div className="hero-card" onClick={handleClick}>
      {imageUrl && (
        <div className="hero-card-image">
          <img src={imageUrl} alt={card.title || 'Card image'} />
        </div>
      )}
      <div className="hero-card-content">
        {card.title && <h3 className="hero-card-title">{card.title}</h3>}
        {card.subtitle && <p className="hero-card-subtitle">{card.subtitle}</p>}
        {card.text && <p className="hero-card-text">{card.text}</p>}
        {card.buttons && card.buttons.length > 0 && (
          <div className="hero-card-buttons">
            {card.buttons.map((button, index) => (
              <button
                key={index}
                className="hero-card-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelect) {
                    onSelect({ ...card, selectedButton: button });
                  }
                }}
              >
                {button.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroCard;

