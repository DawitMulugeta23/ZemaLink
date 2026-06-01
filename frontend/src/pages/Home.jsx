import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import SongCard from '../components/music/SongCard';
import { songService } from '../services/songService';
import { formatNumber } from '../utils/helpers';

function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function AnimatedSection({ children, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-3xl bg-white/5 border border-white/[0.08] p-4">
          <div className="aspect-square rounded-2xl bg-white/10 mb-4" />
          <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded w-1/2 mb-3" />
          <div className="h-4 bg-white/10 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse shrink-0 w-44 rounded-3xl bg-white/5 border border-white/[0.08] p-4">
          <div className="aspect-square rounded-2xl bg-white/10 mb-4" />
          <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      {action && (
        <Link to={action.to} className="text-sm text-primary-400 hover:text-primary-300 font-medium transition">
          {action.label} &rarr;
        </Link>
      )}
    </div>
  );
}

function HorizontalCarousel({ songs, loading }) {
  if (loading) return <SkeletonRow />;
  if (!songs?.length) return null;
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
      {songs.map((song) => (
        <div key={song.id} className="shrink-0 w-44 snap-start">
          <SongCard song={song} />
        </div>
      ))}
    </div>
  );
}

function SongGrid({ songs, loading, emptyMessage }) {
  if (loading) return <SectionSkeleton />;
  if (!songs?.length) {
    return (
      <div className="glass-dark rounded-2xl p-12 text-center">
        <p className="text-slate-400">{emptyMessage || 'No songs available yet.'}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {songs.map((song) => (
        <SongCard key={song.id} song={song} />
      ))}
    </div>
  );
}

export default function Home() {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [f, t, r, n] = await Promise.all([
          songService.getFeatured().catch(() => []),

          songService.getTrending().catch(() => []),

          songService.getTopRated().catch(() => []),

          songService.getNewReleases().catch(() => []),
        ]);
        if (cancelled) return;
        setFeatured(f || []);
        setTrending(t || []);
        setTopRated(r || []);
        setNewReleases(n || []);
      } catch (err) {
        if (!cancelled) setError('Failed to load content. Please try again later.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-5xl">⚠️</div>
        <p className="text-slate-400 text-center max-w-md">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-medium transition">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <AnimatedSection className="relative overflow-hidden rounded-[2rem] mb-16 p-8 md:p-16 text-center md:text-left">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-primary-500/30 via-primary-400/20 to-accent-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-accent-500/20 to-primary-400/10 blur-3xl" />
        </div>
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mb-4 font-semibold">
            Welcome to the future of music
          </p>
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-primary-400 via-primary-500 to-accent-500 bg-clip-text text-transparent leading-tight">
            {user ? `Welcome back, ${user.name}` : 'Welcome to ZemaLink'}
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto md:mx-0 mb-10 leading-relaxed">
            {user
              ? 'Your music, your way. Pick up where you left off and dive into your personalized feed.'
              : 'Discover, stream, and share music from independent artists worldwide. High-fidelity audio, zero compromises.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center md:justify-start gap-4 justify-center">
            {user ? (
              <>
                <button onClick={() => navigate('/browse')} className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary-500/25">
                  Browse Music
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </button>
                <button onClick={() => navigate('/library')} className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition">
                  Your Library
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/register')} className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary-500/25">
                  Get Started Free
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </button>
                <button onClick={() => navigate('/browse')} className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition">
                  Browse Music
                </button>
              </>
            )}
          </div>
        </div>
      </AnimatedSection>

      {/* Stats Section */}
      {!user && (
        <AnimatedSection className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Songs Streamed', value: '5M+' },
              { label: 'Active Artists', value: '2K+' },
              { label: 'Monthly Users', value: '10K+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat, i) => (
              <div key={i} className="glass-dark rounded-2xl p-6 text-center hover:border-primary-500/30 transition border border-white/10">
                <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      )}

      {/* Featured Songs Carousel */}
      <AnimatedSection className="mb-16">
        <SectionHeader title="Featured" action={{ to: '/browse', label: 'View All' }} />
        <HorizontalCarousel songs={featured} loading={loading} />
      </AnimatedSection>

      {/* Trending Songs */}
      <AnimatedSection className="mb-16">
        <SectionHeader title="Trending Now" action={{ to: '/browse?sort=trending', label: 'View All' }} />
        <SongGrid songs={trending} loading={loading} emptyMessage="No trending songs right now." />
      </AnimatedSection>

      {/* Top Rated Songs */}
      <AnimatedSection className="mb-16">
        <SectionHeader title="Top Rated" action={{ to: '/browse?sort=top-rated', label: 'View All' }} />
        <SongGrid songs={topRated} loading={loading} emptyMessage="No top rated songs yet." />
      </AnimatedSection>

      {/* New Releases */}
      <AnimatedSection className="mb-16">
        <SectionHeader title="New Releases" action={{ to: '/browse?sort=new', label: 'View All' }} />
        <SongGrid songs={newReleases} loading={loading} emptyMessage="No new releases yet." />
      </AnimatedSection>

      {/* Premium Promotion Banner (free tier users) */}
      {user && !isPremium && (
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-[2rem] mb-16">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 via-accent-600/20 to-amber-600/20 blur-2xl" />
            <div className="relative glass-dark rounded-[2rem] border border-primary-500/20 p-8 md:p-12 text-center">
              <div className="text-5xl mb-4">💎</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Go Premium</h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8">
                Unlock high-quality audio, offline listening, and exclusive content. Support the artists you love.
              </p>
              <button onClick={() => navigate('/subscription')} className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25">
                Upgrade Now &rarr;
              </button>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* CTA for Musicians */}
      {!user && (
        <AnimatedSection className="mb-16">
          <div className="glass-dark rounded-[2rem] border border-white/10 p-8 md:p-12 text-center">
            <div className="text-5xl mb-4">🎤</div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Share Your Music</h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              Are you a musician? Upload your tracks, connect with listeners, and grow your audience on ZemaLink.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('/register?role=musician')} className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold transition-all duration-300 hover:scale-105">
                Join as Musician &rarr;
              </button>
              <button onClick={() => navigate('/browse')} className="px-8 py-4 rounded-full border border-white/20 text-white font-bold hover:bg-white/5 transition">
                Explore Music
              </button>
            </div>
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
