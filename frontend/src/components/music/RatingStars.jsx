import { useEffect, useState } from "react";

function RatingStars({ songId, rating: propRating, likesCount, playsCount }) {
  // Convert rating to number safely
  const [rating, setRating] = useState(() => {
    const num = parseFloat(propRating);
    return isNaN(num) ? 0 : num;
  });

  useEffect(() => {
    const num = parseFloat(propRating);
    setRating(isNaN(num) ? 0 : num);
  }, [propRating]);

  const getStarIcon = (starValue) => {
    const isFilled = rating >= starValue;
    const isHalfFilled = rating > starValue - 0.5 && rating < starValue;
    
    if (isHalfFilled) {
      return (
        <div key={starValue} className="relative inline-block">
          <svg className="w-4 h-4 text-gray-400 fill-none" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <svg className="w-4 h-4 text-yellow-400 fill-yellow-400 absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      );
    }
    
    return (
      <svg
        key={starValue}
        className={`w-4 h-4 ${isFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 fill-none'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  };

  // Ensure counts are numbers
  const safePlaysCount = typeof playsCount === 'number' ? playsCount : parseInt(playsCount) || 0;
  const safeLikesCount = typeof likesCount === 'number' ? likesCount : parseInt(likesCount) || 0;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => getStarIcon(star))}
        <span className="text-xs text-white/50 ml-1">({rating.toFixed(1)})</span>
      </div>
      {(safePlaysCount > 0 || safeLikesCount > 0) && (
        <p className="text-[10px] text-white/40">
          Based on {safePlaysCount.toLocaleString()} plays • {safeLikesCount} likes
        </p>
      )}
    </div>
  );
}

export default RatingStars;