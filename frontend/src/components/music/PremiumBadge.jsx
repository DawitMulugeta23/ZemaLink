function PremiumBadge({ price, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/90 to-orange-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow ${className}`}
    >
      <span>PRO</span>
      {price != null && price > 0 && (
        <span className="opacity-90">${Number(price).toFixed(2)}</span>
      )}
    </span>
  );
}

export default PremiumBadge;
