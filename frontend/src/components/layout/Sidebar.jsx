import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { songService } from "../../services/songService";

function Sidebar({ isCollapsed, onToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);

  const loadPlaylists = async () => {
    if (!user) return;
    const data = await songService.getPlaylists();
    setPlaylists(data.playlists || []);
  };

  useEffect(() => {
    if (user) {
      loadPlaylists();
    }
  }, [user]);

  // Handle genre click - search by genre
  const handleGenreClick = (genre) => {
    navigate(`/browse?genre=${encodeURIComponent(genre)}`);
  };

  // Navigation items with their icons and labels
  const navItems = [
    { path: "/", icon: "🏠", label: "Home", show: true },
    { path: "/browse", icon: "🔍", label: "Browse", show: true },
    { path: "/library", icon: "📚", label: "Library", show: true },
    { path: "/profile", icon: "👤", label: "Profile", show: true },
    { path: "/admin-dashboard", icon: "👑", label: "Admin Dashboard", show: user?.role === "admin" },
    { path: "/admin-registered", icon: "🧾", label: "Registered Users", show: user?.role === "admin" },
    { path: "/musician-dashboard", icon: "🎤", label: "Studio", show: user?.role === "musician" },
    { path: "/purchased", icon: "💎", label: "Purchased", show: !!user },
    { path: "/subscription", icon: "⭐", label: "Subscribe", show: !!user },
  ];

  const genres = [
    { name: "Rock", icon: "🎸" },
    { name: "Pop", icon: "🎤" },
    { name: "Jazz", icon: "🎹" },
    { name: "Electronic", icon: "🎧" },
    { name: "Hip Hop", icon: "🎙️" },
    { name: "Classical", icon: "🎻" },
  ];

  // Tooltip component for collapsed state
  const Tooltip = ({ label }) => {
    if (!isCollapsed) return null;
    return (
      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-3 py-1.5 text-xs font-medium text-white bg-gray-900/95 backdrop-blur-md rounded-md shadow-lg border border-white/20 whitespace-nowrap transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible">
        {label}
      </span>
    );
  };

  const NavLink = ({ to, icon, label, onClick }) => {
    const content = (
      <>
        <span className="text-xl transition-transform duration-200 group-hover:scale-110">
          {icon}
        </span>
        {!isCollapsed && <span className="text-sm font-medium ml-3">{label}</span>}
        <Tooltip label={label} />
      </>
    );

    if (onClick) {
      return (
        <button onClick={onClick} className={navLinkClass}>
          {content}
        </button>
      );
    }

    return (
      <Link to={to} className={navLinkClass}>
        {content}
      </Link>
    );
  };

  const navLinkClass = `group relative flex items-center w-full px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 ${
    isCollapsed ? "justify-center" : "justify-start gap-3"
  }`;

  return (
    <aside
      className={`fixed left-4 top-20 h-[calc(100vh-6rem)] overflow-y-auto bg-black/40 backdrop-blur-xl border border-white/15 rounded-2xl p-4 hidden md:block transition-all duration-300 hover:bg-black/50 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Toggle Button - Default state is collapsed (-> icon means expand) */}
      <div className={`mb-6 flex ${isCollapsed ? "justify-center" : "justify-end"}`}>
        <button
          type="button"
          onClick={onToggle}
          className="group relative flex items-center justify-center w-8 h-8 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="text-sm">{isCollapsed ? "→" : "←"}</span>
          <Tooltip label={isCollapsed ? "Expand" : "Collapse"} />
        </button>
      </div>

      {/* Menu Section */}
      <div className="mb-6">
        {!isCollapsed && (
          <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 px-2 font-semibold">
            Menu
          </h3>
        )}
        <ul className="space-y-1">
          {navItems.map(
            (item) =>
              item.show && (
                <li key={item.path}>
                  <NavLink to={item.path} icon={item.icon} label={item.label} />
                </li>
              )
          )}
        </ul>
      </div>

      {/* My Playlists Section */}
      {user && (
        <div className="mb-6">
          {!isCollapsed && (
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 px-2 font-semibold">
              My Playlists
            </h3>
          )}
          <ul className="space-y-1">
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
                <li key={playlist.id}>
                  <NavLink
                    to={`/playlist/${playlist.id}`}
                    icon="📋"
                    label={playlist.name}
                  />
                </li>
              ))
            ) : (
              <li
                className={`flex items-center px-3 py-2.5 text-sm text-white/40 ${
                  isCollapsed ? "justify-center" : ""
                }`}
              >
                <span className="text-xl">📋</span>
                {!isCollapsed && <span className="ml-3">No playlists yet</span>}
                {isCollapsed && <Tooltip label="No playlists yet" />}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Genres Section */}
      <div className="mb-6">
        {!isCollapsed && (
          <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 px-2 font-semibold">
            Genres
          </h3>
        )}
        <ul className="space-y-1">
          {genres.map((genre) => (
            <li key={genre.name}>
              <button
                onClick={() => handleGenreClick(genre.name)}
                className={navLinkClass}
              >
                <span className="text-xl transition-transform duration-200 group-hover:scale-110">
                  {genre.icon}
                </span>
                {!isCollapsed && <span className="text-sm font-medium ml-3">{genre.name}</span>}
                <Tooltip label={genre.name} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;