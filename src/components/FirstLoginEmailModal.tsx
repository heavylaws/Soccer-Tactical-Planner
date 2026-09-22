import React, { useState } from 'react';
import { UserProfile } from '../types.ts';
import { Mail, Check, Sparkles } from 'lucide-react';

interface FirstLoginEmailModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onSubmitEmail: (email: string) => void;
}

export const FirstLoginEmailModal: React.FC<FirstLoginEmailModalProps> = ({
  isOpen,
  currentUser,
  onSubmitEmail,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }
    onSubmitEmail(cleanEmail);
  };

  return (
    <div
      id="first-login-email-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#060D17]/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        id="first-login-email-modal-card"
        className="w-full max-w-md bg-[#0D1826] border border-[#21374E] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF]">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Account Verification Setup</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#182C44] text-[#00E5FF] border border-[#00E5FF]/30">
                @{currentUser.username}
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Welcome, <strong className="text-white">{currentUser.name}</strong>! Attach your email address.
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#112032] border border-[#1E344F] rounded-xl text-xs text-gray-300 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-[#00E5FF] flex-shrink-0 mt-0.5" />
          <span>
            On your first login, we stick an email address to your username (<strong>{currentUser.username}</strong>) for tactic reports, export notifications, and recovery purposes.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <p className="text-xs text-[#FF8A80] font-medium">{error}</p>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Your Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="first-login-email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="coach@example.com"
                required
                className="w-full bg-[#132338] border border-[#223953] focus:border-[#00E5FF] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            id="first-login-email-submit-btn"
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#08121E] font-bold text-sm rounded-xl shadow-[0_0_16px_rgba(0,229,255,0.35)] transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm & Continue to Dashboard</span>
          </button>
        </form>
      </div>
    </div>
  );
};
