import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types.ts';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Edit2,
  X,
  Check,
  Key,
  Mail,
  User,
  AlertTriangle,
  Crown,
  Shield,
  Eye,
} from 'lucide-react';

interface SuperAdminUserManagerProps {
  isOpen: boolean;
  currentUser: UserProfile;
  users: UserProfile[];
  onClose: () => void;
  onAddUser: (user: Omit<UserProfile, 'id'>) => void;
  onUpdateUser: (id: string, updates: Partial<UserProfile>) => void;
  onDeleteUser: (id: string) => void;
}

export const SuperAdminUserManager: React.FC<SuperAdminUserManagerProps> = ({
  isOpen,
  currentUser,
  users,
  onClose,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CLIENT');
  const [team, setTeam] = useState('Senior Academy');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const MIN_PASSWORD = 10;

  // 16 chars from an unambiguous alphabet, generated with the browser CSPRNG.
  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_!@#';
    const bytes = new Uint32Array(16);
    crypto.getRandomValues(bytes);
    const generated = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    setPassword(generated);
    setShowPassword(true);
  };

  const resetForm = () => {
    setEditingUserId(null);
    setIsCreatingNew(false);
    setUsername('');
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setRole('CLIENT');
    setTeam('Senior Academy');
    setError(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreatingNew(true);
  };

  const handleStartEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setIsCreatingNew(false);
    setUsername(user.username);
    setName(user.name);
    setEmail(user.email || '');
    setPassword(''); // Leave empty unless resetting password
    setRole(user.role);
    setTeam(user.team || 'Senior Academy');
    setError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setError('Username is required.');
      return;
    }

    const cleanPassword = password.trim();
    if ((isCreatingNew || cleanPassword.length > 0) && cleanPassword.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters. Use "Generate" for a strong one.`);
      return;
    }
    if (editingUserId === currentUser.id && role !== currentUser.role) {
      setError('You cannot change your own role.');
      return;
    }

    if (isCreatingNew) {
      if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
        setError('A user with this username already exists.');
        return;
      }
      onAddUser({
        username: cleanUser,
        name: name.trim() || cleanUser,
        email: email.trim(),
        password: cleanPassword,
        role,
        team: team.trim() || 'Tactics Club',
        avatarColor: role === 'SUPER_ADMIN' ? '#00E5FF' : role === 'CLIENT' ? '#FFD600' : '#00E676',
        needsEmailSetup: !email.trim(),
      });
      resetForm();
    } else if (editingUserId) {
      const updates: Partial<UserProfile> = {
        username: cleanUser,
        name: name.trim() || cleanUser,
        email: email.trim(),
        role,
        team: team.trim(),
      };
      if (password.trim().length > 0) {
        updates.password = password.trim();
      }
      onUpdateUser(editingUserId, updates);
      resetForm();
    }
  };

  const roleColors: Record<UserRole, string> = {
    SUPER_ADMIN: 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40',
    HEAD_COACH: 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/40',
    ASSISTANT_COACH: 'bg-[#69F0AE]/20 text-[#69F0AE] border-[#69F0AE]/40',
    CLIENT: 'bg-[#FFD600]/20 text-[#FFD600] border-[#FFD600]/40',
    PLAYER: 'bg-[#FF6E40]/20 text-[#FF6E40] border-[#FF6E40]/40',
  };

  return (
    <div
      id="super-admin-user-manager-backdrop"
      className="fixed inset-0 z-50 bg-[#060D17]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="super-admin-user-manager-card"
        className="w-full max-w-2xl bg-[#0D1826] border border-[#21374E] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C334E] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Super Admin User Management</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">
                  HeavyLaws Mode
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Add, edit, remove accounts, assign roles, and manage client access credentials
              </p>
            </div>
          </div>
          <button
            id="close-super-admin-user-manager-btn"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1C324D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
          {/* Create or Edit Form */}
          {(isCreatingNew || editingUserId) ? (
            <form onSubmit={handleSave} className="p-4 bg-[#122236] border border-[#1E3652] rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1D3450]">
                <h4 className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
                  {isCreatingNew ? 'Create New User Account' : 'Edit User Profile & Credentials'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-2.5 bg-[#FF1744]/15 border border-[#FF1744]/40 rounded-lg text-xs text-[#FF8A80]">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Username (login key)
                  </label>
                  <input
                    id="admin-form-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. coach_dan"
                    required
                    className="w-full bg-[#162A42] border border-[#243D5B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    {isCreatingNew ? 'Initial Password' : 'Reset Password (optional)'}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="admin-form-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isCreatingNew ? `At least ${MIN_PASSWORD} characters` : 'Leave empty to keep existing'}
                      required={isCreatingNew}
                      minLength={isCreatingNew ? MIN_PASSWORD : undefined}
                      autoComplete="new-password"
                      className="w-full min-w-0 bg-[#162A42] border border-[#243D5B] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]"
                    />
                    <button
                      type="button"
                      id="admin-form-generate-password"
                      onClick={generatePassword}
                      className="px-2 py-1.5 text-[11px] font-semibold rounded-lg bg-[#1E3652] hover:bg-[#264569] text-gray-200 flex-shrink-0"
                    >
                      Generate
                    </button>
                  </div>
                  {showPassword && password && (
                    <p className="mt-1 text-[10px] text-[#FFD600]">
                      Copy this password now and share it privately. It won't be shown again.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    id="admin-form-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-[#162A42] border border-[#243D5B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="admin-form-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-[#162A42] border border-[#243D5B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Assigned Role
                  </label>
                  <select
                    id="admin-form-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-[#162A42] border border-[#243D5B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  >
                    <option value="CLIENT">CLIENT (Clean slate, 0 initial trainings)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full system access)</option>
                    <option value="HEAD_COACH">HEAD_COACH (Full tactical control)</option>
                    <option value="ASSISTANT_COACH">ASSISTANT_COACH (Collaborator)</option>
                    <option value="PLAYER">PLAYER (Study Mode)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Squad / Team
                  </label>
                  <input
                    id="admin-form-team"
                    type="text"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    placeholder="e.g. U19 Academy"
                    className="w-full bg-[#162A42] border border-[#243D5B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1D3450]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="admin-form-save-btn"
                  type="submit"
                  className="px-4 py-1.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#08121E] font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isCreatingNew ? 'Create User' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">
                Total Registered Users: <strong className="text-white">{users.length}</strong>
              </span>
              <button
                id="admin-add-new-user-btn"
                onClick={handleStartCreate}
                className="px-3 py-1.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add New User</span>
              </button>
            </div>
          )}

          {/* Users List Table */}
          <div className="border border-[#1E3652] rounded-xl overflow-hidden bg-[#101D2E]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14263B] text-gray-300 font-bold border-b border-[#1E3652]">
                <tr>
                  <th className="p-3">User & Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Security</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182C44]">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const isSuperAdminAccount = u.role === 'SUPER_ADMIN' && users.filter((x) => x.role === 'SUPER_ADMIN').length <= 1;
                  return (
                    <tr key={u.id} className="hover:bg-[#14263A] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-[#060D17]"
                            style={{ backgroundColor: u.avatarColor || '#00E5FF' }}
                          >
                            {(u.username || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block">
                              {u.name || u.username}
                            </span>
                            <span className="text-[11px] text-[#00E5FF] font-mono">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleColors[u.role] || roleColors.CLIENT}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.email ? (
                          <span className="text-gray-300 text-[11px] font-mono">{u.email}</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 italic">Pending email</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          bcrypt hashed
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            id={`edit-user-btn-${u.username}`}
                            onClick={() => handleStartEdit(u)}
                            title="Edit User"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E3652] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isSuperAdminAccount && !isCurrent && (
                            <button
                              id={`delete-user-btn-${u.username}`}
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove user @${u.username}?`)) {
                                  onDeleteUser(u.id);
                                }
                              }}
                              title="Delete User"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#FF5252] hover:bg-[#1E3652] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#1C334E] flex items-center justify-between text-xs text-gray-400">
          <span>
            Logged in as <strong className="text-white">@{currentUser.username}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#182C42] hover:bg-[#203B5A] text-white font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
