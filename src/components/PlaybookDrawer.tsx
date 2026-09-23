import React, { useState } from 'react';
import { SoccerDrill, UserProfile } from '../types.ts';
import {
  BookOpen,
  Plus,
  Play,
  Clock,
  Layers,
  Sparkles,
  X,
  ChevronRight,
  Trash2,
} from 'lucide-react';

interface PlaybookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  drills: SoccerDrill[];
  activeDrillId: string;
  currentUser?: UserProfile | null;
  onSelectDrill: (drill: SoccerDrill) => void;
  onOpenVoicePrompt: () => void;
  onDeleteDrill?: (drillId: string) => void;
}

export const PlaybookDrawer: React.FC<PlaybookDrawerProps> = ({
  isOpen,
  onClose,
  drills,
  activeDrillId,
  currentUser,
  onSelectDrill,
  onOpenVoicePrompt,
  onDeleteDrill,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', ...Array.from(new Set(drills.map((d) => d.category)))];

  const filteredDrills =
    selectedCategory === 'All'
      ? drills
      : drills.filter((d) => d.category === selectedCategory);

  return (
    <div
      id="playbook-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-start animate-in fade-in duration-150"
    >
      <div
        id="playbook-drawer-panel"
        className="w-full max-w-sm h-full bg-[#0D1826] border-r border-[#1F334A] shadow-2xl flex flex-col text-white"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1A2C40] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="font-bold text-base text-white">Tactical Playbook</h3>
          </div>
          <button
            id="playbook-drawer-close-btn"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#1A2C40]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New AI Drill CTA */}
        <div className="p-3 border-b border-[#1A2C40]">
          <button
            id="playbook-btn-new-ai-drill"
            onClick={() => {
              onClose();
              onOpenVoicePrompt();
            }}
            className="w-full py-2.5 px-3 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Voice Note / Prompt New Drill</span>
          </button>
        </div>

        {/* Categories filter chips */}
        <div className="flex items-center gap-1.5 p-3 overflow-x-auto scrollbar-none border-b border-[#1A2C40]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors border ${
                selectedCategory === cat
                  ? 'bg-[#00E5FF] text-[#0A131F] border-[#00E5FF]'
                  : 'bg-[#122236] text-gray-300 border-[#1C324E] hover:border-[#2F4E75]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Drill list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
          {filteredDrills.length === 0 ? (
            <div
              id="empty-playbook-container"
              className="p-5 text-center flex flex-col items-center justify-center my-auto bg-[#101D2D] border border-dashed border-[#1C324E] rounded-2xl gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">0 Training Plans Available</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
                  Your tactical dashboard is clean. Start creating your first drill plans or prompt AI to build one!
                </p>
              </div>
              <button
                id="empty-playbook-create-btn"
                onClick={() => {
                  onClose();
                  onOpenVoicePrompt();
                }}
                className="mt-1 px-4 py-2 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Training Plan</span>
              </button>
            </div>
          ) : (
            filteredDrills.map((d) => {
            const isSelected = d.id === activeDrillId;
            return (
              <div
                key={d.id}
                id={`playbook-drill-item-${d.id}`}
                onClick={() => {
                  onSelectDrill(d);
                  onClose();
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-[#15273C] border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                    : 'bg-[#101D2D] border-[#1C2F45] hover:border-[#2B4666] hover:bg-[#142337]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider">
                    {d.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {d.isSystem ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                        SYSTEM
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-semibold border border-[#00E5FF]/30">
                        {d.createdByUsername ? `@${d.createdByUsername}` : 'CUSTOM'}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-mono">
                      {d.pitchView} PITCH
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white leading-snug">
                  {d.title}
                </h4>

                <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                  {d.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-[#192A3D] text-[10px] text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#FFD600]" />
                      {d.phases.length} phases
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#00E5FF]" />
                      {d.durationMinutes}m
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="text-[#00E5FF] font-bold flex items-center gap-0.5">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        Active
                      </span>
                    )}
                    {onDeleteDrill && !d.isSystem && (currentUser?.role === 'SUPER_ADMIN' || d.createdBy === currentUser?.id || d.ownerId === currentUser?.id || d.ownerId === currentUser?.username) && (
                      <button
                        id={`delete-drill-btn-${d.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDrill(d.id);
                        }}
                        title="Delete Drill"
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
};
