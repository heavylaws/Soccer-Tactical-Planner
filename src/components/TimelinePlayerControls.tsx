import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Maximize2,
  Minimize2,
  Tv,
  Gauge,
  Sliders,
} from 'lucide-react';
import { DrillPhase } from '../types.ts';

interface TimelinePlayerControlsProps {
  phases: DrillPhase[];
  currentPhaseIndex: number;
  phaseProgress: number; // 0 to 1
  isPlaying: boolean;
  speed: number;
  pitchView: 'FULL' | 'HALF';
  isFullscreen: boolean;
  phaseSpeeds?: Record<number, number>;
  onTogglePlay: () => void;
  onSelectPhase: (index: number) => void;
  onPreviousPhase: () => void;
  onNextPhase: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onPhaseSpeedChange?: (phaseIndex: number, phaseSpeed: number) => void;
  onResetPhaseSpeed?: (phaseIndex: number) => void;
  onTogglePitchView: () => void;
  onToggleFullscreen: () => void;
}

export const TimelinePlayerControls: React.FC<TimelinePlayerControlsProps> = ({
  phases,
  currentPhaseIndex,
  phaseProgress,
  isPlaying,
  speed,
  pitchView,
  isFullscreen,
  phaseSpeeds = {},
  onTogglePlay,
  onSelectPhase,
  onPreviousPhase,
  onNextPhase,
  onReset,
  onSpeedChange,
  onPhaseSpeedChange,
  onResetPhaseSpeed,
  onTogglePitchView,
  onToggleFullscreen,
}) => {
  const currentPhase = phases[currentPhaseIndex];
  const speeds = [0.5, 1, 1.5, 2];
  const [showSliderPanel, setShowSliderPanel] = useState(true);

  // Speed multiplier specifically for current phase (defaults to 1.0 if not overridden)
  const currentPhaseSpeedMultiplier = phaseSpeeds[currentPhaseIndex] ?? 1.0;
  // Effective speed when running this phase
  const effectiveSpeed = (speed * currentPhaseSpeedMultiplier).toFixed(2);
  const effectiveDurationSec = currentPhase
    ? (currentPhase.durationSec / currentPhaseSpeedMultiplier).toFixed(1)
    : '3.0';

  return (
    <div
      id="timeline-player-controls"
      className="w-full bg-[#0D1826]/95 backdrop-blur-md border border-[#1F3045] rounded-xl p-3 shadow-xl flex flex-col gap-2.5 text-white"
    >
      {/* Top row: Phase navigation chips */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {phases.map((phase, idx) => {
            const isActive = idx === currentPhaseIndex;
            const customSpeed = phaseSpeeds[idx];
            return (
              <button
                key={phase.step}
                id={`timeline-phase-btn-${idx}`}
                onClick={() => onSelectPhase(idx)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#00E5FF] text-[#0A131F] border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                    : 'bg-[#142336] text-gray-300 border-transparent hover:border-[#2C4460] hover:text-white'
                }`}
              >
                <span>Phase {phase.step}</span>
                {customSpeed !== undefined && customSpeed !== 1.0 && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                      isActive ? 'bg-[#0A131F]/20 text-[#0A131F]' : 'bg-[#00E5FF]/20 text-[#00E5FF]'
                    }`}
                    title={`Phase ${phase.step} animation speed: ${customSpeed}x`}
                  >
                    {customSpeed}x
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A131F] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Pitch view toggle & Phase speed toggle buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="toggle-phase-slider-btn"
            onClick={() => setShowSliderPanel(!showSliderPanel)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border ${
              showSliderPanel
                ? 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/40'
                : 'bg-[#142336] hover:bg-[#1E324A] text-gray-300 border-[#233B56]'
            }`}
            title="Toggle Phase Transition Speed Slider"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phase Speed</span>
          </button>

          <button
            id="pitch-view-toggle-btn"
            onClick={onTogglePitchView}
            className="px-2.5 py-1 text-xs font-medium bg-[#142336] hover:bg-[#1E324A] text-[#00E5FF] border border-[#233B56] rounded-lg transition-colors flex items-center gap-1.5"
            title="Toggle Full / Half pitch"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{pitchView === 'HALF' ? 'Half Pitch' : 'Full Pitch'}</span>
          </button>
        </div>
      </div>

      {/* Middle row: Progress timeline scrubber with Phase Speed Gradient Track */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-gray-400 w-12 text-right">
            P{currentPhaseIndex + 1}/P{phases.length}
          </span>
          <div
            id="timeline-speed-gradient-track"
            className="relative flex-1 h-3.5 bg-[#0F1B2A] rounded-full overflow-hidden border border-[#1C3048] shadow-inner select-none cursor-pointer"
            onClick={(e) => {
              // Click anywhere on track to jump directly to that phase
              const rect = e.currentTarget.getBoundingClientRect();
              const clickFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const targetIdx = Math.min(phases.length - 1, Math.floor(clickFraction * phases.length));
              onSelectPhase(targetIdx);
            }}
            title="Timeline speed map: Red/Orange = Fast, Cyan = Normal, Indigo/Blue = Slow. Click to jump phase."
          >
            {/* Background Phase Gradient Segments */}
            <div className="absolute inset-0 flex w-full h-full">
              {phases.map((p, idx) => {
                const s = phaseSpeeds[idx] ?? 1.0;
                // Color gradient representation for speed:
                // > 1.5x: Fast tempo / High intensity (Orange -> Red)
                // > 1.0x: Accelerated (Cyan -> Amber/Orange)
                // 1.0x: Standard pace (Cyan / Slate)
                // < 1.0x: Slow tempo / Walkthrough / Tactical breakdown (Indigo / Deep Blue)
                let segmentBg = 'linear-gradient(90deg, #16364D 0%, #1A4462 100%)'; // default 1.0x
                if (s > 1.75) {
                  segmentBg = 'linear-gradient(90deg, #FF6E40 0%, #FF1744 100%)';
                } else if (s > 1.2) {
                  segmentBg = 'linear-gradient(90deg, #FFB300 0%, #FF7043 100%)';
                } else if (s > 1.0) {
                  segmentBg = 'linear-gradient(90deg, #00BCD4 0%, #FFA726 100%)';
                } else if (s < 0.65) {
                  segmentBg = 'linear-gradient(90deg, #303F9F 0%, #1A237E 100%)';
                } else if (s < 1.0) {
                  segmentBg = 'linear-gradient(90deg, #283593 0%, #0097A7 100%)';
                }

                const isActive = idx === currentPhaseIndex;

                return (
                  <div
                    key={p.step}
                    id={`timeline-track-segment-${idx}`}
                    style={{
                      width: `${100 / phases.length}%`,
                      background: segmentBg,
                    }}
                    className={`h-full relative transition-opacity border-r border-[#0D1826]/70 last:border-r-0 ${
                      isActive ? 'opacity-90' : 'opacity-40 hover:opacity-75'
                    }`}
                  >
                    {/* Small speed badge in segment if overridden */}
                    {s !== 1.0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-white/90 drop-shadow-sm pointer-events-none">
                        {s}x
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Progress fill bar with glow */}
            <div
              id="timeline-progress-indicator"
              className="absolute top-0 left-0 bottom-0 bg-[#00E5FF]/70 backdrop-brightness-125 border-r-2 border-white shadow-[0_0_10px_#00E5FF] transition-all duration-75 pointer-events-none"
              style={{
                width: `${((currentPhaseIndex + phaseProgress) / phases.length) * 100}%`,
              }}
            />

            {/* Scrubber Playhead Thumb */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#fff] pointer-events-none -ml-0.5"
              style={{
                left: `${((currentPhaseIndex + phaseProgress) / phases.length) * 100}%`,
              }}
            />
          </div>

          <span className="text-[11px] font-mono text-[#00E5FF] w-12">
            {((Number(effectiveDurationSec)) * (1 - phaseProgress)).toFixed(1)}s
          </span>
        </div>

        {/* Speed Heatmap Legend Indicator */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Speed Map:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#1A237E]" />
              <span className="text-gray-400">Slow (&lt;1x)</span>
            </span>
            <span className="inline-flex items-center gap-1 ml-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1A4462]" />
              <span className="text-gray-400">Normal (1x)</span>
            </span>
            <span className="inline-flex items-center gap-1 ml-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF7043]" />
              <span className="text-[#FF8A65]">Fast (&gt;1x)</span>
            </span>
            <span className="inline-flex items-center gap-1 ml-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF1744]" />
              <span className="text-[#FF5252]">Sprint (&gt;1.75x)</span>
            </span>
          </div>

          <span className="text-gray-500 hidden sm:inline">
            Click track segment to jump phase
          </span>
        </div>
      </div>

      {/* Visual Phase Transition Speed Slider Panel */}
      {showSliderPanel && (
        <div
          id="phase-transition-speed-panel"
          className="bg-[#122135]/90 border border-[#1E3550] rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[#00E5FF] font-semibold">
              <Gauge className="w-4 h-4" />
              <span>Phase {currentPhaseIndex + 1} Transition Speed:</span>
            </div>
            <span
              id="phase-transition-speed-badge"
              className="px-2 py-0.5 rounded font-mono font-bold bg-[#00E5FF] text-[#0A131F]"
            >
              {currentPhaseSpeedMultiplier.toFixed(2)}x
            </span>
            <span className="text-[11px] text-gray-400 font-mono hidden md:inline">
              (Effective: {effectiveSpeed}x • ~{effectiveDurationSec}s)
            </span>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-xs min-w-[200px]">
            <span className="text-[10px] text-gray-400 font-mono">0.25x</span>
            <input
              id="phase-transition-speed-slider"
              type="range"
              min="0.25"
              max="3.0"
              step="0.05"
              value={currentPhaseSpeedMultiplier}
              onChange={(e) => {
                const newSpeed = parseFloat(e.target.value);
                if (onPhaseSpeedChange) {
                  onPhaseSpeedChange(currentPhaseIndex, newSpeed);
                }
              }}
              className="flex-1 h-1.5 bg-[#1A2E44] rounded-lg appearance-none cursor-pointer accent-[#00E5FF] focus:outline-none"
              title={`Adjust Phase ${currentPhaseIndex + 1} Animation Speed`}
            />
            <span className="text-[10px] text-gray-400 font-mono">3.0x</span>

            {/* Reset phase speed to default 1x */}
            {currentPhaseSpeedMultiplier !== 1.0 && (
              <button
                id="reset-phase-speed-btn"
                onClick={() => {
                  if (onResetPhaseSpeed) {
                    onResetPhaseSpeed(currentPhaseIndex);
                  } else if (onPhaseSpeedChange) {
                    onPhaseSpeedChange(currentPhaseIndex, 1.0);
                  }
                }}
                className="text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded bg-[#182C42] hover:bg-[#203B5A] transition-colors"
                title="Reset this phase to standard 1.0x"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom row: Playback transport buttons & master speed */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1.5">
          {/* Restart */}
          <button
            id="timeline-btn-reset"
            onClick={onReset}
            className="p-2 text-gray-300 hover:text-white bg-[#142336] hover:bg-[#1B2F47] rounded-lg transition-colors"
            title="Restart Drill Animation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Previous Phase */}
          <button
            id="timeline-btn-prev"
            onClick={onPreviousPhase}
            disabled={currentPhaseIndex === 0}
            className="p-2 text-gray-300 hover:text-white bg-[#142336] hover:bg-[#1B2F47] disabled:opacity-40 disabled:hover:bg-[#142336] rounded-lg transition-colors"
            title="Previous Phase"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause Main CTA */}
          <button
            id="timeline-btn-play-pause"
            onClick={onTogglePlay}
            className={`px-4 py-2 font-bold text-sm rounded-lg flex items-center gap-2 transition-all shadow-md ${
              isPlaying
                ? 'bg-[#FF6E40] text-white hover:bg-[#FF8A65] shadow-[0_0_12px_rgba(255,110,64,0.4)]'
                : 'bg-[#00E5FF] text-[#0A131F] hover:bg-[#18FFFF] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play Animation</span>
              </>
            )}
          </button>

          {/* Next Phase */}
          <button
            id="timeline-btn-next"
            onClick={onNextPhase}
            disabled={currentPhaseIndex === phases.length - 1}
            className="p-2 text-gray-300 hover:text-white bg-[#142336] hover:bg-[#1B2F47] disabled:opacity-40 disabled:hover:bg-[#142336] rounded-lg transition-colors"
            title="Next Phase"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Master Speed & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Speeds */}
          <div className="flex items-center bg-[#142336] rounded-lg p-0.5 border border-[#233B56]">
            {speeds.map((s) => (
              <button
                key={s}
                id={`timeline-speed-btn-${s}`}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 text-[11px] font-bold rounded ${
                  speed === s
                    ? 'bg-[#00E5FF] text-[#0A131F]'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Boardroom Fullscreen */}
          <button
            id="timeline-fullscreen-btn"
            onClick={onToggleFullscreen}
            className="p-2 text-gray-300 hover:text-white bg-[#142336] hover:bg-[#1B2F47] border border-[#233B56] rounded-lg transition-colors"
            title="Boardroom Presentation Mode (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
