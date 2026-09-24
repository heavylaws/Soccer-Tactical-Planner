import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Zap,
  Leaf,
  Database,
  Trash2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { getQuotaStats, clearClientCache, QuotaStats } from '../utils/drillCache';

interface QuotaStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** serverCleared is true only when the server confirmed the global cache reset. */
  onCacheCleared?: (serverCleared: boolean) => void;
  userId?: string;
  /** Needed in the AI Studio iframe, where the session cookie is not sent. */
  authToken?: string | null;
  /** Only super admins may reset the shared server cache (enforced by the server). */
  isSuperAdmin?: boolean;
}

export const QuotaStatsModal: React.FC<QuotaStatsModalProps> = ({
  isOpen,
  onClose,
  onCacheCleared,
  userId,
  authToken,
  isSuperAdmin = false,
}) => {
  const [stats, setStats] = useState<QuotaStats>({
    clientHits: 0,
    serverHits: 0,
    apiCalls: 0,
    totalSaved: 0,
  });
  const [serverStats, setServerStats] = useState<{
    cachedDrillsCount?: number;
    hitRatePercent?: number;
  }>({});
  const [isClearing, setIsClearing] = useState(false);
  const [clearedNotice, setClearedNotice] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  useEffect(() => {
    if (!isOpen) return;
    setStats(getQuotaStats(userId));
    setClearError(null);
    let cancelled = false;
    fetch('/api/cache-stats', { credentials: 'include', headers: authHeaders })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (!cancelled) setServerStats(data || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, authToken]);

  const handleClear = async () => {
    setIsClearing(true);
    setClearError(null);
    clearClientCache();
    setStats({ clientHits: 0, serverHits: 0, apiCalls: 0, totalSaved: 0 });

    let serverCleared = false;
    if (isSuperAdmin) {
      try {
        const res = await fetch('/api/clear-cache', { method: 'POST', credentials: 'include', headers: authHeaders });
        serverCleared = res.ok;
        if (!res.ok) setClearError('The server cache could not be reset. Browser cache was cleared.');
      } catch {
        setClearError('The server cache could not be reset. Browser cache was cleared.');
      }
    }

    setIsClearing(false);
    setClearedNotice(serverCleared ? 'Server cache reset and re-seeded with the sample drills.' : 'Cached drills in this browser were cleared.');
    setTimeout(() => setClearedNotice(null), 2500);
    if (onCacheCleared) onCacheCleared(serverCleared);
  };

  if (!isOpen) return null;

  return (
    <div
      id="quota-stats-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="quota-stats-modal-card"
        className="w-full max-w-md bg-[#0D1826] border border-[#1F334A] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A2C40] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>API Quota & Tactical Cache</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Zero Cost
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Preserving Gemini API quotas and accelerating drill playback
              </p>
            </div>
          </div>
          <button
            id="quota-stats-close-btn"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1A2C40] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metrics Overview Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 bg-[#112032] border border-[#1C324E] rounded-xl flex flex-col">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>API Calls Saved</span>
            </span>
            <span className="text-2xl font-black text-white mt-1">
              {stats.totalSaved}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
              100% Free / Zero Quota
            </span>
          </div>

          <div className="p-3 bg-[#112032] border border-[#1C324E] rounded-xl flex flex-col">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>Cached Drills</span>
            </span>
            <span className="text-2xl font-black text-white mt-1">
              {serverStats.cachedDrillsCount ?? '—'}
            </span>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
              Includes pre-seeded samples
            </span>
          </div>

          <div className="p-3 bg-[#112032] border border-[#1C324E] rounded-xl flex flex-col">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              <span>Client Hits (0ms)</span>
            </span>
            <span className="text-lg font-bold text-white mt-1">
              {stats.clientHits}
            </span>
            <span className="text-[10px] text-gray-400">
              Browser Local Storage
            </span>
          </div>

          <div className="p-3 bg-[#112032] border border-[#1C324E] rounded-xl flex flex-col">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Live AI Calls</span>
            </span>
            <span className="text-lg font-bold text-white mt-1">
              {stats.apiCalls}
            </span>
            <span className="text-[10px] text-gray-400">
              Gemini (server-side)
            </span>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="p-3 bg-[#132338]/60 border border-[#213854] rounded-xl text-xs text-gray-300 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>How CoachTactics Preserves Quota:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-300">
            • <strong>Exact-match cache:</strong> Repeating the same prompt, formation, focus area and pitch view (ignoring case, spacing and trailing punctuation) returns the cached drill with no new AI call.
          </p>
          <p className="text-[11px] leading-relaxed text-gray-300">
            • <strong>Offline engine:</strong> Eco mode, and any Gemini outage, uses the built-in template engine at no API cost. Results are labelled when this happens.
          </p>
          <p className="text-[11px] leading-relaxed text-gray-300">
            • <strong>Per-user limit:</strong> Live Gemini generation is limited per user; cache hits and eco mode do not count.
          </p>
        </div>

        {/* Clear Notice */}
        {clearedNotice && !clearError && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{clearedNotice}</span>
          </div>
        )}
        {clearError && (
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400" role="alert">
            {clearError}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1A2C40]">
          <button
            id="quota-clear-cache-btn"
            type="button"
            onClick={handleClear}
            disabled={isClearing}
            className="px-3 py-1.5 bg-[#1C2C3E] hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-[#2A3E54] hover:border-red-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isSuperAdmin ? 'Clear & Reseed Cache' : 'Clear Browser Cache'}</span>
          </button>

          <button
            id="quota-close-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-xs rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
