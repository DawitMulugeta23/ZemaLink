/**
 * Reusable user table for admin tooling (roles + delete).
 */
function UserManagement({ users, onRoleChange, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-white/60">
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-white/5">
              <td className="p-3 text-white">{u.name}</td>
              <td className="p-3 text-white/70">{u.email}</td>
              <td className="p-3">
                <select
                  value={u.role}
                  onChange={(e) => onRoleChange(u.id, e.target.value)}
                  className="rounded-lg bg-black/40 border border-white/15 px-2 py-1 text-white"
                >
                  <option value="audience">audience</option>
                  <option value="musician">musician</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="p-3">
                <button
                  type="button"
                  onClick={() => onDelete(u.id)}
                  className="text-red-300 text-xs hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserManagement;
