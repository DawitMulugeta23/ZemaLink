import "./Pages.css";

function Premium() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "Basic audio quality",
        "Limited skips",
        "Ads supported",
        "Basic playlist creation",
      ],
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "month",
      features: [
        "High quality audio",
        "Unlimited skips",
        "No ads",
        "Offline listening",
        "Create unlimited playlists",
        "Download songs",
      ],
      popular: true,
    },
    {
      name: "Family",
      price: "$14.99",
      period: "month",
      features: [
        "All Premium features",
        "Up to 6 accounts",
        "Family playlist",
        "Parental controls",
      ],
    },
  ];

  return (
    <div className="page-container">
      <div className="premium-hero">
        <h1 className="page-title">Choose Your Plan</h1>
        <p className="hero-subtitle">
          Listen to music in high quality with ZemaLink Premium
        </p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`glass-card pricing-card ${plan.popular ? "popular" : ""}`}
          >
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            <h3>{plan.name}</h3>
            <div className="price">
              <span className="price-amount">{plan.price}</span>
              <span className="price-period">/{plan.period}</span>
            </div>
            <ul className="features-list">
              {plan.features.map((feature, i) => (
                <li key={i}>✓ {feature}</li>
              ))}
            </ul>
            <button className="glass-btn pricing-btn">
              {plan.name === "Free" ? "Get Started" : "Upgrade Now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Premium;
