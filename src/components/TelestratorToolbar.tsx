import React from 'react';
import {
  MousePointer,
  Pen,
  MoveRight,
  GitCommit,
  Activity,
  Circle,
  Zap,
  StickyNote,
  Eraser,
  Undo2,
  Trash2,
  Flame,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { AnnotationTool } from '../types.ts';

interface TelestratorToolbarProps {
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  isDashed: boolean;
  canUndo: boolean;
  showHeatmap?: boolean;
  isLayersOpen?: boolean;
  onSelectTool: (tool: AnnotationTool) => void;
  onSelectColor: (color: string) => void;
  onToggleDashed: () => void;
  onToggleHeatmap?: () => void;
  onToggleLayers?: () => void;
  onOpenTutorial?: () => void;
  onUndo: () => void;
  onClearAll: () => void;
}

export const TelestratorToolbar: React.FC<TelestratorToolbarProps> = ({
  activeTool,
  activeColor,
  activeStrokeWidth,
  isDashed,
  canUndo,
  showHeatmap = false,
  isLayersOpen = false,
  onSelectTool,
  onSelectColor,
  onToggleDashed,
  onToggleHeatmap,
  onToggleLayers,
  onOpenTutorial,
  onUndo,
  onClearAll,
}) => {
  const tools = [
    {
      id: 'MOVE' as AnnotationTool,
      label: 'Move Player',
      tooltip: 'Move Player & Targets: Drag player marker or destination handle',
      icon: MousePointer,
    },
    {
      id: 'PEN' as AnnotationTool,
      label: 'Tactical Pen',
      tooltip: 'Tactical Pen: Freehand drawing on the pitch',
      icon: Pen,
    },
    {
      id: 'ARROW' as AnnotationTool,
      label: 'Arrow',
      tooltip: 'Movement Arrow: Drag from player to set destination run',
      icon: MoveRight,
    },
    {
      id: 'PASS' as AnnotationTool,
      label: 'Pass',
      tooltip: 'Passing Vector: Drag from ball to set pass corridor',
      icon: GitCommit,
    },
    {
      id: 'DRIBBLE' as AnnotationTool,
      label: 'Dribble',
      tooltip: 'Dribble Path: Squiggly ball carrier line',
      icon: Activity,
    },
    {
      id: 'ZONE' as AnnotationTool,
      label: 'Zone',
      tooltip: 'Pressing Zone: Mark tactical space or pressing trap',
      icon: Circle,
    },
    {
      id: 'LASER' as AnnotationTool,
      label: 'Laser',
      tooltip: 'Laser Pointer: Live pointer without leaving marks',
      icon: Zap,
    },
    {
      id: 'NOTE' as AnnotationTool,
      label: 'Note',
      tooltip: 'Sticky Note: Tap pitch to pin coaching instruction',
      icon: StickyNote,
    },
    {
      id: 'ERASER' as AnnotationTool,
      label: 'Eraser',
      tooltip: 'Eraser: Remove nearby drawings',
      icon: Eraser,
    },
  ];

  const colors = [
    { hex: '#FFD600', name: 'Tactical Yellow' },
    { hex: '#00E5FF', name: 'Attack Cyan' },
    { hex: '#FF6E40', name: 'Defense Orange' },
    { hex: '#00E676', name: 'Emerald Green' },
    { hex: '#FFFFFF', name: 'Pure White' },
  ];

  return (
    <div
      id="telestrator-toolbar"
      className="bg-[#0D1826]/95 backdrop-blur-md border border-[#1E3249] rounded-xl p-2 shadow-xl flex flex-wrap items-center justify-between gap-2 text-white"
    >
      {/* Drawing tools */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              id={`telestrator-tool-${t.id.toLowerCase()}`}
              onClick={() => onSelectTool(t.id)}
              className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                isActive
                  ? 'bg-[#00E5FF] text-[#0A131F] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'bg-[#142337] text-gray-300 hover:text-white hover:bg-[#1B2F48]'
              }`}
              title={t.tooltip || t.label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Colors, Heatmap toggle & actions */}
      <div className="flex items-center gap-2">
        {/* Tactical Layers Stack Toggle */}
        <button
          id="telestrator-btn-layers-toggle"
          onClick={onToggleLayers}
          className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold border ${
            isLayersOpen
              ? 'bg-[#00E5FF] text-[#0A131F] border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'bg-[#142337] text-gray-300 hover:text-white hover:bg-[#1B2F48] border-[#21354D]'
          }`}
          title="Tactical Layer Stacking & Colored Movement Paths"
        >
          <Layers className="w-4 h-4" />
          <span className="text-[11px] font-bold">Layers</span>
        </button>

        {/* Heatmap Intensity Zones Toggle */}
        <button
          id="telestrator-btn-heatmap-toggle"
          onClick={onToggleHeatmap}
          className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold border ${
            showHeatmap
              ? 'bg-gradient-to-r from-[#FF6D00] to-[#FF1744] text-white border-[#FF9100] shadow-[0_0_12px_rgba(255,109,0,0.5)] animate-pulse'
              : 'bg-[#142337] text-gray-300 hover:text-white hover:bg-[#1B2F48] border-[#21354D]'
          }`}
          title="Toggle Movement History Heatmap Overlays"
        >
          <Flame className={`w-4 h-4 ${showHeatmap ? 'text-[#FFD54F]' : 'text-orange-400'}`} />
          <span className="text-[11px] font-bold">Heatmap</span>
        </button>

        {/* Coach Plan Editor Tutorial / Help Guide CTA */}
        {onOpenTutorial && (
          <button
            id="telestrator-btn-coach-guide"
            onClick={onOpenTutorial}
            className="px-2.5 py-1.5 rounded-lg bg-[#142337] hover:bg-[#1C324E] text-[#00E5FF] hover:text-white border border-[#00E5FF]/40 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            title="Coach Guide: How to manually create, edit, pass, and choreograph drills"
          >
            <HelpCircle className="w-4 h-4 text-[#00E5FF]" />
            <span className="text-[11px] font-bold hidden sm:inline">Coach Guide</span>
          </button>
        )}

        {/* Color swatches */}
        <div className="flex items-center gap-1 bg-[#142337] p-1 rounded-lg border border-[#21354D]">
          {colors.map((c) => (
            <button
              key={c.hex}
              id={`color-swatch-${c.hex.replace('#', '')}`}
              onClick={() => onSelectColor(c.hex)}
              className={`w-5 h-5 rounded-full transition-all ${
                activeColor === c.hex
                  ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#0A131F]'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>

        {/* Undo */}
        <button
          id="telestrator-btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 bg-[#142337] hover:bg-[#1B2F48] text-gray-300 hover:text-white disabled:opacity-40 rounded-lg transition-colors border border-[#21354D]"
          title="Undo Drawing (Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Clear All */}
        <button
          id="telestrator-btn-clear"
          onClick={onClearAll}
          className="p-2 bg-[#142337] hover:bg-[#FF1744]/20 hover:text-[#FF1744] text-gray-300 rounded-lg transition-colors border border-[#21354D]"
          title="Clear All Drawings (C)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
