import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: "/", name: "Home", icon: "🏠" },
    { path: "/browse", name: "Browse", icon: "🔍" },
    { path: "/library", name: "Library", icon: "📚" },
    { path: "/player", name: "Player", icon: "🎵", show: !!user },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🎵</span>
            <span className="text-xl font-bold bg-gradient-to-r from-red-400 via-yellow-400 to-pink-400 bg-clip-text text-transparent">
              ZemaLink
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
              {navLinks.map((link) => (
                (link.show !== false) && (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive(link.path)
                        ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {link.name}
                  </Link>
                )
              ))}
              <Link
                to="/subscription"
                className="px-5 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-105 transition-all duration-300 shadow-lg"
              >
                ⭐ Premium
              </Link>
            </div>
          </div>

          {/* Right Section - Theme Toggle & User Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;