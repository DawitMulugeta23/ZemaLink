import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SongCard from "../components/music/SongCard";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { songService } from "../services/songService";

const FEATURES = [
  {
    title: "Curated discovery",
    description:
      "Browse trending tracks and new releases in one place—built for listeners who care about sound and context.",
  },
  {
    title: "Artist-ready roles",
    description:
      "Musicians, audiences, and admins each get workflows that fit how music is shared, heard, and managed.",
  },
  {
    title: "Reliable playback",
    description:
      "A focused player experience so you can stay in the music without fighting the interface.",
  },
];

const CONTACT_CHANNELS = [
  {
    label: "General inquiries",
    value: "hello@zemalink.com",
    href: "mailto:hello@zemalink.com",
    detail: "Partnerships, press, and product questions",
  },
  {
    label: "Support",
    value: "support@zemalink.com",
    href: "mailto:support@zemalink.com",
    detail: "Account access, playback, and billing help",
  },
];

function Home() {
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCredentials, setShowCredentials] = useState(true);
  const [adminExists, setAdminExists] = useState(true);

  const demoUsers = [
    {
      role: "Admin",
      email: "admin@zemalink.com",
      password: "password",
      icon: "👑",
      color: "red",
    },
    {
      role: "Musician",
      email: "musician@zemalink.com",
      password: "password",
      icon: "🎤",
      color: "purple",
    },
    {
      role: "Audience",
      email: "audience@zemalink.com",
      password: "password",
      icon: "🎧",
      color: "green",
    },
    {
      role: "Demo",
      email: "demo@zemalink.com",
      password: "password",
      icon: "🎵",
      color: "blue",
    },
  ];

  const loadData = useCallback(async () => {
    try {
      const [allSongs, trendingSongs] = await Promise.all([
        songService.getSongs(),
        songService.getTrending(),
      ]);
      setSongs(allSongs || []);
      setTrending(trendingSongs || []);
      const adminState = await authService.adminExists();
      if (adminState?.success) {
        setAdminExists(Boolean(adminState.admin_exists));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Demo Credentials Banner */}
      {showCredentials && !user && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md border border-yellow-500/30 rounded-2xl p-4 mb-6 relative">
          <button
            onClick={() => setShowCredentials(false)}
            className="absolute top-2 right-2 text-white/50 hover:text-white"
          >
            ✕
          </button>
          <h3 className="text-lg font-semibold mb-3 text-center">
            🔐 Demo Login Credentials
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {demoUsers.map((demo, index) => (
              <div
                key={index}
                className={`bg-${demo.color}-500/10 rounded-xl p-3 border border-${demo.color}-500/30`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{demo.icon}</span>
                  <span className="font-bold text-white">{demo.role}</span>
                </div>
                <div className="text-xs text-white/70">
                  <div>📧 {demo.email}</div>
                  <div>🔑 {demo.password}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-white/50 mt-3">
            Seed accounts use password <span className="font-mono text-white/70">password</span>{" "}
            (matches default bcrypt in sample SQL).
          </p>
        </div>
      )}

      {/* Landing hero */}
      <header className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-12 mb-10 text-center md:text-left overflow-hidden relative">
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-red-500/20 via-yellow-500/10 to-pink-500/20 blur-2xl"
          aria-hidden
        />
        <div className="relative max-w-3xl mx-auto md:mx-0">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">
            Music streaming · Discovery · Community
          </p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 via-yellow-400 to-pink-400 bg-clip-text text-transparent leading-tight">
            {user
              ? `Welcome back, ${user.name}`
              : "ZemaLink — where music meets clarity"}
          </h1>
          <p className="text-white/75 text-base md:text-lg leading-relaxed mb-8">
            {user
              ? "Pick up where you left off—trending picks and your library are ready when you are."
              : "A modern listening experience for fans and creators: discover what is moving, organize what you love, and keep playback front and center."}
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center md:justify-start gap-3">
            <Link
              to="/browse"
              className="inline-flex justify-center items-center px-6 py-3 rounded-full font-semibold text-sm bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:opacity-95 transition-opacity"
            >
              Explore catalog
            </Link>
            {user ? (
              <Link
                to="/library"
                className="inline-flex justify-center items-center px-6 py-3 rounded-full font-semibold text-sm border border-white/25 text-white/90 hover:bg-white/10 transition-colors"
              >
                Open your library
              </Link>
            ) : (
              <>
                {!adminExists && (
                  <Link
                    to="/register?role=admin"
                    className="inline-flex justify-center items-center px-6 py-3 rounded-full font-semibold text-sm bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg hover:opacity-95 transition-opacity"
                  >
                    Register first admin
                  </Link>
                )}
                <Link
                  to="/register"
                  className="inline-flex justify-center items-center px-6 py-3 rounded-full font-semibold text-sm border border-white/25 text-white/90 hover:bg-white/10 transition-colors"
                >
                  Create an account
                </Link>
                <Link
                  to="/login"
                  className="inline-flex justify-center items-center px-6 py-3 rounded-full font-semibold text-sm text-white/70 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
          {user && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
              <span className="text-xl">
                {user.role === "admin"
                  ? "👑"
                  : user.role === "musician"
                    ? "🎤"
                    : "🎧"}
              </span>
              <span className="text-sm text-white/80">
                Signed in as{" "}
                <span className="font-semibold text-white capitalize">
                  {user.role}
                </span>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Value proposition */}
      <section
        className="mb-12"
        aria-labelledby="why-zemalink-heading"
      >
        <h2
          id="why-zemalink-heading"
          className="text-lg font-semibold text-white/90 mb-2"
        >
          Why teams and listeners choose ZemaLink
        </h2>
        <p className="text-sm text-white/55 mb-6 max-w-2xl">
          We combine a polished interface with practical roles for admins,
          musicians, and audiences—so the product feels as intentional as the
          music.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md p-6 text-left"
            >
              <h3 className="text-base font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-white/60 leading-relaxed">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Trending Section */}
      {trending.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">🔥</span>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">
              Trending Now
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {trending.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onAccessGranted={loadData}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Releases */}
      {songs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">🎵</span>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Latest Releases
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {songs.slice(0, 10).map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onAccessGranted={loadData}
              />
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section
        id="contact"
        className="mt-14 mb-4 scroll-mt-24"
        aria-labelledby="contact-heading"
      >
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-black/30 backdrop-blur-md p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12 items-start">
            <div>
              <h2
                id="contact-heading"
                className="text-xl md:text-2xl font-bold text-white mb-3"
              >
                Contact ZemaLink
              </h2>
              <p className="text-sm text-white/65 leading-relaxed mb-4">
                We read every message. For the fastest resolution, use Support
                for technical issues and General inquiries for everything else.
              </p>
              <p className="text-xs text-white/45">
                Typical response time: 1–2 business days. Include your account
                email and a short summary of the issue when writing to Support.
              </p>
            </div>
            <ul className="space-y-4">
              {CONTACT_CHANNELS.map((row) => (
                <li key={row.label}>
                  <p className="text-xs uppercase tracking-wider text-white/45 mb-1">
                    {row.label}
                  </p>
                  <a
                    href={row.href}
                    className="text-base font-medium text-white hover:text-pink-300 transition-colors break-all"
                  >
                    {row.value}
                  </a>
                  <p className="text-xs text-white/50 mt-1">{row.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
