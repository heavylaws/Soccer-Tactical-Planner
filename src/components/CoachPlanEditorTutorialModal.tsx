import React, { useState } from 'react';
import {
  X,
  MousePointer,
  MoveRight,
  GitCommit,
  Play,
  Pause,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Tv,
  Gauge,
  Sliders,
  HelpCircle,
  ArrowRight,
  Shield,
  Layers,
  Flame,
  Zap,
  StickyNote,
  Keyboard,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface CoachPlanEditorTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlaybook?: () => void;
}

type TutorialTab =
  | 'OVERVIEW'
  | 'PLAYERS'
  | 'ARROWS_PASSES'
  | 'PHASES'
  | 'PREVIEW'
  | 'SAVING_AI'
  | 'EXAMPLE';

export const CoachPlanEditorTutorialModal: React.FC<CoachPlanEditorTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenPlaybook,
}) => {
  const [activeTab, setActiveTab] = useState<TutorialTab>('OVERVIEW');

  if (!isOpen) return null;

  const tabs: { id: TutorialTab; label: string; icon: React.ElementType }[] = [
    { id: 'OVERVIEW', label: '1. Manual Workflow', icon: HelpCircle },
    { id: 'PLAYERS', label: '2. Players & Movement', icon: MousePointer },
    { id: 'ARROWS_PASSES', label: '3. Arrows & Passes', icon: MoveRight },
    { id: 'PHASES', label: '4. Phases & Isolation', icon: Layers },
    { id: 'PREVIEW', label: '5. Playback & Speeds', icon: Play },
    { id: 'SAVING_AI', label: '6. Saving & AI Synergy', icon: Save },
    { id: 'EXAMPLE', label: '7. Full Coaching Scenario', icon: Sparkles },
  ];

  return (
    <div
      id="coach-tutorial-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="coach-tutorial-modal-content"
        className="bg-[#0A1420] border border-[#1E324A] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1A2C42] bg-[#0E1A2A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                CoachTactics Plan Editor Guide
                <span className="text-[10px] font-semibold text-[#00E5FF] px-2 py-0.5 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                  Manual & AI Coaching
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Master tactical choreography, destination handles, pass corridors, and phase animation.
              </p>
            </div>
          </div>
          <button
            id="coach-tutorial-btn-close"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#142337] hover:bg-[#1C324E] text-gray-400 hover:text-white transition-colors border border-[#203650]"
            title="Close Tutorial (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#0C1725] border-b border-[#17273A] overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`coach-tutorial-tab-${tab.id.toLowerCase()}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#00E5FF] text-[#0A131F] border-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                    : 'bg-[#101F31] text-gray-300 border-[#1B2F46] hover:bg-[#162A43] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-gray-200 text-xs sm:text-sm space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00E5FF]" />
                  Section 1 — Create a Plan Manually (Without AI)
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed">
                  As a football coach, you have full tactical autonomy. While CoachTactics offers an AI
                  drill designer, <strong>you can create and choreograph complete tactical plans entirely manually</strong>,
                  from scratch, with zero AI involvement.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400">
                  The Core Coaching Workflow
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-[#0F1B2A] border border-[#1C2F46] p-3 rounded-lg flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-white block text-xs">Open Tactical Board</strong>
                      <span className="text-[11px] text-gray-400">
                        Select Full Pitch or Half Pitch depending on your session context.
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0F1B2A] border border-[#1C2F46] p-3 rounded-lg flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-white block text-xs">Position Players</strong>
                      <span className="text-[11px] text-gray-400">
                        Use the Move tool to drag players to their initial starting positions.
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0F1B2A] border border-[#1C2F46] p-3 rounded-lg flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-white block text-xs">Assign Movement Destinations</strong>
                      <span className="text-[11px] text-gray-400">
                        Drag the destination target handles or draw movement arrows to define runs.
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0F1B2A] border border-[#1C2F46] p-3 rounded-lg flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      <strong className="text-white block text-xs">Choreograph Ball & Passes</strong>
                      <span className="text-[11px] text-gray-400">
                        Use the Pass tool to draw passing lines from the soccer ball to target space.
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0F1B2A] border border-[#1C2F46] p-3 rounded-lg flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      5
                    </span>
                    <div>
                      <strong className="text-white block text-xs">Organize Sequential Phases</strong>
                      <span className="text-[11px] text-gray-400">
                        Break down your drill into Phase 1 (trigger), Phase 2 (switch), and Phase 3 (finish).
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#0F1B2A] border border-[#1C2F46] p-3 rounded-lg flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      6
                    </span>
                    <div>
                      <strong className="text-white block text-xs">Preview & Save Plan</strong>
                      <span className="text-[11px] text-gray-400">
                        Play the animation, scrub the timeline, and click Save Plan to store in Playbook.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0C1827] border border-[#1A2E44] p-3.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00E5FF]" />
                  <span className="text-xs text-gray-300">
                    Want to start from an existing drill or system template?
                  </span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenPlaybook?.();
                  }}
                  className="px-3 py-1 bg-[#14263B] hover:bg-[#1D3552] text-[#00E5FF] font-semibold text-xs rounded-lg border border-[#00E5FF]/30 transition-colors"
                >
                  Open Playbook
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PLAYERS & MOVEMENT */}
          {activeTab === 'PLAYERS' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Section 2 */}
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-[#00E5FF]" />
                  Section 2 — Move a Player (Starting Position)
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  Every player marker on the pitch has an authoritative starting location for the current phase:
                </p>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Select the <strong className="text-white">Move / Reposition tool</strong> (mouse pointer icon) on the top telestrator toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Click and drag any player marker (e.g. #4, #8, #9). As you drag, the player’s starting coordinate for this phase updates immediately.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#00E5FF]">Trajectory Preservation:</strong> When you drag a player, their assigned run/destination moves with them proportionally, maintaining their tactical movement vector.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Moving a player does <strong>not</strong> require regenerating with AI. The edited coordinate immediately becomes part of your active tactical plan.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <MoveRight className="w-4 h-4 text-[#00E5FF]" />
                  Section 3 — Give a Player a Movement Destination
                </h3>

                <div className="bg-[#0B1522] border border-[#1B2F47] p-3 rounded-lg mb-3">
                  <h4 className="text-xs font-bold text-[#00E5FF] mb-1">
                    Crucial Tactical Concept: Position vs. Movement Destination
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-[#101E2E]">
                      <strong className="text-white block mb-0.5">Player Position (Start)</strong>
                      <span className="text-gray-400 text-[11px]">
                        Where the player stands at the start of the phase (0.0s / 0% progress).
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#101E2E]">
                      <strong className="text-white block mb-0.5">Movement Destination (Target)</strong>
                      <span className="text-gray-400 text-[11px]">
                        Where the player runs to during the phase animation (100% progress).
                      </span>
                    </div>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white mb-1.5">How to set a destination:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-300">
                  <li>
                    Select the player or observe the <strong className="text-white">glowing circular destination handle</strong> connected to the player by a dashed trajectory line.
                  </li>
                  <li>
                    Click and drag the destination handle directly across the pitch to any space (e.g. into the half-space or box).
                  </li>
                  <li>
                    When you hit <strong className="text-white">Play</strong>, the player smoothly animates from their starting position to this exact destination!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: ARROWS & PASSES */}
          {activeTab === 'ARROWS_PASSES' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Section 4 */}
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <MoveRight className="w-4 h-4 text-[#00E5FF]" />
                  Section 4 — Use the Movement Arrow Tool
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  The <strong className="text-white">Movement Arrow tool</strong> provides a fast, intuitive way to assign runs:
                </p>
                <div className="bg-[#0B1522] border border-[#1A2D44] p-3 rounded-lg mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00E5FF] mb-1">
                    <span>Direct Workflow:</span>
                    <span className="font-mono bg-[#142337] px-2 py-0.5 rounded text-white text-[11px]">
                      Player → Drag Arrow → Release at Destination
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    1. Select the <strong>Movement Arrow</strong> tool from the toolbar.<br />
                    2. Click or tap directly on or near a player marker.<br />
                    3. Drag an arrow in the direction of their intended tactical run.<br />
                    4. Release. CoachTactics immediately sets that player's authoritative destination!
                  </p>
                </div>
                <p className="text-[11px] text-gray-400">
                  <em>Tip:</em> If you draw an arrow in open space (not starting at a player), it functions as a regular telestrator diagram arrow for coaching illustrations.
                </p>
              </div>

              {/* Section 5 */}
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-[#FFD600]" />
                  Section 5 — Create a Pass & Ball Movement
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  The ball movement is choreographed with equal precision:
                </p>
                <div className="bg-[#0B1522] border border-[#1A2D44] p-3 rounded-lg mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600] mb-1">
                    <span>Passing Workflow:</span>
                    <span className="font-mono bg-[#142337] px-2 py-0.5 rounded text-white text-[11px]">
                      Soccer Ball → Drag Pass Vector → Release at Target
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    1. Select the <strong>Passing Vector</strong> (PASS) tool.<br />
                    2. Click or tap on the soccer ball.<br />
                    3. Drag toward the receiving player or space.<br />
                    4. Release. The pass corridor is established, and the ball will travel along this corridor during animation playback!
                  </p>
                </div>
                <div className="bg-[#101D2C] p-2.5 rounded border border-[#1C324A] text-[11px] text-gray-300 space-y-1">
                  <strong className="text-white block">Alternative Dragging in Move Mode:</strong>
                  <span>
                    In <strong>Move mode</strong>, you can also drag the soccer ball directly to reposition its start, or drag its destination handle to adjust pass length.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PHASES */}
          {activeTab === 'PHASES' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#00E5FF]" />
                  Section 6 — Work With Phases & Phase Isolation
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  Soccer drills rarely happen in a single instant. CoachTactics organizes tactical exercises into <strong>chronological Phases</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 text-xs">
                  <div className="bg-[#0B1522] border border-[#1B2F47] p-2.5 rounded-lg">
                    <strong className="text-[#00E5FF] block mb-1">Phase 1: Trigger</strong>
                    <span className="text-gray-400 text-[11px]">
                      Initial shape, pressing trap trigger, or center-back build-up pass into pivot.
                    </span>
                  </div>
                  <div className="bg-[#0B1522] border border-[#1B2F47] p-2.5 rounded-lg">
                    <strong className="text-[#00E5FF] block mb-1">Phase 2: Transition</strong>
                    <span className="text-gray-400 text-[11px]">
                      Midfield combination, overlapping full-back run, or diagonal switch of play.
                    </span>
                  </div>
                  <div className="bg-[#0B1522] border border-[#1B2F47] p-2.5 rounded-lg">
                    <strong className="text-[#00E5FF] block mb-1">Phase 3: Execution</strong>
                    <span className="text-gray-400 text-[11px]">
                      Final third delivery, penalty box cutback, and striker finish on goal.
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="p-3 bg-[#0B1522] rounded-lg border border-[#1B2F47]">
                    <strong className="text-white block mb-1">Strict Phase Isolation:</strong>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      Any edit you make on the pitch applies <strong>strictly to the currently active phase</strong>.
                      Moving player #8 in Phase 1 will <em>never</em> alter or corrupt their position in Phase 2 or Phase 3.
                      This allows you to sculpt complex choreography step-by-step with total peace of mind.
                    </p>
                  </div>

                  <div className="p-3 bg-[#0B1522] rounded-lg border border-[#1B2F47]">
                    <strong className="text-white block mb-1">Navigating Between Phases:</strong>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      Click any <strong className="text-[#00E5FF]">Phase chip</strong> at the top of the timeline
                      (e.g. <em>Phase 1</em>, <em>Phase 2</em>), or use the <strong>Previous / Next</strong> transport buttons.
                      You can also click directly onto any segment of the speed gradient track.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PREVIEW */}
          {activeTab === 'PREVIEW' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#00E5FF]" />
                  Section 7 — Preview the Plan (Playback & Speeds)
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  The bottom timeline bar provides complete broadcast-quality playback controls:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0B1522] border border-[#1B2F47] p-3 rounded-lg space-y-1">
                    <strong className="text-white flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-[#00E5FF]" />
                      Play / Pause
                    </strong>
                    <p className="text-[11px] text-gray-400">
                      Click the main Cyan Play button or hit the <strong className="text-white">Spacebar</strong> to start/stop live animation.
                    </p>
                  </div>

                  <div className="bg-[#0B1522] border border-[#1B2F47] p-3 rounded-lg space-y-1">
                    <strong className="text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#00E5FF]" />
                      Timeline Scrubber
                    </strong>
                    <p className="text-[11px] text-gray-400">
                      Click anywhere along the timeline bar to jump directly to that phase or point in time.
                    </p>
                  </div>

                  <div className="bg-[#0B1522] border border-[#1B2F47] p-3 rounded-lg space-y-1">
                    <strong className="text-white flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      Per-Phase Speed Slider
                    </strong>
                    <p className="text-[11px] text-gray-400">
                      Adjust tempo between <strong>0.25x</strong> (slow tactical walkthrough) and <strong>3.0x</strong> (rapid sprint press).
                    </p>
                  </div>

                  <div className="bg-[#0B1522] border border-[#1B2F47] p-3 rounded-lg space-y-1">
                    <strong className="text-white flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-gray-300" />
                      Reset / Rewind
                    </strong>
                    <p className="text-[11px] text-gray-400">
                      Instantly rewinds the drill to the beginning of Phase 1 at progress 0.0s.
                    </p>
                  </div>
                </div>

                <div className="mt-3 bg-[#0B1522] p-3 rounded-lg border border-[#1A2D44] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-[#00E5FF]" />
                    <span className="text-gray-300">
                      <strong>Keyboard Shortcuts:</strong> <code className="bg-[#142337] px-1.5 py-0.5 rounded text-white">Space</code> Play/Pause • <code className="bg-[#142337] px-1.5 py-0.5 rounded text-white">F</code> Fullscreen • <code className="bg-[#142337] px-1.5 py-0.5 rounded text-white">Z</code> Undo • <code className="bg-[#142337] px-1.5 py-0.5 rounded text-white">C</code> Clear
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SAVING & AI */}
          {activeTab === 'SAVING_AI' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Section 8 */}
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Save className="w-4 h-4 text-[#00E5FF]" />
                  Section 8 — Save the Plan to Your Playbook
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  Once you have customized player positions, trajectories, and passes, saving is instantaneous:
                </p>
                <div className="bg-[#0B1522] border border-[#1B2F47] p-3 rounded-lg mb-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      ✓
                    </span>
                    <span>
                      Click the <strong className="text-white">Save Plan</strong> button located in the timeline controls.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      ✓
                    </span>
                    <span>
                      Your drill is stored in your private server Playbook with an authoritative incremented version (e.g. v1 → v2).
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-xs flex items-center justify-center shrink-0">
                      ✓
                    </span>
                    <span>
                      <strong className="text-[#00E5FF]">No AI Regeneration Needed:</strong> Saving stores your exact manual coordinates, destination targets, and pass corridors directly.
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 9 */}
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                  Section 9 — Modify an AI-Generated Plan
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-2">
                  CoachTactics treats AI as an assistant to the coach, never the owner of your tactical model.
                </p>
                <div className="bg-[#0B1522] border border-[#1A2D44] p-3 rounded-lg space-y-2 text-xs text-gray-300">
                  <strong className="text-white block">Recommended Hybrid Workflow:</strong>
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-[#00E5FF]">
                    <span>Generate with AI</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span>Review Shape</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span>Move Players</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span>Adjust Runs</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span>Preview</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span>Save Plan</span>
                  </div>
                  <p className="text-[11px] text-gray-400 pt-1">
                    Your manual adjustments take immediate precedence over the initial AI baseline. Subsequent adjustments and playback respect your edited model exclusively.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: EXAMPLE */}
          {activeTab === 'EXAMPLE' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="bg-[#122235] border border-[#1F3652] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                  Section 10 — Quick Manual Coaching Scenario
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  Follow this 10-step exercise to build a classic <strong>Build-Up & Penetration drill</strong> in under two minutes:
                </p>

                <div className="space-y-2 text-xs">
                  {[
                    {
                      step: 1,
                      title: 'Position Backline',
                      desc: 'Drag Centre-Backs #4 and #5 to the edge of the 18-yard box to split and provide width.',
                    },
                    {
                      step: 2,
                      title: 'Position Pivot Midfielder',
                      desc: 'Place #6 in the pocket between the penalty arc and halfway line to offer an angle.',
                    },
                    {
                      step: 3,
                      title: 'Position Striker',
                      desc: 'Place #9 high on the halfway line, pinning the opposition center-back.',
                    },
                    {
                      step: 4,
                      title: 'Midfielder Movement',
                      desc: 'Select the Arrow tool, click #6, and drag a diagonal arrow into the right half-space.',
                    },
                    {
                      step: 5,
                      title: 'Striker Run',
                      desc: 'Click #9 with the Arrow tool and drag a deep penetrating run toward the penalty box.',
                    },
                    {
                      step: 6,
                      title: 'Deliver the Pass',
                      desc: 'Select the Pass tool, click the soccer ball at #4’s feet, and drag the pass corridor into #6’s path.',
                    },
                    {
                      step: 7,
                      title: 'Check Phase 2',
                      desc: 'Click Phase 2 on the timeline to choreograph the subsequent switch to the winger.',
                    },
                    {
                      step: 8,
                      title: 'Play Animation',
                      desc: 'Hit the Spacebar to watch the synchronized build-up sequence animate on the pitch.',
                    },
                    {
                      step: 9,
                      title: 'Fine-Tune Timing',
                      desc: 'Adjust the Phase Speed slider to 1.25x for a crisper, high-tempo match simulation.',
                    },
                    {
                      step: 10,
                      title: 'Save to Playbook',
                      desc: 'Click Save Plan in the timeline bar. Your drill is now saved and ready for the squad training session!',
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="bg-[#0B1522] border border-[#1A2D44] p-2.5 rounded-lg flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#00E5FF] text-[#0A131F] font-bold text-xs flex items-center justify-center shrink-0">
                        {item.step}
                      </span>
                      <div>
                        <strong className="text-white block text-xs">{item.title}</strong>
                        <span className="text-[11px] text-gray-400">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1A2C42] bg-[#0E1A2A] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Shield className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>CoachTactics: Tactical Authority in the Hands of the Coach</span>
          </div>
          <div className="flex items-center gap-2">
            {activeTab !== 'EXAMPLE' ? (
              <button
                onClick={() => {
                  const currentIndex = tabs.findIndex((t) => t.id === activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1].id);
                  }
                }}
                className="px-3.5 py-1.5 bg-[#14263B] hover:bg-[#1D3552] text-[#00E5FF] font-semibold text-xs rounded-lg border border-[#00E5FF]/30 transition-colors flex items-center gap-1.5"
              >
                <span>Next Section</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <button
              id="coach-tutorial-btn-got-it"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-xs rounded-lg transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)]"
            >
              Start Coaching
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
