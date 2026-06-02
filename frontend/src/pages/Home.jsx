import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2rem] mb-12 pb-8 md:pb-12 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-primary-500/30 via-primary-400/20 to-accent-500/10 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-accent-500/20 to-primary-400/10 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            {user ? 'Welcome Back' : 'Discover Music'}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 bg-gradient-to-r from-primary-400 via-primary-500 to-accent-500 bg-clip-text text-transparent leading-tight">
            {user ? `Welcome back, ${user.name}` : 'Welcome to ZemaLink'}
          </h1>
          <p className="text-lg md:text-xl text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {user
              ? 'Your music, your way. Stream, discover, and connect with artists from around the world.'
              : 'Discover, stream, and share music from independent artists worldwide. High-fidelity audio, zero compromises.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/browse')} className="btn-primary !px-8 !py-4 !text-lg group">
              Browse Music
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </button>
            {!user && (
              <button onClick={() => navigate('/register')} className="btn-secondary !px-8 !py-4 !text-lg">
                Get Started Free
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Songs Streamed', value: '5M+' },
            { label: 'Active Artists', value: '2K+' },
            { label: 'Monthly Users', value: '10K+' },
            { label: 'Uptime', value: '99.9%' },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 text-center border border-surface-200 dark:border-surface-700/40">
              <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-surface-500 dark:text-surface-400 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-4">Why ZemaLink?</h2>
          <p className="text-surface-500 dark:text-surface-400 max-w-xl mx-auto">
            Built for music lovers and independent artists alike.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🎵', title: 'Stream Anywhere', desc: 'High-quality audio streaming on any device. Listen to your favorite tracks anytime, anywhere.' },
            { icon: '🎤', title: 'Support Artists', desc: 'Directly support independent musicians. Your streams and purchases go straight to the creators.' },
            { icon: '🔒', title: 'Premium Content', desc: 'Exclusive access to premium tracks, ad-free listening, and offline downloads.' },
          ].map((feat, i) => (
            <div key={i} className="glass-card rounded-2xl p-8 text-center border border-surface-200 dark:border-surface-700/40 hover:-translate-y-1 transition-all duration-300">
              <div className="text-4xl mb-4">{feat.icon}</div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Premium Promotion Banner */}
      {user && !isPremium && (
        <section className="mb-16">
          <div className="relative overflow-hidden rounded-[2rem]">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 via-accent-600/20 to-amber-600/20 blur-2xl" />
            <div className="relative glass-dark rounded-[2rem] border border-primary-500/20 p-8 md:p-12 text-center">
              <div className="text-5xl mb-4">💎</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Go Premium</h2>
              <p className="text-surface-400 max-w-xl mx-auto mb-8">
                Unlock high-quality audio, offline listening, and exclusive content. Support the artists you love.
              </p>
              <button onClick={() => navigate('/subscription')} className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25">
                Upgrade Now &rarr;
              </button>
            </div>
          </div>
        </section>
      )}

      {/* CTA for Musicians */}
      <section className="mb-16">
        <div className="glass-card rounded-[2rem] p-8 md:p-12 text-center">
          <div className="text-5xl mb-4">🎤</div>
          <h2 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-4">Share Your Music</h2>
          <p className="text-surface-500 dark:text-surface-400 max-w-xl mx-auto mb-8">
            Are you a musician? Upload your tracks, connect with listeners, and grow your audience on ZemaLink.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/register?role=musician')} className="btn-primary !px-8 !py-4 group">
              Join as Musician &rarr;
            </button>
            <button onClick={() => navigate('/browse')} className="btn-secondary !px-8 !py-4">
              Explore Music
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative mt-16 rounded-[2rem] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="relative border border-white/[0.06] rounded-[2rem] backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-8 md:p-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎵</span>
                <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  ZemaLink
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Discover, stream, and share music from independent artists worldwide. High-fidelity audio, zero compromises.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quick Links</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Browse Music', to: '/browse' },
                  { label: 'Events', to: '/events' },
                  { label: 'Live Streams', to: '/live-streams' },
                  { label: 'Premium', to: '/subscription' },
                ].map((link) => (
                  <li key={link.label}>
                    <button onClick={() => navigate(link.to)}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Contact</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-500 mt-0.5">📧</span>
                  <a href="mailto:support@zemalink.com" className="hover:text-white transition-colors">support@zemalink.com</a>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-500 mt-0.5">📞</span>
                  <a href="tel:+251911234567" className="hover:text-white transition-colors">+251 911 234 567</a>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-500 mt-0.5">📍</span>
                  <span>Bole, Addis Ababa, Ethiopia</span>
                </li>
              </ul>
            </div>

            {/* Social & Support */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Follow Us</h3>
              <div className="flex gap-3 mb-6">
                {[
                  { label: 'Twitter', icon: '🐦', href: '#' },
                  { label: 'Instagram', icon: '📸', href: '#' },
                  { label: 'YouTube', icon: '▶️', href: '#' },
                  { label: 'Telegram', icon: '✈️', href: '#' },
                ].map((s) => (
                  <a key={s.label} href={s.href}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 hover:border-primary-500/30 transition-all"
                    aria-label={s.label}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Support</h3>
              <p className="text-sm text-slate-400">
                Need help?{' '}
                <a href="mailto:help@zemalink.com" className="text-primary-400 hover:text-primary-300 transition-colors">
                  help@zemalink.com
                </a>
              </p>
            </div>
          </div>

          <div className="border-t border-white/[0.06] px-8 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} ZemaLink. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <button className="hover:text-white transition-colors">Privacy Policy</button>
              <span>·</span>
              <button className="hover:text-white transition-colors">Terms of Service</button>
              <span>·</span>
              <button className="hover:text-white transition-colors">Cookie Policy</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
