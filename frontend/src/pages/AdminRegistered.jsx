import { useEffect, useMemo, useState } from "react";
import { adminService } from "../services/adminService";

function AdminRegistered() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [approval, setApproval] = useState("all");
  const [subscription, setSubscription] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      const res = await adminService.getUsers();
      if (res.success) setUsers(res.users || []);
      setLoading(false);
    };
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesQuery =
        query.trim() === "" ||
        user.name?.toLowerCase().includes(query.toLowerCase()) ||
        user.email?.toLowerCase().includes(query.toLowerCase());
      const matchesRole = role === "all" || user.role === role;
      const matchesApproval =
        approval === "all" ||
        (approval === "approved" && Number(user.is_approved) === 1) ||
        (approval === "pending" && Number(user.is_approved) === 0);
      const userSub = user.subscription_status || user.subscription || "free";
      const matchesSubscription =
        subscription === "all" || userSub === subscription;
      return (
        matchesQuery &&
        matchesRole &&
        matchesApproval &&
        matchesSubscription
      );
    });
  }, [approval, query, role, subscription, users]);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-5">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          Registered users
        </h1>
        <p className="text-sm text-white/55 mt-2">
          Professional overview of all registered accounts and statuses.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 grid gap-3 md:grid-cols-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/35"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="musician">Musician</option>
          <option value="audience">Audience</option>
        </select>
        <select
          value={approval}
          onChange={(e) => setApproval(e.target.value)}
          className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
        >
          <option value="all">All approval states</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={subscription}
          onChange={(e) => setSubscription(e.target.value)}
          className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
        >
          <option value="all">All subscriptions</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-white/60 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Approval</th>
              <th className="p-3">Subscription</th>
              <th className="p-3">Expires</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-6 text-white/50" colSpan={6}>
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td className="p-6 text-white/50" colSpan={6}>
                  No users found for the selected filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/5">
                  <td className="p-3 text-white">{user.name}</td>
                  <td className="p-3 text-white/70">{user.email}</td>
                  <td className="p-3">
                    <span className="rounded-full px-2 py-1 text-xs bg-white/10 text-white">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        Number(user.is_approved) === 1
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {Number(user.is_approved) === 1 ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="p-3 text-white/70">
                    {user.subscription_status || user.subscription || "free"}
                  </td>
                  <td className="p-3 text-white/50">
                    {user.subscription_expires || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminRegistered;
