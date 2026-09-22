import React, { useState } from 'react';
import { DrillPhase, SoccerDrill } from '../types.ts';
import {
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Pin,
  Mic,
  Lightbulb,
} from 'lucide-react';

interface CoachingExplanationOverlayProps {
  drill: SoccerDrill;
  currentPhase: DrillPhase;
  onOpenVoicePrompt: () => void;
  onOpenAddNote: () => void;
  onViewDrillDetails: () => void;
}

export const CoachingExplanationOverlay: React.FC<CoachingExplanationOverlayProps> = ({
  drill,
  currentPhase,
  onOpenVoicePrompt,
  onOpenAddNote,
  onViewDrillDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      id="coaching-explanation-overlay"
      className="w-full bg-[#0E1B2B]/90 backdrop-blur-md border border-[#1E3249] rounded-xl p-3 shadow-lg text-white transition-all flex flex-col gap-2"
    >
      {/* Primary header bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#00E5FF]/20 text-[#00E5FF] rounded-md border border-[#00E5FF]/30">
            Step {currentPhase.step}
          </span>
          <h3 className="font-bold text-sm text-white truncate">
            {currentPhase.title}
          </h3>
        </div>

        {/* Action quick buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            id="overlay-btn-add-note"
            onClick={onOpenAddNote}
            className="px-2.5 py-1 text-xs font-semibold bg-[#16273C] hover:bg-[#1E3552] text-[#FFE082] border border-[#FFE082]/30 rounded-lg transition-colors flex items-center gap-1.5"
            title="Pin Tactical Note on Pitch"
          >
            <Pin className="w-3 h-3" />
            <span className="hidden sm:inline">Pin Note</span>
          </button>

          <button
            id="overlay-btn-voice-prompt"
            onClick={onOpenVoicePrompt}
            className="px-2.5 py-1 text-xs font-semibold bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,229,255,0.4)]"
            title="AI Coach Voice Note / Prompt"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="font-bold">Prompt AI</span>
          </button>

          <button
            id="overlay-btn-expand-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#16273C] transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Instruction text */}
      <p className="text-xs text-gray-200 leading-relaxed font-normal bg-[#112033]/60 p-2 rounded-lg border border-[#1B2F46]">
        {currentPhase.instruction}
      </p>

      {/* Expanded Tactical Coaching Cues */}
      {isExpanded && (
        <div className="pt-2 border-t border-[#1C324E] flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#FFD600]" />
              Coaching Points & Cues:
            </span>
            <button
              id="overlay-btn-view-drill-info"
              onClick={onViewDrillDetails}
              className="text-[11px] text-[#00E5FF] hover:underline flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              <span>Full Tactical Overview</span>
            </button>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-300">
            {drill.coachingCues.map((cue, idx) => (
              <li
                key={idx}
                className="flex items-start gap-1.5 bg-[#122236] p-1.5 rounded-md border border-[#1A304C]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] mt-1.5 flex-shrink-0" />
                <span className="text-[11px] leading-tight">{cue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
