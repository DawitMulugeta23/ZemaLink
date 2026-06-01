import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { toast } from "react-toastify";

function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    new_follower: true,
    new_comment: true,
    new_song_release: false,
    event_reminders: true,
    marketing_emails: false,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const payload = { name: formData.name, bio: formData.bio };
      if (formData.currentPassword && formData.newPassword) {
        payload.current_password = formData.currentPassword;
        payload.new_password = formData.newPassword;
      }
      const res = await updateProfile(payload);
      if (res?.success !== false) {
        toast.success("Settings saved!");
        setFormData((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
      }
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.")) return;
    if (!confirm("Type 'DELETE' in the next prompt to confirm.")) return;
    const code = prompt("Type DELETE to confirm account deletion:");
    if (code !== "DELETE") {
      toast.error("Confirmation failed");
      return;
    }
    setDeleting(true);
    try {
      // Call delete account API
      toast.success("Account deleted (mock)");
    } catch (err) {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Profile Information */}
        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} readOnly
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3}
              placeholder="Tell others about yourself..."
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Current Password</label>
              <input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange}
                placeholder="Enter current password"
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">New Password</label>
                <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange}
                  placeholder="Enter new password"
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Confirm New Password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Notification Preferences</h2>
          <div className="space-y-3">
            {[
              { key: "email_notifications", label: "Email Notifications" },
              { key: "new_follower", label: "New Follower" },
              { key: "new_comment", label: "New Comment" },
              { key: "new_song_release", label: "New Song from Followed Artists" },
              { key: "event_reminders", label: "Event Reminders" },
              { key: "marketing_emails", label: "Marketing Emails" },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700 dark:text-slate-300">{n.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={notifications[n.key]}
                    onChange={() => setNotifications({ ...notifications, [n.key]: !notifications[n.key] })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Theme Preference */}
        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Theme</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Switch between dark and light mode</p>
            </div>
            <button onClick={toggleTheme}
              className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              {theme === "dark" ? (
                <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-red-500/20 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-red-400 mb-2">Delete Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button onClick={handleDeleteAccount} disabled={deleting}
            className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/20 disabled:opacity-50 transition"
          >
            {deleting ? "Deleting..." : "Delete My Account"}
          </button>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button onClick={handleSubmit} disabled={saving}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] disabled:opacity-50 transition"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
