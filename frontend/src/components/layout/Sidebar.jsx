import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { songService } from "../../services/songService";

function Sidebar() {
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

  return (
    <aside className="fixed left-4 top-20 w-64 h-[calc(100vh-6rem)] overflow-y-auto bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-4 hidden md:block transition-all duration-300 hover:bg-white/10">
      {/* Menu Section */}
      <div className="mb-6">
        <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 px-2 font-semibold">
          Menu
        </h3>
        <ul className="space-y-1">
          <li>
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">
                🏠
              </span>
              <span className="text-sm font-medium">Home</span>
            </Link>
          </li>
          <li>
            <Link
              to="/browse"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">
                🔍
              </span>
              <span className="text-sm font-medium">Browse</span>
            </Link>
          </li>
          <li>
            <Link
              to="/library"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">
                📚
              </span>
              <span className="text-sm font-medium">Library</span>
            </Link>
          </li>
          <li>
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">
                👤
              </span>
              <span className="text-sm font-medium">Profile</span>
            </Link>
          </li>
          {user?.role === "admin" && (
            <>
              <li>
                <Link
                  to="/admin-dashboard"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                >
                  <span className="text-xl">👑</span>
                  <span className="text-sm font-medium">Admin</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin-registered"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                >
                  <span className="text-xl">🧾</span>
                  <span className="text-sm font-medium">Registered</span>
                </Link>
              </li>
            </>
          )}
          {user?.role === "musician" && (
            <li>
              <Link
                to="/musician-dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
              >
                <span className="text-xl">🎤</span>
                <span className="text-sm font-medium">Studio</span>
              </Link>
            </li>
          )}
          {user && (
            <>
              <li>
                <Link
                  to="/purchased"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                >
                  <span className="text-xl">💎</span>
                  <span className="text-sm font-medium">Purchased</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/subscription"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                >
                  <span className="text-xl">⭐</span>
                  <span className="text-sm font-medium">Subscribe</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* My Playlists Section */}
      {user && (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 px-2 font-semibold">
            My Playlists
          </h3>
          <ul className="space-y-1">
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
                <li key={playlist.id}>
                  <Link
                    to={`/playlist/${playlist.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">
                      📋
                    </span>
                    <span className="text-sm font-medium truncate">
                      {playlist.name}
                    </span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-white/40">
                No playlists yet
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Genres Section */}
      <div className="mb-6">
        <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 px-2 font-semibold">
          Genres
        </h3>
        <ul className="space-y-1">
          <li>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition group"
            >
              <span className="text-xl">🎸</span>
              <span className="text-sm font-medium">Rock</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition group"
            >
              <span className="text-xl">🎤</span>
              <span className="text-sm font-medium">Pop</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition group"
            >
              <span className="text-xl">🎹</span>
              <span className="text-sm font-medium">Jazz</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition group"
            >
              <span className="text-xl">🎧</span>
              <span className="text-sm font-medium">Electronic</span>
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
