function Background({ children }) {
  return (
    <div className="relative min-h-screen">
      {/* Background Image with Responsive Fit */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/assets/images/default-cover.svg')",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
        }}
      >
        {/* Responsive overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30 md:bg-black/20 lg:bg-black/15"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default Background;
