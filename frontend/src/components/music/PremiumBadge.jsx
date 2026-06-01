function CrownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 19h20v3H2v-3zM3.3 5.5l4.2 6.5L12 4l4.5 8 4.2-6.5L22 16H2l1.3-10.5z" />
    </svg>
  );
}

function StarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function PremiumBadge({ size = "md" }) {
  if (size === "sm") {
    return (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-gradient-to-br from-amber-400 via-amber-500 to-purple-600 shadow-sm shadow-amber-500/30"
        aria-label="Premium"
      >
        <StarIcon className="w-2.5 h-2.5 text-white" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-purple-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-amber-500/30 animate-glow">
      <CrownIcon className="w-3 h-3" />
      PREMIUM
    </span>
  );
}
