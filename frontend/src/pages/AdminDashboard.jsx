import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import UserManagement from "../components/admin/UserManagement";
import { adminService } from "../services/adminService";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "musicians", label: "Pending musicians" },
  { id: "songs-pending", label: "Pending songs" },
  { id: "songs-all", label: "All songs" },
  { id: "users", label: "Users" },
  { id: "reports", label: "Reports" },
  { id: "payments", label: "Payments" },
];

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [pendingMusicians, setPendingMusicians] = useState([]);
  const [pendingSongs, setPendingSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [
      st,
      pm,
      ps,
      as,
      us,
      rp,
      pay,
    ] = await Promise.all([
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

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const approveMusician = async (id) => {
    const r = await adminService.approveMusician(id);
    if (r.success) loadAll();
    else toast.error(r.message || "Failed to approve musician");
  };

  const rejectMusician = async (id) => {
    if (!confirm("Reject this registration?")) return;
    const r = await adminService.rejectMusician(id);
    if (r.success) loadAll();
    else toast.error(r.message || "Failed to reject musician");
  };

  const approveSong = async (id) => {
    const r = await adminService.approveSong(id);
    if (r.success) loadAll();
    else toast.error(r.message || "Failed to approve song");
  };

  const rejectSong = async (id) => {
    if (!confirm("Reject and delete this song?")) return;
    const r = await adminService.rejectSong(id);
    if (r.success) loadAll();
    else toast.error(r.message || "Failed to reject song");
  };

  const toggleFeature = async (id, featured) => {
    await adminService.featureSong(id, featured ? 1 : 0);
    loadAll();
  };

  const savePremium = async (id, isPremium, price) => {
    await adminService.setSongPremium(id, isPremium ? 1 : 0, parseFloat(price) || 0);
    loadAll();
  };

  const deleteSong = async (id) => {
    if (!confirm("Delete song permanently?")) return;
    await adminService.deleteSong(id);
    loadAll();
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    const r = await adminService.deleteUser(id);
    if (r.success) loadAll();
    else toast.error(r.message || "Failed to delete user");
  };

  const updateRole = async (id, role) => {
    await adminService.updateRole(id, role);
    loadAll();
  };

  const resolveReport = async (id, status) => {
    await adminService.setReportStatus(id, status);
    loadAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
        Admin dashboard
      </h1>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeTab === t.id
                ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                : "text-white/60 hover:text-white bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Total users", stats.total_users],
            ["Total songs", stats.total_songs],
            ["Revenue (mock)", `$${Number(stats.revenue).toFixed(2)}`],
          ].map(([label, val]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
            >
              <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
              <p className="text-2xl font-bold text-white mt-2">{val}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "musicians" && (
        <div className="space-y-3">
          {pendingMusicians.length === 0 ? (
            <p className="text-white/50 text-center py-12">No pending musicians</p>
          ) : (
            pendingMusicians.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
              >
                <div>
                  <p className="font-semibold text-white">{m.name}</p>
                  <p className="text-sm text-white/50">{m.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveMusician(m.id)}
                    className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectMusician(m.id)}
                    className="rounded-xl border border-red-400/50 px-4 py-2 text-sm text-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "songs-pending" && (
        <div className="space-y-3">
          {pendingSongs.length === 0 ? (
            <p className="text-white/50 text-center py-12">No pending songs</p>
          ) : (
            pendingSongs.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
              >
                <div>
                  <p className="font-semibold text-white">{s.title}</p>
                  <p className="text-sm text-white/50">
                    {s.artist} · {s.uploader_name || "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveSong(s.id)}
                    className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectSong(s.id)}
                    className="rounded-xl border border-red-400/40 px-4 py-2 text-sm text-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "songs-all" && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-white/60">
                <th className="p-3">Title</th>
                <th className="p-3">Premium</th>
                <th className="p-3">Price</th>
                <th className="p-3">Featured</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allSongs.map((s) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="p-3 text-white">{s.title}</td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      defaultChecked={!!s.is_premium}
                      onChange={(e) =>
                        savePremium(s.id, e.target.checked, s.price || 0.99)
                      }
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={s.price}
                      className="w-24 rounded bg-black/40 border border-white/15 px-2 py-1 text-white"
                      onBlur={(e) =>
                        savePremium(s.id, !!s.is_premium, e.target.value)
                      }
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      defaultChecked={!!s.featured}
                      onChange={(e) => toggleFeature(s.id, e.target.checked)}
                    />
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => deleteSong(s.id)}
                      className="text-red-300 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "users" && (
        <UserManagement
          users={allUsers}
          onRoleChange={updateRole}
          onDelete={deleteUser}
        />
      )}

      {activeTab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-white/50 text-center py-12">No reports</p>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
              >
                <p className="text-white font-medium">{r.song_title}</p>
                <p className="text-xs text-white/45">
                  By {r.reporter_name} · {r.status}
                </p>
                <p className="text-sm text-white/70 mt-2">{r.reason}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => resolveReport(r.id, "reviewed")}
                    className="text-xs text-emerald-300 hover:underline"
                  >
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveReport(r.id, "dismissed")}
                    className="text-xs text-white/50 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "payments" && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-white/60">
                <th className="p-3">User</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="p-3 text-white">{p.user_name}</td>
                  <td className="p-3 text-white/70">{p.payment_type}</td>
                  <td className="p-3 text-white">${Number(p.amount).toFixed(2)}</td>
                  <td className="p-3 text-white/50">
                    {p.payment_date ? new Date(p.payment_date).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
