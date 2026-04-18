import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>🎵 ZemaLink</h3>
          <p>Premium music streaming platform</p>
        </div>
        <div className="footer-section">
          <h4>Quick Links</h4>
          <a href="#">About</a>
          <Link to="/#contact">Contact</Link>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
        <div className="footer-section">
          <h4>Follow Us</h4>
          <div className="social-links">
            <a href="#">📘</a>
            <a href="#">🐦</a>
            <a href="#">📷</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 ZemaLink. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
