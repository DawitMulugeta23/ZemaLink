import { useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ConfirmDialog from '../common/ConfirmDialog';

const ROLE_OPTIONS = [
  { value: 'audience', label: 'Audience' },
  { value: 'musician', label: 'Musician' },
  { value: 'admin', label: 'Admin' },
];

const ITEMS_PER_PAGE = 10;

function getStatusBadge(status, isDark) {
  const base = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium';
  if (status === 'active' || status === 'approved')
    return `${base} ${isDark ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-green-100 text-green-700 border border-green-200'}`;
  if (status === 'pending' || status === 'pending_approval')
    return `${base} ${isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200'}`;
  if (status === 'suspended' || status === 'rejected')
    return `${base} ${isDark ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-red-100 text-red-700 border border-red-200'}`;
  return `${base} ${isDark ? 'bg-slate-500/15 text-slate-400 border border-slate-500/20' : 'bg-slate-100 text-slate-600 border border-slate-200'}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

export default function UserManagement({ users = [], onUpdateRole, onDeleteUser, onApproveMusician, onRejectMusician }) {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [changingRoles, setChangingRoles] = useState({});
  const [actionBusy, setActionBusy] = useState({});

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.status || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleRoleChange = async (userId, newRole) => {
    setChangingRoles((prev) => ({ ...prev, [userId]: newRole }));
    setActionBusy((prev) => ({ ...prev, [userId]: true }));
    try {
      await onUpdateRole(userId, newRole);
    } finally {
      setActionBusy((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDeleteUser(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleApprove = async (userId) => {
    setActionBusy((prev) => ({ ...prev, [userId]: true }));
    try { await onApproveMusician(userId); } finally { setActionBusy((prev) => ({ ...prev, [userId]: false })); }
  };

  const handleReject = async (userId) => {
    setActionBusy((prev) => ({ ...prev, [userId]: true }));
    try { await onRejectMusician(userId); } finally { setActionBusy((prev) => ({ ...prev, [userId]: false })); }
  };

  const isPendingMusician = (u) =>
    u.role === 'musician' && (u.status === 'pending' || u.status === 'pending_approval');

  return (
    <>
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900/80 border-white/10 backdrop-blur-xl' : 'bg-white/80 border-slate-200 backdrop-blur-xl'
      }`}>
        <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Users <span className={`text-sm font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>({users.length})</span>
            </h3>
            <div className="relative">
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className={`w-full sm:w-72 pl-10 pr-4 py-2 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  isDark
                    ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                <th className={`p-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Name</th>
                <th className={`p-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Email</th>
                <th className={`p-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Role</th>
                <th className={`p-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Status</th>
                <th className={`p-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Joined</th>
                <th className={`p-3 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`p-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {search ? 'No users match your search' : 'No users found'}
                  </td>
                </tr>
              ) : (
                paginated.map((u) => (
                  <tr key={u.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                    <td className={`p-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {(u.name || '?')[0].toUpperCase()}
                        </div>
                        <span className="font-medium truncate max-w-[160px]">{u.name}</span>
                      </div>
                    </td>
                    <td className={`p-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="truncate max-w-[200px] block">{u.email}</span>
                    </td>
                    <td className="p-3">
                      <select
                        value={changingRoles[u.id] ?? u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={actionBusy[u.id]}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 ${
                          isDark
                            ? 'bg-slate-800 border-white/10 text-slate-200'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <span className={getStatusBadge(u.status, isDark)}>
                        {u.status === 'pending' || u.status === 'pending_approval' ? 'Pending' :
                         u.status === 'approved' || u.status === 'active' ? 'Active' :
                         u.status === 'suspended' ? 'Suspended' :
                         u.status === 'rejected' ? 'Rejected' : u.status || 'Active'}
                      </span>
                    </td>
                    <td className={`p-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {formatDate(u.created_at || u.joined_date)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPendingMusician(u) && (
                          <>
                            <button
                              onClick={() => handleApprove(u.id)}
                              disabled={actionBusy[u.id]}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                                isDark
                                  ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/20'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                              }`}
                            >
                              {actionBusy[u.id] ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(u.id)}
                              disabled={actionBusy[u.id]}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                                isDark
                                  ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                              }`}
                            >
                              {actionBusy[u.id] ? '...' : 'Reject'}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark
                              ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-100'
                          }`}
                          title="Delete user"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Page {page} of {totalPages} ({filtered.length} total)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                  isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    page === num
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25'
                      : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                  isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteTarget?.name || 'this user'}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
