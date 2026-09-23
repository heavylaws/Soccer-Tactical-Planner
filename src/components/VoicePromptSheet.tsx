import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  Play,
  Volume2,
  CheckCircle2,
  Wand2,
  ShieldCheck,
  Zap,
  Leaf,
  RotateCcw,
} from 'lucide-react';
import { getQuotaStats, QuotaStats } from '../utils/drillCache';

interface VoicePromptSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateDrill: (
    prompt: string,
    formation: string,
    focusArea: string,
    forceRefresh?: boolean,
    ecoMode?: boolean
  ) => Promise<void>;
  isGenerating: boolean;
  userRole?: string;
  username?: string;
  initialPrompt?: string;
}

export const VoicePromptSheet: React.FC<VoicePromptSheetProps> = ({
  isOpen,
  onClose,
  onGenerateDrill,
  isGenerating,
  userRole,
  username,
  initialPrompt,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [formation, setFormation] = useState('4-3-3');
  const [focusArea, setFocusArea] = useState('Wide Overload & Penetration');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<string>(() => {
    const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
    if (nav.toLowerCase().startsWith('ar')) return 'ar-QA';
    if (nav.toLowerCase().startsWith('fr')) return 'fr-FR';
    return 'en-US';
  });
  const recognitionRef = useRef<any>(null);
  const [ecoMode, setEcoMode] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [quotaStats, setQuotaStats] = useState<QuotaStats>({
    clientHits: 0,
    serverHits: 0,
    apiCalls: 0,
    totalSaved: 0,
  });

  useEffect(() => {
    if (initialPrompt && isOpen) {
      setPrompt(initialPrompt);
    }
    if (isOpen) {
      setQuotaStats(getQuotaStats());
    }
  }, [initialPrompt, isOpen]);

  // Tactical knowledge suggestions library for live typing triggers
  const TACTICAL_KNOWLEDGE_SUGGESTIONS = [
    {
      keywords: ['press', 'trap', 'defend', 'counter-press', 'regain', 'turnover'],
      category: 'High Press & Defensive Traps',
      suggestions: [
        'High pressing trap: Wingers curve runs to force ball inward into the #6 pivot corridor',
        'Gegenpress drill: 5-second aggressive rest-defense hunt after losing ball in final third',
        'Mid-block compact shape forcing opponent center-backs to make risky aerial switches',
      ],
    },
    {
      keywords: ['cross', 'wing', 'flank', 'overlap', 'underlap', 'byline', 'cutback'],
      category: 'Wide Overload & Flank Delivery',
      suggestions: [
        'Fullback overlaps wide while inverted winger drifts inside to deliver driven cutback',
        'Underlapping full-back run piercing the half-space channel for near-post cross',
        '2v1 flank overload with quick give-and-go before crossing to arriving target man',
      ],
    },
    {
      keywords: ['pass', 'build', 'pivot', 'possession', 'tiki', 'switch', 'tempo'],
      category: 'Positional Play & Midfield Dynamics',
      suggestions: [
        'Pep Guardiola 3-2-5 box midfield overload creating free passing lane to inverted winger',
        'Deep-lying playmaker drops between center-backs (Salida Lavolpiana) to break high line',
        'Third-man run combination through the central channel to unlock low defensive block',
      ],
    },
    {
      keywords: ['counter', 'transition', 'break', 'direct', 'sprint', 'run'],
      category: 'Rapid Attacking Transitions',
      suggestions: [
        'Rapid 3-phase counter: Ball won in defensive third, vertical through-ball into striker sprint',
        '4v3 breakaway counter-attack with decoy run pinning the last defender',
        'Quick transition overload attacking the unsettled backline within 8 seconds',
      ],
    },
    {
      keywords: ['corner', 'free kick', 'set piece', 'routine', 'decoy', 'box'],
      category: 'Set Piece Routines',
      suggestions: [
        'Near-post flick decoy corner with late blind-side runner at the back post',
        'Short corner overload with quick return pass to whip out-swinging delivery',
      ],
    },
  ];

  // Derive relevant live suggestions based on what user has typed so far
  const activeSuggestions = React.useMemo(() => {
    const text = prompt.toLowerCase().trim();
    if (!text) {
      return [
        {
          title: '3-phase counter attack with overlapping winger and low cutback cross',
          tag: 'Transition',
        },
        {
          title: 'High pressing trap on opponent #6 with 3-man angle convergence',
          tag: 'Pressing',
        },
        {
          title: 'Pep Guardiola 3-2-5 box midfield build-up to isolate 1v1 winger',
          tag: 'Positional',
        },
        {
          title: 'Near-post decoy corner routine with late edge-of-box arrival',
          tag: 'Set Piece',
        },
      ];
    }

    const matched: { title: string; tag: string }[] = [];
    TACTICAL_KNOWLEDGE_SUGGESTIONS.forEach((cat) => {
      const isMatch = cat.keywords.some((kw) => text.includes(kw));
      if (isMatch) {
        cat.suggestions.forEach((s) => {
          matched.push({ title: s, tag: cat.category.split(' ')[0] });
        });
      }
    });

    if (matched.length === 0) {
      // General contextual suggestions
      matched.push(
        { title: `${prompt} with rapid 3-man vertical combination into the box`, tag: 'Suggested' },
        { title: `${prompt} utilizing an overlapping fullback to create a 2v1 advantage`, tag: 'Suggested' },
        { title: `${prompt} with defensive rest-structure to prevent counter-attacks`, tag: 'Suggested' }
      );
    }

    return matched.slice(0, 4);
  }, [prompt]);

  // Web Speech Recognition support
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
  }, []);

  const stopRecognition = () => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    setIsRecording(false);
  };

  // Release the microphone when the sheet closes or unmounts.
  useEffect(() => {
    if (!isOpen) stopRecognition();
    return () => stopRecognition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleToggleRecord = () => {
    setSpeechError(null);

    if (isRecording) {
      // Graceful stop: keeps what was already recognised.
      try {
        recognitionRef.current?.stop();
      } catch {
        stopRecognition();
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechError("Voice input isn't supported in this browser. Use Chrome, Edge or Safari, or type the drill below.");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setPrompt(transcript);
      };
      recognition.onerror = (event: any) => {
        const code = event?.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setSpeechError('Microphone access was blocked. Allow it in your browser settings, or type the drill below.');
        } else if (code === 'no-speech') {
          setSpeechError('No speech detected. Tap the mic and try again.');
        } else if (code && code !== 'aborted') {
          setSpeechError('Voice input stopped unexpectedly. Try again or type the drill below.');
        }
        setIsRecording(false);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setIsRecording(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition failed to start', err);
      recognitionRef.current = null;
      setIsRecording(false);
      setSpeechError('Voice input could not start. Type the drill below instead.');
    }
  };

  const samplePrompts = [
    '3-phase counter attack with overlapping winger and low cutback cross',
    'High pressing trap on opponent #6 with 3-man angle convergence',
    'Pep Guardiola 3-2-5 box midfield build-up to isolate 1v1 winger',
    'Near-post decoy corner routine with late edge-of-box arrival',
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    await onGenerateDrill(prompt.trim(), formation, focusArea, forceRefresh, ecoMode);
  };

  if (!isOpen) return null;

  return (
    <div
      id="voice-prompt-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="voice-prompt-sheet-card"
        className="w-full sm:max-w-xl bg-[#0D1826] border border-[#1F334A] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A2C40] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Coach Voice Note & AI Planner
              </h2>
              <p className="text-xs text-gray-400">
                Speak or describe your tactical vision to generate 60fps drill animations
              </p>
            </div>
          </div>
          <button
            id="voice-prompt-close-btn"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1A2C40] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Microphone Recording Action */}
        <div className="flex flex-col items-center justify-center py-3 bg-[#112032] border border-[#1C324E] rounded-xl relative overflow-hidden">
          <button
            id="voice-prompt-mic-record-btn"
            type="button"
            onClick={handleToggleRecord}
            aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={isRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isRecording
                ? 'bg-[#FF1744] text-white scale-110 shadow-[0_0_24px_rgba(255,23,68,0.6)] animate-pulse'
                : 'bg-[#00E5FF] text-[#0A131F] hover:bg-[#18FFFF] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
            }`}
          >
            {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>

          <p className="mt-2 text-xs font-semibold text-gray-300">
            {isRecording ? 'Listening… tap again to stop' : speechSupported ? 'Tap the mic to speak, or type below' : 'Type the drill below'}
          </p>

          <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Voice input language">
            {[
              { code: 'en-US', label: 'English' },
              { code: 'ar-QA', label: 'العربية' },
              { code: 'fr-FR', label: 'Français' },
            ].map((opt) => (
              <button
                key={opt.code}
                type="button"
                role="radio"
                aria-checked={speechLang === opt.code}
                disabled={isRecording}
                onClick={() => setSpeechLang(opt.code)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                  speechLang === opt.code ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {speechError && (
            <p role="alert" className="mt-2 px-3 text-[11px] text-[#FF8A80] text-center">
              {speechError}
            </p>
          )}

          {/* Dynamic Waveform Visualizer */}
          {isRecording && (
            <div className="flex items-center gap-1 mt-2">
              {[12, 24, 18, 30, 16, 26, 14, 28, 20].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-[#00E5FF] rounded-full animate-bounce"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Tactical Drill Description
          </label>
          <textarea
            id="voice-prompt-textarea"
            dir="auto"
            maxLength={1000}
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 4v3 counter-attack where winger drives down the flank, cuts back to the arriving striker..."
            className="w-full bg-[#132338] border border-[#223953] focus:border-[#00E5FF] rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Formations & Focus Area */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Formation
            </label>
            <select
              id="voice-prompt-formation-select"
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              className="w-full bg-[#132338] border border-[#223953] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
            >
              <option value="4-3-3">4-3-3 (Classic Wings)</option>
              <option value="4-2-3-1">4-2-3-1 (Double Pivot)</option>
              <option value="3-5-2">3-5-2 (Wingbacks)</option>
              <option value="4-4-2">4-4-2 (Two Strikers)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Focus Area
            </label>
            <select
              id="voice-prompt-focus-select"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              className="w-full bg-[#132338] border border-[#223953] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
            >
              <option value="Wide Overload & Penetration">Wide Overload & Penetration</option>
              <option value="High Press & Trap">High Press & Trap</option>
              <option value="Attacking Transition">Attacking Transition</option>
              <option value="Positional Build-Up">Positional Build-Up</option>
              <option value="Set Piece Routine">Set Piece Routine</option>
            </select>
          </div>
        </div>

        {/* API Quota Preservation & Free Mode Control */}
        <div
          id="quota-preservation-card"
          className="bg-[#0B1726] border border-[#1E3752] rounded-xl p-3 flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF]">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Tactical Cache & Free Mode</span>
                  <span className="text-[10px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 rounded border border-[#00E5FF]/20">
                    $0 API Toll
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-gray-300 bg-[#14263B] px-2.5 py-1 rounded-full border border-[#233F5D]">
              <Zap className="w-3 h-3 text-[#00E5FF]" />
              <span className="font-semibold text-white">
                {quotaStats.totalSaved} Calls Saved
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#122235] p-2 rounded-lg border border-[#1E344E]">
            <div className="flex items-center gap-2">
              <Leaf className={`w-4 h-4 ${ecoMode ? 'text-emerald-400' : 'text-gray-500'}`} />
              <div>
                <div className="text-xs font-semibold text-gray-200">
                  {ecoMode ? 'Eco / Free Mode Active (100% Free)' : 'Live AI Generation (Gemini 3.1 Flash-Lite)'}
                </div>
                <div className="text-[10px] text-gray-400">
                  {ecoMode
                    ? 'Uses Tactical Cache & UEFA Engine. 0 API calls, zero quota used.'
                    : 'Hits Gemini 3.1 Flash-Lite for unique custom drill variations.'}
                </div>
              </div>
            </div>

            <button
              id="voice-prompt-toggle-ecomode"
              type="button"
              onClick={() => {
                setEcoMode(!ecoMode);
                if (!ecoMode) setForceRefresh(false);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                ecoMode ? 'bg-[#00E5FF]' : 'bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#0A131F] shadow-lg ring-0 transition duration-200 ease-in-out ${
                  ecoMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {!ecoMode && (
            <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer pt-0.5">
              <input
                id="voice-prompt-force-refresh-checkbox"
                type="checkbox"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#00E5FF] rounded bg-[#132338]"
              />
              <span>Bypass cache & force fresh AI generation</span>
            </label>
          )}
        </div>

        {/* Live Contextual Suggestions while typing/planning */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#00E5FF]" />
              <span>
                {prompt.trim()
                  ? 'Dynamic Tactical Suggestions (Matching your plan):'
                  : 'Tactical Playbook Inspiration:'}
              </span>
            </span>
            {userRole === 'CLIENT' && (
              <span className="text-[10px] text-[#FFD600] font-medium bg-[#FFD600]/10 px-2 py-0.5 rounded-full border border-[#FFD600]/20">
                AI Coach Assisting @{username || 'client'}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {activeSuggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                id={`voice-suggestion-${idx}`}
                onClick={() => setPrompt(item.title)}
                className="text-left p-2 bg-[#132338] hover:bg-[#1A314D] border border-[#223953] hover:border-[#00E5FF]/60 rounded-xl text-xs text-gray-200 hover:text-white transition-all flex items-center justify-between gap-2 group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] group-hover:scale-125 transition-transform" />
                  <span className="line-clamp-1">{item.title}</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1C324E] text-[#00E5FF] whitespace-nowrap">
                  {item.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-[#1A2C40] flex items-center justify-end gap-2">
          <button
            id="voice-prompt-cancel-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="voice-prompt-generate-submit-btn"
            type="button"
            onClick={() => handleSubmit()}
            disabled={!prompt.trim() || isGenerating}
            className="px-5 py-2.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-sm rounded-xl shadow-[0_0_16px_rgba(0,229,255,0.4)] disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Wand2 className="w-4 h-4 animate-spin text-[#0A131F]" />
                <span>{ecoMode ? 'Synthesizing Free Tactical Drill...' : 'Generating with Gemini AI...'}</span>
              </>
            ) : (
              <>
                {ecoMode ? (
                  <>
                    <Zap className="w-4 h-4 fill-current text-[#0A131F]" />
                    <span>Instant Free Drill ($0 Quota)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-[#0A131F]" />
                    <span>{forceRefresh ? 'Fresh AI Generation' : 'Generate & Play Animation'}</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
