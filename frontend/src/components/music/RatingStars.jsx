import { useState, useCallback } from "react";

function StarOutline({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function StarFilled({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function StarHalf({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <defs>
        <clipPath id="halfClip">
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-surface-300 dark:text-surface-600"
      />
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="currentColor"
        clipPath="url(#halfClip)"
        className="text-amber-400"
      />
    </svg>
  );
}

const SIZE_MAP = {
  sm: { star: "w-3 h-3 sm:w-3.5 sm:h-3.5", text: "text-[10px] sm:text-xs", gap: "gap-0.5" },
  md: { star: "w-4 h-4 sm:w-5 sm:h-5", text: "text-xs sm:text-sm", gap: "gap-0.5 sm:gap-1" },
  lg: { star: "w-5 h-5 sm:w-6 sm:h-6", text: "text-sm sm:text-base", gap: "gap-1" },
};

function getStarType(value, index) {
  const starIndex = index + 1;
  if (value >= starIndex) return "full";
  if (value >= starIndex - 0.5) return "half";
  return "empty";
}

export default function RatingStars({ rating = 0, size = "md", interactive = false, onRate }) {
  const [hoverRating, setHoverRating] = useState(0);

  const normalizedRating = Math.max(0, Math.min(5, parseFloat(rating) || 0));
  const displayRating = interactive && hoverRating > 0 ? hoverRating : normalizedRating;

  const { star: starSize, text: textSize, gap } = SIZE_MAP[size] || SIZE_MAP.md;

  const handleClick = useCallback(
    (value) => {
      if (interactive && onRate) {
        onRate(value);
      }
    },
    [interactive, onRate],
  );

  const handleMouseEnter = useCallback((value) => {
    if (interactive) setHoverRating(value);
  }, [interactive]);

  const handleMouseLeave = useCallback(() => {
    if (interactive) setHoverRating(0);
  }, [interactive]);

  const starClass = `inline-block flex-shrink-0 ${starSize} ${
    interactive ? "cursor-pointer transition-transform hover:scale-110" : ""
  }`;

  return (
    <div
      className={`inline-flex items-center ${gap}`}
      role="img"
      aria-label={`Rating: ${normalizedRating.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const type = getStarType(displayRating, index);
        const value = index + 1;
        return (
          <span
            key={index}
            onClick={() => handleClick(value)}
            onMouseEnter={() => handleMouseEnter(value)}
            onMouseLeave={handleMouseLeave}
            className={`${starClass} ${
              type === "full"
                ? "text-amber-400"
                : type === "half"
                  ? "text-amber-400"
                  : "text-surface-300 dark:text-surface-600"
            }`}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? `${value} star${value !== 1 ? "s" : ""}` : undefined}
            onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") handleClick(value); } : undefined}
          >
            {type === "full" ? (
              <StarFilled className="w-full h-full" />
            ) : type === "half" ? (
              <StarHalf className="w-full h-full" />
            ) : (
              <StarOutline className="w-full h-full" />
            )}
          </span>
        );
      })}
      <span className={`ml-1 ${textSize} text-surface-500 dark:text-surface-400 tabular-nums font-medium`}>
        {normalizedRating.toFixed(1)}
      </span>
    </div>
  );
}
