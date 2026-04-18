import { useAuth } from "../context/AuthContext";

function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="glass rounded-3xl p-12 max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4">Login Required</h2>
          <p className="text-white/70">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="glass rounded-3xl p-8 max-w-2xl mx-auto text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-4xl">
          👤
        </div>
        <h1 className="text-3xl font-bold mb-2 gradient-text">{user.name}</h1>
        <p className="text-white/60 mb-6">{user.email}</p>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="glass rounded-xl p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-white/60">Playlists</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-white/60">Liked Songs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
