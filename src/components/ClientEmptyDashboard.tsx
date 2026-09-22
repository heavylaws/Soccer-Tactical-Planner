import React from 'react';
import { Sparkles, BookOpen, PlusCircle, Compass, Target, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types.ts';

interface ClientEmptyDashboardProps {
  currentUser: UserProfile;
  onCreatePlan: () => void;
  onSelectSuggestion: (prompt: string) => void;
}

export const ClientEmptyDashboard: React.FC<ClientEmptyDashboardProps> = ({
  currentUser,
  onCreatePlan,
  onSelectSuggestion,
}) => {
  const tacticalIdeas = [
    {
      title: 'Counter-Attack with Overlapping Fullback',
      desc: '3-phase rapid vertical transition: win the ball, release the winger, overlap to cross.',
      formation: '4-3-3',
      category: 'Transition',
      tag: 'Attacking',
      color: '#00E5FF',
    },
    {
      title: 'High Pressing Trap in Midfield Corridor',
      desc: 'Curve wingers inward to force the opponent pivot into a 3-man converging trap.',
      formation: '4-2-3-1',
      category: 'Pressing',
      tag: 'Defensive',
      color: '#FF6E40',
    },
    {
      title: 'Pep 3-2-5 Box Midfield Positional Build-Up',
      desc: 'Inverted fullbacks create overload in central half-spaces to free up isolated 1v1 wingers.',
      formation: '3-2-5',
      category: 'Positional',
      tag: 'Possession',
      color: '#00E676',
    },
    {
      title: 'Near-Post Corner Kick Decoy Routine',
      desc: 'First attacker darts near post dragging defenders, allowing late arriving runner to strike.',
      formation: 'Set Piece',
      category: 'Corners',
      tag: 'Set Piece',
      color: '#FFD600',
    },
  ];

  return (
    <div
      id="client-empty-dashboard"
      className="w-full flex-1 flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-300"
    >
      <div className="w-full max-w-3xl bg-[#0D1826]/90 border border-[#1E3550] rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-white backdrop-blur-sm">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#1A2E44] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FFD600] to-[#FFA000] flex items-center justify-center text-[#060D17] font-black text-xl shadow-[0_0_20px_rgba(255,214,0,0.3)]">
              ⚽
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold text-white">
                  Welcome to CoachTactics, {currentUser.name}!
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FFD600]/15 text-[#FFD600] border border-[#FFD600]/30 font-mono">
                  Client Portal
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Connected account: <span className="text-[#00E5FF] font-mono">@{currentUser.username}</span> {currentUser.email ? `(${currentUser.email})` : ''}
              </p>
            </div>
          </div>

          <button
            id="client-empty-start-create-btn"
            onClick={onCreatePlan}
            className="px-5 py-2.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-xs rounded-xl shadow-[0_0_16px_rgba(0,229,255,0.35)] transition-all flex items-center gap-2 self-stretch md:self-auto justify-center"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Tactical Plan</span>
          </button>
        </div>

        {/* 0 Trainings Status Box */}
        <div className="p-4 bg-[#112134] border border-[#1C3450] rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                0 Saved Trainings in Your Playbook
              </h4>
              <p className="text-xs text-gray-400">
                You have a fresh, clean slate. Craft customized tactical drills or pick an inspiration below.
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex px-3 py-1 bg-[#162A42] border border-[#223F62] rounded-lg text-xs font-mono text-gray-300">
            Playbook: 0 / ∞
          </span>
        </div>

        {/* Tactical Suggestions for Client Building */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              <span>Recommended Tactical Drill Concepts to Try:</span>
            </span>
            <span className="text-[11px] text-gray-400">Click any card to start plan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tacticalIdeas.map((idea, i) => (
              <div
                key={i}
                id={`client-suggestion-card-${i}`}
                onClick={() => onSelectSuggestion(idea.title)}
                className="p-4 rounded-xl bg-[#122236] hover:bg-[#182D46] border border-[#1E3652] hover:border-[#00E5FF]/50 transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        color: idea.color,
                        backgroundColor: `${idea.color}15`,
                        borderColor: `${idea.color}35`,
                      }}
                    >
                      {idea.category} • {idea.formation}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {idea.tag}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-white group-hover:text-[#00E5FF] transition-colors mt-2">
                    {idea.title}
                  </h5>

                  <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                    {idea.desc}
                  </p>
                </div>

                <div className="flex items-center justify-end text-[11px] text-[#00E5FF] font-semibold gap-1 pt-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Generate Drill</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
