import React from 'react';
import { SoccerDrill } from '../types.ts';
import { X, Clock, Layers, Shield, CheckCircle2, Tv } from 'lucide-react';

interface DrillDetailsSheetProps {
  drill: SoccerDrill;
  isOpen: boolean;
  onClose: () => void;
}

export const DrillDetailsSheet: React.FC<DrillDetailsSheetProps> = ({
  drill,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="drill-details-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="drill-details-card"
        className="w-full max-w-lg bg-[#0D1826] border border-[#1F334A] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#1A2C40] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00E5FF] px-2 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20">
              {drill.category}
            </span>
            <h2 className="text-base font-bold text-white mt-1">{drill.title}</h2>
          </div>
          <button
            id="drill-details-close-btn"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#1A2C40]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="bg-[#122236] p-2 rounded-xl border border-[#1A304C] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00E5FF]" />
            <div>
              <p className="text-[10px] text-gray-400">Duration</p>
              <p className="text-xs font-bold text-white">{drill.durationMinutes} mins</p>
            </div>
          </div>

          <div className="bg-[#122236] p-2 rounded-xl border border-[#1A304C] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FFD600]" />
            <div>
              <p className="text-[10px] text-gray-400">Drill Phases</p>
              <p className="text-xs font-bold text-white">{drill.phases.length} steps</p>
            </div>
          </div>

          <div className="bg-[#122236] p-2 rounded-xl border border-[#1A304C] flex items-center gap-2">
            <Tv className="w-4 h-4 text-[#69F0AE]" />
            <div>
              <p className="text-[10px] text-gray-400">Pitch View</p>
              <p className="text-xs font-bold text-white">{drill.pitchView} Pitch</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
            Tactical Overview
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed bg-[#112033] p-2.5 rounded-xl border border-[#1B2F46]">
            {drill.description}
          </p>
        </div>

        {/* Coaching Cues */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            Key Coaching Cues
          </h4>
          <div className="flex flex-col gap-1.5">
            {drill.coachingCues.map((cue, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 bg-[#122236] p-2 rounded-lg border border-[#1A304C]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#00E5FF] mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-200">{cue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phases Breakdown */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            Phase Sequence
          </h4>
          <div className="flex flex-col gap-2">
            {drill.phases.map((phase) => (
              <div
                key={phase.step}
                className="bg-[#112033] p-2.5 rounded-xl border border-[#1B2F46] flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00E5FF]">
                    Step {phase.step}: {phase.title}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {phase.durationSec}s
                  </span>
                </div>
                <p className="text-xs text-gray-300">{phase.instruction}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Authoritative Metadata Footer */}
        <div className="pt-2 border-t border-[#1A2C40] flex items-center justify-between text-[10px] text-gray-400">
          <div>
            <span>Author: </span>
            <span className="text-gray-200 font-semibold">
              {drill.isSystem
                ? 'CoachTactics System'
                : drill.createdByUsername
                ? `@${drill.createdByUsername} (${drill.createdByRole || 'Coach'})`
                : 'Authenticated Coach'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {drill.version && (
              <span className="px-1.5 py-0.5 rounded bg-[#16273B] text-[#00E5FF] font-mono border border-[#00E5FF]/20">
                v{drill.version}
              </span>
            )}
            {drill.createdAt && (
              <span>{new Date(drill.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
