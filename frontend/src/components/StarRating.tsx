import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  songId: string;
  currentRating: number | null;
  onRate: (songId: string, stars: number) => Promise<void>;
}

export default function StarRating({ songId, currentRating, onRate }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleRate = async (stars: number) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onRate(songId, stars);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="star-rating"
      onMouseLeave={() => setHoverRating(0)}
      title={currentRating ? `Rated ${currentRating} of 5 stars` : 'Click to rate 1-5 stars'}
      style={{ opacity: isUpdating ? 0.6 : 1 }}
    >
      {[1, 2, 3, 4, 5].map((starValue) => {
        const isFilled = (hoverRating || currentRating || 0) >= starValue;
        return (
          <span
            key={starValue}
            onClick={() => handleRate(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            style={{ display: 'inline-block', cursor: 'pointer' }}
          >
            <Star
              className="star-icon"
              size={17}
              fill={isFilled ? '#f59e0b' : 'none'}
              stroke={isFilled ? '#f59e0b' : '#4b5563'}
            />
          </span>
        );
      })}
      {currentRating ? (
        <span style={{ fontSize: '0.75rem', color: '#fbbf24', marginLeft: '0.25rem', fontFamily: 'monospace' }}>
          {currentRating}★
        </span>
      ) : (
        <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.25rem' }}>
          —
        </span>
      )}
    </div>
  );
}
