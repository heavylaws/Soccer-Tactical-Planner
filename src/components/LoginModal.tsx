import React, { useState } from 'react';
import { UserProfile } from '../types.ts';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  users?: UserProfile[];
  onLoginSuccess: (user: UserProfile, token?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: cleanUser,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid credentials. Please verify username and password.');
        return;
      }

      // Successful server-side authentication
      onLoginSuccess(data.user, data.token);
    } catch {
      setError('Unable to reach authentication server. Please check your connection.');
    } finally {
      setLoading(false);
    }
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
                placeholder="Your username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                required
                className="w-full bg-[#132338] border border-[#223953] focus:border-[#00E5FF] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors disabled:opacity-50"
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
                autoComplete="current-password"
                disabled={loading}
                required
                className="w-full bg-[#132338] border border-[#223953] focus:border-[#00E5FF] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#08121E] font-bold text-sm rounded-xl shadow-[0_0_16px_rgba(0,229,255,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Tactics</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-gray-500 text-center">
          No account yet? Ask your club administrator to create one for you.
        </p>
      </div>
    </div>
  );
};
