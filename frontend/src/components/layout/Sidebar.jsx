import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { songService } from "../../services/songService";

function Sidebar({ isCollapsed, onToggle }) {
  const { user } = useAuth();
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

  const renderLabel = (label) =>
    isCollapsed ? (
      <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/15 bg-black/90 px-2 py-1 text-xs text-white group-hover:block">
        {label}
      </span>
    ) : (
      <span className="text-sm font-medium">{label}</span>
    );

  const itemClass = `group relative flex items-center px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 ${
    isCollapsed ? "justify-center" : "gap-3"
  }`;

  return (
    <aside
      className={`fixed left-4 top-20 h-[calc(100vh-6rem)] overflow-y-auto bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-4 hidden md:block transition-all duration-300 hover:bg-white/10 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className={`mb-4 flex ${isCollapsed ? "justify-center" : "justify-end"}`}>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? "->" : "<-"}
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
          <li>
            <Link to="/" className={itemClass}>
              <span className="text-xl group-hover:scale-110 transition-transform">
                🏠
              </span>
              {renderLabel("Home")}
            </Link>
          </li>
          <li>
            <Link to="/browse" className={itemClass}>
              <span className="text-xl group-hover:scale-110 transition-transform">
                🔍
              </span>
              {renderLabel("Browse")}
            </Link>
          </li>
          <li>
            <Link to="/library" className={itemClass}>
              <span className="text-xl group-hover:scale-110 transition-transform">
                📚
              </span>
              {renderLabel("Library")}
            </Link>
          </li>
          <li>
            <Link to="/profile" className={itemClass}>
              <span className="text-xl group-hover:scale-110 transition-transform">
                👤
              </span>
              {renderLabel("Profile")}
            </Link>
          </li>
          {user?.role === "admin" && (
            <>
              <li>
                <Link to="/admin-dashboard" className={itemClass}>
                  <span className="text-xl">👑</span>
                  {renderLabel("Admin")}
                </Link>
              </li>
              <li>
                <Link to="/admin-registered" className={itemClass}>
                  <span className="text-xl">🧾</span>
                  {renderLabel("Registered")}
                </Link>
              </li>
            </>
          )}
          {user?.role === "musician" && (
            <li>
              <Link to="/musician-dashboard" className={itemClass}>
                <span className="text-xl">🎤</span>
                {renderLabel("Studio")}
              </Link>
            </li>
          )}
          {user && (
            <>
              <li>
                <Link to="/purchased" className={itemClass}>
                  <span className="text-xl">💎</span>
                  {renderLabel("Purchased")}
                </Link>
              </li>
              <li>
                <Link to="/subscription" className={itemClass}>
                  <span className="text-xl">⭐</span>
                  {renderLabel("Subscribe")}
                </Link>
              </li>
            </>
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
                  <Link to={`/playlist/${playlist.id}`} className={itemClass}>
                    <span className="text-lg group-hover:scale-110 transition-transform">
                      📋
                    </span>
                    {renderLabel(playlist.name)}
                  </Link>
                </li>
              ))
            ) : (
              <li
                className={`px-3 py-2 text-sm text-white/40 ${
                  isCollapsed ? "text-center text-xs" : ""
                }`}
              >
                No playlists yet
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
          <li>
            <a
              href="#"
              className={itemClass}
            >
              <span className="text-xl">🎸</span>
              {renderLabel("Rock")}
            </a>
          </li>
          <li>
            <a
              href="#"
              className={itemClass}
            >
              <span className="text-xl">🎤</span>
              {renderLabel("Pop")}
            </a>
          </li>
          <li>
            <a
              href="#"
              className={itemClass}
            >
              <span className="text-xl">🎹</span>
              {renderLabel("Jazz")}
            </a>
          </li>
          <li>
            <a
              href="#"
              className={itemClass}
            >
              <span className="text-xl">🎧</span>
              {renderLabel("Electronic")}
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
