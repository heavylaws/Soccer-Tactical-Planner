import React, { useState } from 'react';
import { UserProfile } from '../types.ts';
import { Lock, User, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  users: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  users,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();
    const targetUser = users.find(
      (u) => (u.username || '').toLowerCase() === cleanUser
    );

    if (!targetUser) {
      setError('Invalid username or account not found.');
      return;
    }

    if (targetUser.password && targetUser.password !== password) {
      setError('Incorrect password. Please verify credentials.');
      return;
    }

    // Success
    onLoginSuccess(targetUser);
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div
      id="login-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#060D17]/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        id="login-modal-card"
        className="w-full max-w-md bg-[#0D1826] border border-[#21374E] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-white animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#00B0FF] flex items-center justify-center text-[#060D17] shadow-[0_0_24px_rgba(0,229,255,0.4)] mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">
            CoachTactics Portal
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Sign in with authorized credentials to access professional soccer tactical drills & role playbooks
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {error && (
            <div
              id="login-error-alert"
              className="p-3 bg-[#FF1744]/15 border border-[#FF1744]/40 rounded-xl text-xs text-[#FF8A80] flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. heavylaws or c00ldude"
                required
                className="w-full bg-[#132338] border border-[#223953] focus:border-[#00E5FF] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#132338] border border-[#223953] focus:border-[#00E5FF] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#08121E] font-bold text-sm rounded-xl shadow-[0_0_16px_rgba(0,229,255,0.35)] transition-all flex items-center justify-center gap-2"
          >
            <span>Sign In to Tactics</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Preset Credentials for Testing */}
        <div className="pt-3 border-t border-[#1C324D] flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
            Authorized Quick Access Accounts:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="quick-fill-superadmin"
              onClick={() => handleQuickFill('heavylaws', 'A!t3r3g0')}
              className="p-2.5 rounded-xl bg-[#122236] hover:bg-[#182C44] border border-[#1E3652] hover:border-[#00E5FF]/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-[#00E5FF]">heavylaws</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF]">Super Admin</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Pass: A!t3r3g0</span>
            </button>

            <button
              type="button"
              id="quick-fill-client"
              onClick={() => handleQuickFill('c00ldude', '123456')}
              className="p-2.5 rounded-xl bg-[#122236] hover:bg-[#182C44] border border-[#1E3652] hover:border-[#FFD600]/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-[#FFD600]">c00ldude</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FFD600]/20 text-[#FFD600]">Client</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Pass: 123456</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
