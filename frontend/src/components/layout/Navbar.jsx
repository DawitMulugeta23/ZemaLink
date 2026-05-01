import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserMenu from "./UserMenu";

function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 transition"
            >
              <span className="text-xl">{mobileOpen ? "✕" : "☰"}</span>
            </button>
          </div>

          {/* Right Section - User Menu or Auth Links */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <UserMenu />
            ) : (
              <Link
                to="/register"
                className="rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-95 transition"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-3 sm:px-6">
            <div className="flex flex-col gap-2">
              {navLinks.map(
                (link) =>
                  link.show !== false && (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive(link.path)
                          ? "bg-red-500/15 text-white"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {link.icon} {link.name}
                    </Link>
                  )
              )}
            </div>
            <Link
              to="/subscription"
              onClick={() => setMobileOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg"
            >
              ⭐ Premium
            </Link>
            {user ? (
              <div className="pt-4 border-t border-white/10">
                <UserMenu />
              </div>
            ) : (
              <div className="space-y-2 pt-4 border-t border-white/10">
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg hover:opacity-95 transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;