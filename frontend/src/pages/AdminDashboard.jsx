import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminService } from "../services/adminService";
import ConfirmDialog from "../components/common/ConfirmDialog";

const mainTabs = [
  { id: "overview", label: "Overview" },
  { id: "songs", label: "Songs" },
  { id: "users", label: "Users" },
  { id: "payments", label: "Payments" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];

const songSubTabs = [
  { id: "pending", label: "Pending Approval" },
  { id: "all", label: "All Songs" },
];

function StatusBadge({ status, variant }) {
  const map = {
    approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    dismissed: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    reviewed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    suspended: "bg-red-500/20 text-red-300 border-red-500/30",
    completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
    refunded: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  };
  const s = map[status] || map.pending;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s}`}>
      {status}
    </span>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [songSubTab, setSongSubTab] = useState("pending");
  const [stats, setStats] = useState(null);
  const [pendingMusicians, setPendingMusicians] = useState([]);
  const [pendingSongs, setPendingSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);

  // Search / filter states
  const [songSearch, setSongSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  // Premium pricing settings
  const [premiumPrice, setPremiumPrice] = useState("4.99");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [st, pm, ps, as, us, rp, pay] = await Promise.all([
      adminService.getStats(),
      adminService.getPendingMusicians(),
      adminService.getPendingSongs(),
      adminService.getAllSongs(),
      adminService.getUsers(),
      adminService.getReports(),
      adminService.getPayments(),
    ]);
    if (st.success) setStats(st.stats);
    if (pm.success) setPendingMusicians(pm.musicians || []);
    if (ps.success) setPendingSongs(ps.songs || []);
    if (as.success) setAllSongs(as.songs || []);
    if (us.success) setAllUsers(us.users || []);
    if (rp.success) setReports(rp.reports || []);
    if (pay.success) setPayments(pay.payments || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const approveMusician = async (id) => {
    const r = await adminService.approveMusician(id);
    if (r.success) { toast.success("Musician approved"); loadAll(); }
    else toast.error(r.message || "Failed to approve");
  };

  const rejectMusician = async (id) => {
    const r = await adminService.rejectMusician(id);
    if (r.success) { toast.success("Musician rejected"); loadAll(); }
    else toast.error(r.message || "Failed to reject");
  };

  const approveSong = async (id) => {
    const r = await adminService.approveSong(id);
    if (r.success) { toast.success("Song approved"); loadAll(); }
    else toast.error(r.message || "Failed to approve song");
  };

  const rejectSong = async (id) => {
    const r = await adminService.rejectSong(id);
    if (r.success) { toast.success("Song rejected"); loadAll(); }
    else toast.error(r.message || "Failed to reject song");
  };

  const toggleFeature = async (id, featured) => {
    const r = await (featured ? adminService.featureSong(id) : adminService.unfeatureSong(id));
    if (r.success) loadAll();
    else toast.error(r.message || "Failed to update feature");
  };

  const savePremium = async (id, isPremium, price) => {
    await adminService.setSongPremium(id, { is_premium: isPremium ? 1 : 0, price: parseFloat(price) || 0 });
    loadAll();
  };

  const deleteSong = async (id) => {
    await adminService.deleteSong(id);
    toast.success("Song deleted");
    loadAll();
  };

  const deleteUser = async (id) => {
    const r = await adminService.deleteUser(id);
    if (r.success) { toast.success("User deleted"); loadAll(); }
    else toast.error(r.message || "Failed to delete user");
  };

  const updateRole = async (id, role) => {
    const r = await adminService.updateRole(id, role);
    if (r.success) { toast.success("Role updated"); loadAll(); }
    else toast.error(r.message || "Failed to update role");
  };

  const setReportStatus = async (id, status) => {
    await adminService.setReportStatus(id, status);
    toast.success(`Report ${status}`);
    loadAll();
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    toast.success("Settings saved (mock)");
  };

  const formatCurrency = (val) => Number(val || 0).toFixed(2);

  // Derived data
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const pendingApprovals = pendingSongs.length + pendingMusicians.length;

  const filteredSongs = allSongs.filter((s) =>
    !songSearch || s.title?.toLowerCase().includes(songSearch.toLowerCase()) ||
    s.artist?.toLowerCase().includes(songSearch.toLowerCase())
  );

  const filteredUsers = allUsers.filter((u) => {
    const matchSearch = !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-extrabold gradient-text">
          Admin Dashboard
        </h1>
        <div className="flex bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg p-1 rounded-full border border-slate-200 dark:border-slate-700/50 overflow-x-auto">
          {mainTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
                activeTab === t.id
                  ? "bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ───── OVERVIEW ───── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Users</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats?.total_users || allUsers.length}</p>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Songs</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats?.total_songs || allSongs.length}</p>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Revenue</p>
              <p className="text-2xl font-black text-emerald-400 mt-2">${formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Pending Approvals</p>
              <p className="text-2xl font-black text-amber-400 mt-2">{pendingApprovals}</p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Revenue Overview (Mock Data)</h3>
            <div className="flex items-end gap-3 h-48">
              {[
                { label: "Jan", value: 20 }, { label: "Feb", value: 35 },
                { label: "Mar", value: 28 }, { label: "Apr", value: 50 },
                { label: "May", value: 45 }, { label: "Jun", value: 65 },
                { label: "Jul", value: 55 }, { label: "Aug", value: 75 },
                { label: "Sep", value: 85 }, { label: "Oct", value: 70 },
                { label: "Nov", value: 90 }, { label: "Dec", value: 100 },
              ].map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gradient-to-t from-primary-500 to-accent-500 rounded-t-md transition-all duration-500"
                    style={{ height: `${m.value}%` }}
                    title={`${m.label}: $${m.value}`}
                  />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Activity */}
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {payments.slice(0, 5).map((p, i) => (
                  <div key={p.id || i} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-slate-600 dark:text-slate-300 flex-1 truncate">
                      {p.user_name} purchased {p.payment_type}
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setActiveTab("songs")}
                  className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-left hover:bg-amber-500/20 transition"
                >
                  <p className="text-lg mb-1">🎵</p>
                  <p className="text-xs font-semibold text-amber-400">Approve Songs</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{pendingSongs.length} pending</p>
                </button>
                <button onClick={() => setActiveTab("users")}
                  className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-left hover:bg-blue-500/20 transition"
                >
                  <p className="text-lg mb-1">👥</p>
                  <p className="text-xs font-semibold text-blue-400">Manage Users</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{pendingMusicians.length} pending musicians</p>
                </button>
                <button onClick={() => setActiveTab("reports")}
                  className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-left hover:bg-red-500/20 transition"
                >
                  <p className="text-lg mb-1">🚩</p>
                  <p className="text-xs font-semibold text-red-400">Manage Reports</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{reports.length} reports</p>
                </button>
                <button onClick={() => setActiveTab("payments")}
                  className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-left hover:bg-emerald-500/20 transition"
                >
                  <p className="text-lg mb-1">💰</p>
                  <p className="text-xs font-semibold text-emerald-400">View Payments</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">${formatCurrency(totalRevenue)} total</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── SONGS ───── */}
      {activeTab === "songs" && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg p-1 rounded-full border border-slate-200 dark:border-slate-700/50 w-fit">
            {songSubTabs.map((st) => (
              <button key={st.id} onClick={() => setSongSubTab(st.id)}
                className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  songSubTab === st.id
                    ? "bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Pending Approval */}
          {songSubTab === "pending" && (
            <div className="space-y-3">
              {pendingSongs.length === 0 ? (
                <div className="text-center py-16 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 rounded-2xl">
                  <p className="text-slate-500 dark:text-slate-400">No songs pending approval</p>
                </div>
              ) : (
                pendingSongs.map((s) => (
                  <div key={s.id} className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg">🎵</div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{s.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.artist} · by {s.uploader_name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveSong(s.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-500/90 text-white text-xs font-semibold hover:bg-emerald-500 transition"
                      >
                        Approve
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'rejectSong', id: s.id })}
                        className="px-4 py-2 rounded-xl border border-red-400/50 text-red-300 text-xs hover:bg-red-500/10 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* All Songs */}
          {songSubTab === "all" && (
            <div className="space-y-4">
              <input type="text" placeholder="Search songs..." value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
              <div className="overflow-x-auto rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/50 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4">Title</th>
                      <th className="p-4 hidden md:table-cell">Artist</th>
                      <th className="p-4 text-center">Premium</th>
                      <th className="p-4 text-center hidden sm:table-cell">Price</th>
                      <th className="p-4 text-center">Featured</th>
                      <th className="p-4 text-center">Plays</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSongs.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">No songs found</td></tr>
                    ) : (
                      filteredSongs.map((s) => (
                        <tr key={s.id} className="border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                          <td className="p-4 font-medium text-slate-900 dark:text-white">{s.title}</td>
                          <td className="p-4 hidden md:table-cell text-slate-600 dark:text-slate-300">{s.artist || "—"}</td>
                          <td className="p-4 text-center">
                            <input type="checkbox" defaultChecked={!!s.is_premium}
                              onChange={(e) => savePremium(s.id, e.target.checked, s.price || 0.99)}
                              className="rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500"
                            />
                          </td>
                          <td className="p-4 text-center hidden sm:table-cell">
                            <input type="number" step="0.01" defaultValue={s.price || 0}
                              onBlur={(e) => savePremium(s.id, !!s.is_premium, e.target.value)}
                              className="w-20 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 text-xs text-slate-900 dark:text-white text-center"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input type="checkbox" defaultChecked={!!s.featured}
                              onChange={(e) => toggleFeature(s.id, e.target.checked)}
                              className="rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-500"
                            />
                          </td>
                          <td className="p-4 text-center text-slate-600 dark:text-slate-300">{s.plays || 0}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => setConfirmAction({ type: 'deleteSong', id: s.id })}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───── USERS ───── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <input type="text" placeholder="Search by name or email..." value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="flex-1 min-w-[200px] max-w-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
            />
            <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}
              className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
            >
              <option value="all">All Roles</option>
              <option value="audience">Audience</option>
              <option value="musician">Musician</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Pending Musicians */}
          {pendingMusicians.length > 0 && (
            <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4">
              <h4 className="text-sm font-bold text-amber-400 mb-3">Pending Musician Applications ({pendingMusicians.length})</h4>
              <div className="space-y-2">
                {pendingMusicians.map((m) => (
                  <div key={m.id} className="flex flex-wrap justify-between items-center gap-3 rounded-xl bg-white/50 dark:bg-slate-800/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{m.email} · Joined {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveMusician(m.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/90 text-white text-xs font-semibold hover:bg-emerald-500 transition"
                      >
                        Approve
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'rejectMusician', id: m.id })}
                        className="px-3 py-1.5 rounded-lg border border-red-400/50 text-red-300 text-xs hover:bg-red-500/10 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Table */}
          <div className="overflow-x-auto rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/50 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4">Name</th>
                  <th className="p-4 hidden sm:table-cell">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 hidden md:table-cell">Status</th>
                  <th className="p-4 hidden md:table-cell">Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">No users found</td></tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">{u.name}</td>
                      <td className="p-4 hidden sm:table-cell text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="p-4">
                        <select value={u.role}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                        >
                          <option value="audience">Audience</option>
                          <option value="musician">Musician</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <StatusBadge status={u.status || (u.is_approved ? "active" : "pending")} />
                      </td>
                      <td className="p-4 hidden md:table-cell text-slate-500 dark:text-slate-400 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => setConfirmAction({ type: 'deleteUser', id: u.id })}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── PAYMENTS ───── */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 backdrop-blur-lg border border-emerald-500/20 p-6 shadow-lg">
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Total Revenue</p>
              <p className="text-2xl font-black text-emerald-400 mt-2">${formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Transactions</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{payments.length}</p>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Avg. Transaction</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                ${payments.length > 0 ? formatCurrency(totalRevenue / payments.length) : "0.00"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/50 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4">User</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">No payments yet</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4 text-slate-900 dark:text-white font-medium">{p.user_name || "—"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          p.payment_type === "song" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : p.payment_type === "subscription" ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                          : p.payment_type === "ticket" ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                        }`}>
                          {p.payment_type || "—"}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold text-emerald-400">${formatCurrency(p.amount)}</td>
                      <td className="p-4 text-center">
                        <StatusBadge status={p.status || (p.payment_status || "completed")} />
                      </td>
                      <td className="p-4 hidden sm:table-cell text-slate-500 dark:text-slate-400 text-xs">
                        {p.payment_date ? new Date(p.payment_date).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── REPORTS ───── */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-16 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 rounded-2xl">
              <p className="text-slate-500 dark:text-slate-400">No reports to review</p>
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg">
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{r.song_title || "Unknown Song"}</h4>
                      <StatusBadge status={r.status || "pending"} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Reported by {r.reporter_name || "Anonymous"} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
                      "{r.reason || "No reason provided"}"
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setReportStatus(r.id, "reviewed")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition"
                    >
                      Mark Reviewed
                    </button>
                    <button onClick={() => setReportStatus(r.id, "dismissed")}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ───── SETTINGS ───── */}
      {activeTab === "settings" && (
        <div className="max-w-2xl space-y-6">
          {/* App Settings (Placeholder) */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Application Settings</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Configure global application settings. These settings affect all users.
            </p>
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Site Name</label>
                  <input type="text" defaultValue="ZemaLink"
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Site Email</label>
                  <input type="email" defaultValue="admin@zemalink.com"
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Currency</label>
                  <select defaultValue="ETB"
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="ETB">ETB (Birr)</option>
                    <option value="USD">USD (Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Maintenance Mode</label>
                  <select defaultValue="off"
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </div>
              </div>

              {/* Premium Pricing */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Premium Subscription Pricing</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Monthly Price</label>
                    <input type="number" step="0.01" value={premiumPrice}
                      onChange={(e) => setPremiumPrice(e.target.value)}
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Yearly Price</label>
                    <input type="number" step="0.01" defaultValue={(parseFloat(premiumPrice) * 10).toFixed(2)}
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Song Commission %</label>
                    <input type="number" step="0.1" defaultValue="15"
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <button type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold text-sm shadow-lg hover:shadow-primary-500/20 active:scale-[0.98] transition"
              >
                Save Settings
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.type === 'rejectSong') await rejectSong(confirmAction.id);
          else if (confirmAction.type === 'deleteSong') await deleteSong(confirmAction.id);
          else if (confirmAction.type === 'rejectMusician') await rejectMusician(confirmAction.id);
          else if (confirmAction.type === 'deleteUser') await deleteUser(confirmAction.id);
        }}
        title={
          confirmAction?.type === 'rejectSong' ? 'Reject Song' :
          confirmAction?.type === 'deleteSong' ? 'Delete Song' :
          confirmAction?.type === 'rejectMusician' ? 'Reject Registration' : 'Delete User'
        }
        message={
          confirmAction?.type === 'rejectSong' ? 'Reject this song?' :
          confirmAction?.type === 'deleteSong' ? 'Delete song permanently?' :
          confirmAction?.type === 'rejectMusician' ? 'Reject this registration?' : 'Delete this user permanently?'
        }
        confirmText={
          confirmAction?.type === 'rejectSong' ? 'Reject' :
          confirmAction?.type === 'deleteSong' ? 'Delete' :
          confirmAction?.type === 'rejectMusician' ? 'Reject' : 'Delete'
        }
        variant="danger"
      />
    </>
  );
}

export default AdminDashboard;
