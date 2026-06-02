import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SongCard from '../components/music/SongCard';
import PlaylistCard from '../components/music/PlaylistCard';
import { useAuth } from '../context/AuthContext';
import { songService } from '../services/songService';

const TABS = (role) => [
  { id: 'liked', label: 'Liked Songs', icon: '❤️' },
  ...(role === 'musician' ? [{ id: 'playlists', label: 'Playlists', icon: '📋' }] : []),
  { id: 'history', label: 'History', icon: '🕐' },
];

function TabSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-3xl bg-white/5 border border-white/[0.08] p-4">
          <div className="aspect-square rounded-2xl bg-white/10 mb-4" />
          <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, message, action }) {
  return (
    <div className="glass-card rounded-2xl p-12 md:p-16 text-center border border-white/10">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-surface-400 mb-6 max-w-md mx-auto">{message}</p>
      {action && (
        <Link to={action.to} className="inline-flex px-6 py-2.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium hover:scale-105 transition">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export default function Library() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('liked');
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [likes, playlistsData, hist] = await Promise.all([
        songService.getLikes().catch(() => ({ likes: [] })),
        songService.getPlaylists().catch(() => ({ playlists: [] })),
        songService.getListeningHistory().catch(() => []),
      ]);
      setLikedSongs(likes?.likes || []);
      setPlaylists(playlistsData?.playlists || []);
      setHistory(hist || []);
    } catch (err) {
      setError('Failed to load your library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadLibrary();
  }, [user, loadLibrary]);

  const handleUnlike = async (songId) => {
    try {
      await songService.toggleLike(songId);
      setLikedSongs((prev) => prev.filter((s) => s.id !== songId));
    } catch {
      // silently fail
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistName.trim()) return;
    setCreating(true);
    try {
      const result = await songService.createPlaylist(playlistName.trim());
      if (result?.success) {
        setPlaylistName('');
        setShowCreateModal(false);
        const data = await songService.getPlaylists();
        setPlaylists(data?.playlists || []);
      } else {
        toast?.error?.(result?.error || 'Failed to create playlist');
      }
    } catch {
      toast?.error?.('Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon="🔒"
        title="Login Required"
        message="Sign in to view your library, liked songs, playlists, and listening history."
        action={{ to: '/login', label: 'Sign In' }}
      />
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-white/10">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-surface-400 mb-4">{error}</p>
        <button onClick={loadLibrary} className="px-6 py-2 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-600 transition">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Your Library</h1>

      {/* Tabs with animated underline */}
      <div className="flex gap-1 mb-8 border-b border-white/10">
        {TABS(user?.role).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-5 py-3 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-surface-500 hover:text-surface-300'
            }`}
          >
            {tab.icon} {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" />
            )}
          </button>
        ))}
        <Link
          to="/purchased"
          className="px-5 py-3 text-sm font-medium text-surface-500 hover:text-surface-300 transition ml-auto"
        >
          💎 Purchased
        </Link>
      </div>

      {/* Liked Songs Tab */}
      {activeTab === 'liked' && (
        <>
          {loading ? (
            <TabSkeleton />
          ) : likedSongs.length === 0 ? (
            <EmptyState
              icon="❤️"
              title="No liked songs yet"
              message="Start exploring and like songs you enjoy — they'll appear here."
              action={{ to: '/browse', label: 'Browse Music' }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-surface-400">{likedSongs.length} song{likedSongs.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {likedSongs.map((song) => (
                  <div key={song.id} className="relative group">
                    <SongCard song={song} />
                    <button
                      onClick={() => handleUnlike(song.id)}
                      className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-xs text-red-400 opacity-0 group-hover:opacity-100 transition hover:bg-red-500/20"
                      title="Unlike"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Playlists Tab */}
      {activeTab === 'playlists' && (
        <>
          {loading ? (
            <TabSkeleton />
          ) : (
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-surface-400">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium hover:scale-105 transition"
              >
                + New Playlist
              </button>
            </div>
          )}
          {loading ? (
            <TabSkeleton />
          ) : playlists.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No playlists yet"
              message="Create your first playlist to organize your favorite songs."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {playlists.map((playlist) => (
                <Link key={playlist.id} to={`/playlist/${playlist.id}`} className="block">
                  <PlaylistCard playlist={playlist} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {loading ? (
            <TabSkeleton />
          ) : history.length === 0 ? (
            <EmptyState
              icon="🕐"
              title="No listening history"
              message="Start playing songs and your listening history will appear here."
              action={{ to: '/browse', label: 'Discover Music' }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-surface-400">{history.length} song{history.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {history.map((song, i) => (
                  <div key={`${song.id}-${i}`} className="relative">
                    <SongCard song={song} />
                    {song.played_at && (
                      <p className="text-[10px] text-surface-500 mt-1 text-center">
                        {new Date(song.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4">
            <div className="glass-card rounded-2xl border border-white/10 p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6">Create New Playlist</h2>
              <form onSubmit={handleCreatePlaylist}>
                <div className="mb-6">
                  <label htmlFor="playlistName" className="block text-sm text-surface-400 mb-2">Playlist Name</label>
                  <input
                    type="text"
                    id="playlistName"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="input-field"
                    placeholder="My awesome playlist"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-surface-400 hover:text-white transition">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !playlistName.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
