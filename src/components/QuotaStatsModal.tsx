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
  onCacheCleared?: () => void;
}

export const QuotaStatsModal: React.FC<QuotaStatsModalProps> = ({
  isOpen,
  onClose,
  onCacheCleared,
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
  const [clearedNotice, setClearedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStats(getQuotaStats());
      fetch('/api/cache-stats')
        .then((res) => res.json())
        .then((data) => setServerStats(data))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleClear = async () => {
    setIsClearing(true);
    clearClientCache();
    try {
      await fetch('/api/clear-cache', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    setStats({ clientHits: 0, serverHits: 0, apiCalls: 0, totalSaved: 0 });
    setIsClearing(false);
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 2500);
    if (onCacheCleared) onCacheCleared();
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
              {serverStats.cachedDrillsCount ?? 8}
            </span>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
              Pre-warmed UEFA Playbook
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
              Gemini 3.1 Flash-Lite
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
            • <strong>Deterministic Normalization:</strong> Queries like "overlapping wing cross" and "winger cross overlap" match the same canonical cached tactical plan.
          </p>
          <p className="text-[11px] leading-relaxed text-gray-300">
            • <strong>UEFA Synthesizer:</strong> Eliminates service overload errors and rate limits by synthesizing tactical drills offline at $0 API cost.
          </p>
          <p className="text-[11px] leading-relaxed text-gray-300">
            • <strong>Gemini 3.1 Flash-Lite:</strong> Configured for minimal token consumption and maximum free quota allocation.
          </p>
        </div>

        {/* Clear Notice */}
        {clearedNotice && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Cache reset and re-seeded with UEFA tactics!</span>
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
            <span>Clear & Reseed Cache</span>
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
