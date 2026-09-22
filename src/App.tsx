import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  Users,
  Mic,
  Tv,
  Maximize2,
  Minimize2,
  Info,
  Shield,
  Crown,
  User,
  Sliders,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  SoccerDrill,
  DrillPhase,
  TacticalPlayer,
  UserProfile,
  AnnotationTool,
  TacticalAnnotation,
  LaserPoint,
  QuickTacticalNote,
  TacticalLayerConfig,
  TacticalLayerType,
} from './types.ts';
import { DEFAULT_TACTICAL_DRILLS, DEFAULT_USERS } from './data/sampleTactics.ts';
import { TacticalPitchView } from './components/TacticalPitchView.tsx';
import { TimelinePlayerControls } from './components/TimelinePlayerControls.tsx';
import { TelestratorToolbar } from './components/TelestratorToolbar.tsx';
import { FastChangesBar } from './components/FastChangesBar.tsx';
import { CoachingExplanationOverlay } from './components/CoachingExplanationOverlay.tsx';
import { VoicePromptSheet } from './components/VoicePromptSheet.tsx';
import { RoleManagementDialog } from './components/RoleManagementDialog.tsx';
import { PlaybookDrawer } from './components/PlaybookDrawer.tsx';
import { DrillDetailsSheet } from './components/DrillDetailsSheet.tsx';
import { QuickNoteDialog } from './components/QuickNoteDialog.tsx';
import { TacticalLayersPanel } from './components/TacticalLayersPanel.tsx';
import { TacticalRoleModal } from './components/TacticalRoleModal.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { FirstLoginEmailModal } from './components/FirstLoginEmailModal.tsx';
import { SuperAdminUserManager } from './components/SuperAdminUserManager.tsx';
import { ClientEmptyDashboard } from './components/ClientEmptyDashboard.tsx';
import { QuotaStatsModal } from './components/QuotaStatsModal.tsx';
import {
  getClientCachedDrill,
  saveDrillToClientCache,
  getQuotaStats,
  incrementQuotaStat,
} from './utils/drillCache.ts';
import { LogOut, UserCog, Zap, ShieldCheck } from 'lucide-react';

export default function App() {
  // Registered users database in state (seeded from DEFAULT_USERS)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('coachtactics_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  // Current session user (null initially -> forces visitor credentials login)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('coachtactics_current_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Drills state
  const [drills, setDrills] = useState<SoccerDrill[]>(() => {
    try {
      const saved = localStorage.getItem('coachtactics_drills');
      return saved ? JSON.parse(saved) : DEFAULT_TACTICAL_DRILLS;
    } catch {
      return DEFAULT_TACTICAL_DRILLS;
    }
  });
  const [activeDrill, setActiveDrill] = useState<SoccerDrill>(DEFAULT_TACTICAL_DRILLS[0]);

  // Auth Dialog States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isFirstLoginEmailModalOpen, setIsFirstLoginEmailModalOpen] = useState(false);
  const [isSuperAdminManagerOpen, setIsSuperAdminManagerOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Playback & Animation Engine (Defaults to playing immediately!)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [animationFraction, setAnimationFraction] = useState(0); // 0 to 1
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [phaseSpeeds, setPhaseSpeeds] = useState<Record<number, number>>({});
  const [highlightedPlayerNumber, setHighlightedPlayerNumber] = useState<number | null>(null);

  // Telestrator & Coaching Notes
  const [activeTool, setActiveTool] = useState<AnnotationTool>('MOVE');
  const [activeColor, setActiveColor] = useState('#FFD600');
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(4);
  const [isDashed, setIsDashed] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [annotations, setAnnotations] = useState<TacticalAnnotation[]>([]);
  const [annotationHistory, setAnnotationHistory] = useState<TacticalAnnotation[][]>([]);
  const [laserPoints, setLaserPoints] = useState<LaserPoint[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickTacticalNote[]>([]);

  // Dialog & View States
  const [isVoicePromptOpen, setIsVoicePromptOpen] = useState(false);
  const [initialVoicePrompt, setInitialVoicePrompt] = useState<string>('');
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isTacticalRoleModalOpen, setIsTacticalRoleModalOpen] = useState(false);
  const [selectedPlayerForRole, setSelectedPlayerForRole] = useState<TacticalPlayer | null>(null);
  const [pendingNoteCoords, setPendingNoteCoords] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [quotaStats, setQuotaStats] = useState(() => getQuotaStats());

  // Filter drills based on user role and ownership
  // A newly created/logged-in client starts with 0 trainings until they create them
  const filteredDrills = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'CLIENT') {
      return drills.filter(
        (d) => d.ownerId === currentUser.id || d.ownerId === currentUser.username
      );
    }
    return drills;
  }, [drills, currentUser]);

  // Keep activeDrill synchronized with filtered drills
  useEffect(() => {
    if (filteredDrills.length > 0) {
      if (!filteredDrills.some((d) => d.id === activeDrill?.id)) {
        setActiveDrill(filteredDrills[0]);
        setCurrentPhaseIndex(0);
        setAnimationFraction(0);
      }
    }
  }, [filteredDrills, activeDrill?.id]);

  // Tactical Layers State (Stacking Multiple Player Animations with Distinct Colored Paths)
  const [tacticalLayers, setTacticalLayers] = useState<Record<TacticalLayerType, TacticalLayerConfig>>({
    ALL: {
      id: 'ALL',
      name: 'Full Pitch Combined',
      visible: true,
      color: '#FFFFFF',
      pathColor: '#00E5FF',
      pathStyle: 'dashed',
      opacity: 1,
      showTrajectories: true,
    },
    OFFENSE: {
      id: 'OFFENSE',
      name: 'Offensive Movement Layer',
      visible: true,
      color: '#00E5FF',
      pathColor: '#00E5FF',
      pathStyle: 'dashed',
      opacity: 1,
      showTrajectories: true,
    },
    DEFENSE: {
      id: 'DEFENSE',
      name: 'Defensive Press Layer',
      visible: true,
      color: '#FF6E40',
      pathColor: '#FF6E40',
      pathStyle: 'dashed',
      opacity: 1,
      showTrajectories: true,
    },
    NEUTRAL: {
      id: 'NEUTRAL',
      name: 'Neutrals & Goalkeeper',
      visible: true,
      color: '#FFD600',
      pathColor: '#FFD600',
      pathStyle: 'dashed',
      opacity: 1,
      showTrajectories: true,
    },
    BALL_CORRIDORS: {
      id: 'BALL_CORRIDORS',
      name: 'Ball Pass Corridors',
      visible: true,
      color: '#FFFFFF',
      pathColor: '#00E676',
      pathStyle: 'dotted',
      opacity: 1,
      showTrajectories: true,
    },
  });

  // Layer toggle handler
  const handleToggleLayer = (layerId: TacticalLayerType) => {
    setTacticalLayers((prev) => {
      const isVisible = !prev[layerId].visible;
      showToast(`${prev[layerId].name} ${isVisible ? 'Shown' : 'Hidden'}`);
      return {
        ...prev,
        [layerId]: {
          ...prev[layerId],
          visible: isVisible,
        },
      };
    });
  };

  const handleUpdateLayerPathColor = (layerId: TacticalLayerType, pathColor: string) => {
    setTacticalLayers((prev) => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        pathColor,
      },
    }));
  };

  const handleToggleTrajectories = (layerId: TacticalLayerType) => {
    setTacticalLayers((prev) => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        showTrajectories: !prev[layerId].showTrajectories,
      },
    }));
  };

  const handleResetLayers = () => {
    setTacticalLayers({
      ALL: { id: 'ALL', name: 'Full Pitch Combined', visible: true, color: '#FFFFFF', pathColor: '#00E5FF', pathStyle: 'dashed', opacity: 1, showTrajectories: true },
      OFFENSE: { id: 'OFFENSE', name: 'Offensive Movement Layer', visible: true, color: '#00E5FF', pathColor: '#00E5FF', pathStyle: 'dashed', opacity: 1, showTrajectories: true },
      DEFENSE: { id: 'DEFENSE', name: 'Defensive Press Layer', visible: true, color: '#FF6E40', pathColor: '#FF6E40', pathStyle: 'dashed', opacity: 1, showTrajectories: true },
      NEUTRAL: { id: 'NEUTRAL', name: 'Neutrals & Goalkeeper', visible: true, color: '#FFD600', pathColor: '#FFD600', pathStyle: 'dashed', opacity: 1, showTrajectories: true },
      BALL_CORRIDORS: { id: 'BALL_CORRIDORS', name: 'Ball Pass Corridors', visible: true, color: '#FFFFFF', pathColor: '#00E676', pathStyle: 'dotted', opacity: 1, showTrajectories: true },
    });
    showToast('All Tactical Layers Reset');
  };

  // Animation Frame Ref
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const currentPhase = activeDrill?.phases?.[currentPhaseIndex] || activeDrill?.phases?.[0];
  const nextPhase =
    activeDrill?.phases && activeDrill.phases.length > 0
      ? activeDrill.phases[(currentPhaseIndex + 1) % activeDrill.phases.length] || currentPhase
      : currentPhase;

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 60FPS Animation Loop
  useEffect(() => {
    let active = true;

    const animate = (now: number) => {
      if (!active) return;

      const deltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (isPlaying && currentPhase && activeDrill?.phases?.length) {
        const phaseMultiplier = phaseSpeeds[currentPhaseIndex] ?? 1.0;
        const effectiveSpeed = speed * phaseMultiplier;
        const phaseDurationMs = (currentPhase.durationSec || 3.0) * 1000;
        const progressIncrement = (deltaMs * effectiveSpeed) / phaseDurationMs;

        setAnimationFraction((prev) => {
          const nextVal = prev + progressIncrement;
          if (nextVal >= 1.0) {
            // Move to next phase seamlessly
            setCurrentPhaseIndex((prevIdx) => (prevIdx + 1) % activeDrill.phases.length);
            return 0;
          }
          return nextVal;
        });
      }

      // Cleanup aged laser beam dots
      setLaserPoints((prev) => prev.filter((lp) => now - lp.timestamp < 1000));

      animFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentPhase, currentPhaseIndex, speed, phaseSpeeds, activeDrill?.phases?.length]);

  // Select Drill and restart animation
  const handleSelectDrill = useCallback((drill: SoccerDrill) => {
    setActiveDrill(drill);
    setCurrentPhaseIndex(0);
    setAnimationFraction(0);
    setIsPlaying(true);
    setPhaseSpeeds({});
    setAnnotations([]);
    setQuickNotes([]);
    showToast(`Loaded: ${drill.title}`);
  }, []);

  // Keyboard Shortcuts (Space: Play/Pause, F: Fullscreen, C: Clear, Z: Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setAnnotations([]);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndoAnnotation();
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < activeDrill.phases.length) {
          setCurrentPhaseIndex(idx);
          setAnimationFraction(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrill.phases.length]);

  // Telestrator Actions
  const handleAddAnnotation = (ann: TacticalAnnotation) => {
    setAnnotationHistory((prev) => [...prev, annotations]);
    setAnnotations((prev) => [...prev, ann]);
  };

  const handleUndoAnnotation = () => {
    if (annotationHistory.length === 0) {
      setAnnotations([]);
      return;
    }
    const prev = annotationHistory[annotationHistory.length - 1];
    setAnnotations(prev);
    setAnnotationHistory((h) => h.slice(0, -1));
  };

  const handleEraseNear = (normX: number, normY: number) => {
    setAnnotations((prev) =>
      prev.filter((ann) => {
        const hasPointNear = ann.points.some(
          (p) => Math.hypot(p.x - normX, p.y - normY) < 0.05
        );
        return !hasPointNear;
      })
    );
  };

  const handleLaserMoved = (normX: number, normY: number) => {
    setLaserPoints((prev) => [
      ...prev,
      { x: normX, y: normY, timestamp: Date.now() },
    ]);
  };

  const handlePitchTapForNote = (normX: number, normY: number) => {
    setPendingNoteCoords({ x: normX, y: normY });
    setIsNoteDialogOpen(true);
  };

  const handleSaveQuickNote = (text: string) => {
    if (!pendingNoteCoords) return;
    const newNote: QuickTacticalNote = {
      id: `note_${Date.now()}`,
      text,
      x: pendingNoteCoords.x,
      y: pendingNoteCoords.y,
      author: currentUser?.name || 'Coach',
      timestamp: Date.now(),
    };
    setQuickNotes((prev) => [...prev, newNote]);
    setPendingNoteCoords(null);
    showToast('Coaching sticky note pinned to pitch');
  };

  // Player Repositioning in active phase
  const handlePlayerMoved = (playerId: string, newX: number, newY: number) => {
    setActiveDrill((prevDrill) => {
      const updatedPhases = prevDrill.phases.map((ph, idx) => {
        if (idx !== currentPhaseIndex) return ph;
        const updatedPlayers = ph.players.map((p) => {
          if (p.id !== playerId) return p;
          return { ...p, x: newX, y: newY, targetX: newX, targetY: newY };
        });
        return { ...ph, players: updatedPlayers };
      });
      return { ...prevDrill, phases: updatedPhases };
    });
  };

  // Assign Tactical Role to Player across all phases of drill
  const handleAssignTacticalRole = (role: string, duty?: string) => {
    if (!selectedPlayerForRole) return;
    const targetPlayerId = selectedPlayerForRole.id;
    const targetNumber = selectedPlayerForRole.number;

    setActiveDrill((prevDrill) => {
      const updatedPhases = prevDrill.phases.map((ph) => {
        const updatedPlayers = ph.players.map((p) => {
          if (p.id === targetPlayerId || p.number === targetNumber) {
            return {
              ...p,
              tacticalRole: role,
              tacticalDuty: duty || p.tacticalDuty,
            };
          }
          return p;
        });
        return { ...ph, players: updatedPlayers };
      });
      return { ...prevDrill, phases: updatedPhases };
    });

    showToast(`Assigned Tactical Role: "${role}" to #${targetNumber}`);
  };

  // AI Prompt Drill Generation (Cache-First Quota-Preserving Architecture)
  const handleGenerateDrill = async (
    prompt: string,
    formation: string,
    focusArea: string,
    forceRefresh = false,
    ecoMode = false
  ) => {
    setIsGenerating(true);
    try {
      // Level 1: Client-Side Instant Cache Check (0ms latency, 0 network requests, 0 API quota)
      if (!forceRefresh) {
        const localCached = getClientCachedDrill(prompt, formation, focusArea);
        if (localCached) {
          const newDrill: SoccerDrill = {
            ...localCached,
            id: `drill_local_${Date.now()}`,
            ownerId: currentUser?.id || currentUser?.username,
            createdByRole: currentUser?.role,
            isCached: true,
            cacheSource: 'client',
            quotaSaved: true,
          };

          setDrills((prev) => [newDrill, ...prev]);
          setActiveDrill(newDrill);
          setCurrentPhaseIndex(0);
          setAnimationFraction(0);
          setIsPlaying(true);
          setIsVoicePromptOpen(false);
          setQuotaStats(getQuotaStats());
          showToast(`⚡ Instant Local Cache Hit (0 API cost, $0 quota): "${newDrill.title}"`);
          return;
        }
      }

      // Level 2: Server-Side Cache & Offline Tactical Engine Call
      const response = await fetch('/api/generate-drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          currentFormation: formation,
          focusArea,
          pitchView: activeDrill?.pitchView || 'FULL',
          forceRefresh,
          ecoMode,
        }),
      });

      const data = await response.json();
      if (data.success && data.drill) {
        const newDrill: SoccerDrill = {
          ...data.drill,
          id: data.drill.id || `drill_${Date.now()}`,
          ownerId: currentUser?.id || currentUser?.username,
          createdByRole: currentUser?.role,
          isCached: data.cached || data.drill.isCached || false,
          cacheSource: data.drill.cacheSource || (data.cached ? 'server-memory' : data.isTacticalFallback ? 'uefa-offline' : 'gemini-fresh'),
          quotaSaved: data.quotaSaved ?? true,
        };

        // Cache newly generated drill in client storage for future instant 0ms hits
        saveDrillToClientCache(prompt, newDrill, formation, focusArea);

        if (data.cached) {
          incrementQuotaStat('serverHits');
        } else if (data.isTacticalFallback || data.ecoMode) {
          incrementQuotaStat('serverHits');
        } else {
          incrementQuotaStat('apiCalls');
        }
        setQuotaStats(getQuotaStats());

        setDrills((prev) => [newDrill, ...prev]);
        setActiveDrill(newDrill);
        setCurrentPhaseIndex(0);
        setAnimationFraction(0);
        setIsPlaying(true);
        setIsVoicePromptOpen(false);

        if (data.cached) {
          showToast(`⚡ Tactical Cache Hit (0 API cost): "${newDrill.title}"`);
        } else if (data.isTacticalFallback || data.ecoMode) {
          showToast(`🌿 UEFA Tactical Engine (0 API quota used): "${newDrill.title}"`);
        } else {
          showToast(`✨ Generated with Gemini Flash-Lite: "${newDrill.title}"`);
        }
      } else {
        showToast(data.error || 'Drill generation error. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to generate drill:', err);
      showToast('Network error generating drill.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Fast Tactical Adjustments (e.g. "+1 Defender Press", "Fullback Overlap")
  const handleFastChange = async (changeType: string) => {
    try {
      const response = await fetch('/api/fast-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drill: activeDrill,
          changeType,
        }),
      });
      const data = await response.json();
      if (data.success && data.drill) {
        setActiveDrill(data.drill);
        setAnimationFraction(0);
        setIsPlaying(true);
        showToast(`Tactical Adjustment Applied: ${changeType}`);
      }
    } catch (err) {
      console.error('Failed fast change:', err);
    }
  };

  // Toggle Pitch View (FULL / HALF)
  const handleTogglePitchView = () => {
    const nextView = activeDrill.pitchView === 'HALF' ? 'FULL' : 'HALF';
    setActiveDrill((prev) => ({ ...prev, pitchView: nextView }));
    showToast(`Switched to ${nextView} Pitch View`);
  };

  // Authentication Handlers
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('coachtactics_current_user', JSON.stringify(user));
    } catch (err) {
      console.error(err);
    }
    setIsLoginModalOpen(false);

    // If first login and needs email setup, trigger FirstLoginEmailModal
    if (user.needsEmailSetup) {
      setIsFirstLoginEmailModalOpen(true);
    } else {
      showToast(`Logged in as @${user.username} (${user.role})`);
    }
  };

  const handleFirstLoginEmailSubmit = (email: string) => {
    if (!currentUser) return;
    const updatedUser: UserProfile = {
      ...currentUser,
      email,
      needsEmailSetup: false,
    };
    setCurrentUser(updatedUser);
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === currentUser.id ? updatedUser : u));
      try {
        localStorage.setItem('coachtactics_users', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    try {
      localStorage.setItem('coachtactics_current_user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error(err);
    }
    setIsFirstLoginEmailModalOpen(false);
    showToast(`Email ${email} linked to @${currentUser.username}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('coachtactics_current_user');
    } catch (err) {
      console.error(err);
    }
    setIsLoginModalOpen(true);
    showToast('Logged out of tactical session');
  };

  // Super Admin CRUD Handlers
  const handleAddUser = (newUserFields: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...newUserFields,
      id: `user_${Date.now()}`,
    };
    setUsers((prev) => {
      const updated = [...prev, newUser];
      try {
        localStorage.setItem('coachtactics_users', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    showToast(`Added User @${newUser.username} (${newUser.role})`);
  };

  const handleUpdateUser = (id: string, updates: Partial<UserProfile>) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === id ? { ...u, ...updates } : u));
      try {
        localStorage.setItem('coachtactics_users', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    if (currentUser && currentUser.id === id) {
      const updatedCurrent = { ...currentUser, ...updates };
      setCurrentUser(updatedCurrent);
      try {
        localStorage.setItem('coachtactics_current_user', JSON.stringify(updatedCurrent));
      } catch (err) {
        console.error(err);
      }
    }
    showToast('User profile updated');
  };

  const handleDeleteUser = (id: string) => {
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      try {
        localStorage.setItem('coachtactics_users', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    showToast('User account removed');
  };

  // 1. Mandatory Visitor Login Gateway: if no user is authenticated, prompt LoginModal
  if (!currentUser) {
    return (
      <div id="coach-tactics-auth-gate" className="min-h-screen bg-[#070D15] text-white flex flex-col">
        {toastMessage && (
          <div
            id="toast-notification-banner"
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#00E5FF] text-[#0A131F] font-bold text-xs px-4 py-2 rounded-full shadow-[0_0_16px_rgba(0,229,255,0.6)] flex items-center gap-2 animate-in slide-in-from-top duration-200"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{toastMessage}</span>
          </div>
        )}
        <LoginModal
          isOpen={true}
          users={users}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // 2. First-Login Email Setup Gate: on first login, prompt to stick an email to username
  if (currentUser.needsEmailSetup || isFirstLoginEmailModalOpen) {
    return (
      <div id="coach-tactics-first-login-gate" className="min-h-screen bg-[#070D15] text-white flex flex-col">
        {toastMessage && (
          <div
            id="toast-notification-banner"
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#00E5FF] text-[#0A131F] font-bold text-xs px-4 py-2 rounded-full shadow-[0_0_16px_rgba(0,229,255,0.6)] flex items-center gap-2 animate-in slide-in-from-top duration-200"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{toastMessage}</span>
          </div>
        )}
        <FirstLoginEmailModal
          isOpen={true}
          currentUser={currentUser}
          onSubmitEmail={handleFirstLoginEmailSubmit}
        />
      </div>
    );
  }

  return (
    <div
      id="coach-tactics-app-root"
      className={`min-h-screen bg-[#070D15] text-white flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-hidden bg-[#050A10]' : ''
      }`}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          id="toast-notification-banner"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#00E5FF] text-[#0A131F] font-bold text-xs px-4 py-2 rounded-full shadow-[0_0_16px_rgba(0,229,255,0.6)] flex items-center gap-2 animate-in slide-in-from-top duration-200"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar (Hidden in boardroom mode) */}
      {!isFullscreen && (
        <header
          id="tactical-header"
          className="w-full bg-[#0B1522] border-b border-[#1A2C40] px-4 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-md"
        >
          {/* Brand & Active Drill Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00B0FF] to-[#00E5FF] flex items-center justify-center text-[#0A131F] font-black shadow-[0_0_12px_rgba(0,229,255,0.4)]">
              ⚽
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wide text-white uppercase truncate">
                  CoachTactics
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 hidden sm:inline-block">
                  60FPS Animation Engine
                </span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <p className="text-xs text-gray-300 font-medium truncate">
                  {activeDrill ? activeDrill.title : 'No active training plan selected'}
                </p>
                {activeDrill?.isCached && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shrink-0">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Free</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* API Quota Preservation Status */}
            <button
              id="header-btn-quota-stats"
              onClick={() => {
                setQuotaStats(getQuotaStats());
                setIsQuotaModalOpen(true);
              }}
              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="API Quota Preservation & Cache Metrics"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Free Quota</span>
              <span className="text-[10px] font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                {quotaStats.totalSaved} Saved
              </span>
            </button>
            {/* Playbook Drawer Button */}
            <button
              id="header-btn-playbook"
              onClick={() => setIsPlaybookOpen(true)}
              className="px-3 py-1.5 bg-[#122235] hover:bg-[#1A314D] border border-[#203650] text-gray-200 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="hidden sm:inline">Playbook</span>
              <span className="text-[10px] text-gray-400 font-mono">
                ({filteredDrills.length})
              </span>
            </button>

            {/* Voice Note & AI Prompt CTA */}
            <button
              id="header-btn-voice-prompt"
              onClick={() => {
                setInitialVoicePrompt('');
                setIsVoicePromptOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
            >
              <Mic className="w-3.5 h-3.5 fill-current" />
              <span>Coach Prompt / AI</span>
            </button>

            {/* Drill Details Dialog */}
            {activeDrill && (
              <button
                id="header-btn-drill-details"
                onClick={() => setIsDetailsOpen(true)}
                className="p-1.5 bg-[#122235] hover:bg-[#1A314D] border border-[#203650] text-gray-300 hover:text-white rounded-lg transition-colors"
                title="Drill Information & Coaching Cues"
              >
                <Info className="w-4 h-4" />
              </button>
            )}

            {/* Super Admin Manager (Only visible for SUPER_ADMIN role) */}
            {currentUser.role === 'SUPER_ADMIN' && (
              <button
                id="header-btn-admin-manager"
                onClick={() => setIsSuperAdminManagerOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/40 text-[#00E5FF] rounded-lg transition-colors font-semibold text-xs"
                title="Super Admin User Management (Add, Edit, Delete Users)"
              >
                <UserCog className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Manage Users</span>
              </button>
            )}

            {/* User Persona Switcher */}
            <button
              id="header-btn-role-switcher"
              onClick={() => setIsRoleModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#122235] hover:bg-[#1A314D] border border-[#203650] rounded-lg transition-colors"
              title="Switch Role / Squad Persona"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-[#0A131F]"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <span className="text-xs font-medium text-gray-200 hidden md:inline">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>

            {/* Logout button */}
            <button
              id="header-btn-logout"
              onClick={handleLogout}
              className="p-1.5 bg-[#122235] hover:bg-[#25151A] border border-[#203650] hover:border-red-500/40 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
              title="Sign Out / Change User"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Boardroom Fullscreen */}
            <button
              id="header-btn-fullscreen"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 bg-[#122235] hover:bg-[#1A314D] border border-[#203650] text-gray-300 hover:text-white rounded-lg transition-colors"
              title="Boardroom Presentation Mode (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 flex flex-col gap-3">
        {filteredDrills.length === 0 || !activeDrill ? (
          <ClientEmptyDashboard
            currentUser={currentUser}
            onCreatePlan={() => {
              setInitialVoicePrompt('');
              setIsVoicePromptOpen(true);
            }}
            onSelectSuggestion={(suggestion) => {
              setInitialVoicePrompt(suggestion);
              setIsVoicePromptOpen(true);
            }}
          />
        ) : (
          <>
            {/* Fullscreen Header Floating Bar */}
            {isFullscreen && (
              <div className="flex items-center justify-between bg-[#0B1522]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#1A2C40]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {activeDrill.title}
                  </span>
                  <span className="text-[10px] text-[#00E5FF] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#00E5FF]/10">
                    Boardroom Presentation
                  </span>
                </div>
                <button
                  id="fullscreen-exit-btn"
                  onClick={() => setIsFullscreen(false)}
                  className="px-3 py-1 bg-[#122235] hover:bg-[#1A314D] text-xs font-semibold text-white rounded-lg flex items-center gap-1"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit (F)</span>
                </button>
              </div>
            )}

            {/* Tactical Pitch Canvas & Live Animation View */}
            <div className="relative w-full">
              <TacticalPitchView
                drill={activeDrill}
                currentPhase={currentPhase}
                nextPhase={nextPhase}
                animationFraction={animationFraction}
                highlightedPlayerNumber={highlightedPlayerNumber}
                isEditable={currentUser.role !== 'PLAYER'}
                annotations={annotations}
                laserPoints={laserPoints}
                quickNotes={quickNotes}
                activeTool={activeTool}
                activeColor={activeColor}
                activeStrokeWidth={activeStrokeWidth}
                isDashed={isDashed}
                isFullscreen={isFullscreen}
                showHeatmap={showHeatmap}
                layers={tacticalLayers}
                onPlayerMoved={handlePlayerMoved}
                onPlayerSelected={(player) => {
                  setHighlightedPlayerNumber(player.number);
                  setSelectedPlayerForRole(player);
                }}
                onAddAnnotation={handleAddAnnotation}
                onEraseNear={handleEraseNear}
                onLaserMoved={handleLaserMoved}
                onPitchTapForNote={handlePitchTapForNote}
              />

              {/* Tactical Layers Stacking Panel */}
              <TacticalLayersPanel
                layers={tacticalLayers}
                isOpen={isLayersOpen}
                onClose={() => setIsLayersOpen(false)}
                onToggleLayer={handleToggleLayer}
                onUpdateLayerColor={(layerId, color) => {
                  setTacticalLayers((prev) => ({
                    ...prev,
                    [layerId]: {
                      ...prev[layerId],
                      color,
                    },
                  }));
                }}
                onUpdateLayerPathColor={handleUpdateLayerPathColor}
                onToggleTrajectories={handleToggleTrajectories}
                onResetLayers={handleResetLayers}
              />

              {/* Quick Active Player Tactical Role Callout / Assign Pill */}
              {selectedPlayerForRole && (
                <div
                  id="selected-player-role-badge"
                  className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-[#0A1626]/90 backdrop-blur-md border border-[#00E5FF]/40 px-3 py-1.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2"
                >
                  <div className="w-5 h-5 rounded-full bg-[#182C44] border border-[#00E5FF] flex items-center justify-center text-[10px] font-bold text-white">
                    {selectedPlayerForRole.number}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-white">
                        {selectedPlayerForRole.label || `Player #${selectedPlayerForRole.number}`}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30">
                        {selectedPlayerForRole.tacticalRole || 'Standard Role'}
                      </span>
                    </div>
                    {selectedPlayerForRole.tacticalDuty && (
                      <span className="text-[9.5px] text-gray-300 max-w-[240px] truncate">
                        {selectedPlayerForRole.tacticalDuty}
                      </span>
                    )}
                  </div>
                  {currentUser.role !== 'PLAYER' && (
                    <button
                      id="open-role-assignment-btn"
                      onClick={() => setIsTacticalRoleModalOpen(true)}
                      className="ml-1 text-[10px] font-bold text-[#00E5FF] hover:text-white px-2 py-0.5 rounded bg-[#162B44] hover:bg-[#1E3B5E] border border-[#00E5FF]/30 transition-colors"
                    >
                      Change Role
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Timeline Player Scrubber Controls */}
            <TimelinePlayerControls
              phases={activeDrill.phases}
              currentPhaseIndex={currentPhaseIndex}
              phaseProgress={animationFraction}
              isPlaying={isPlaying}
              speed={speed}
              pitchView={activeDrill.pitchView}
              isFullscreen={isFullscreen}
              phaseSpeeds={phaseSpeeds}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSelectPhase={(idx) => {
                setCurrentPhaseIndex(idx);
                setAnimationFraction(0);
              }}
              onPreviousPhase={() => {
                setCurrentPhaseIndex((prev) => Math.max(0, prev - 1));
                setAnimationFraction(0);
              }}
              onNextPhase={() => {
                setCurrentPhaseIndex((prev) => Math.min(activeDrill.phases.length - 1, prev + 1));
                setAnimationFraction(0);
              }}
              onReset={() => {
                setCurrentPhaseIndex(0);
                setAnimationFraction(0);
              }}
              onSpeedChange={(newSpeed) => setSpeed(newSpeed)}
              onPhaseSpeedChange={(phaseIdx, phaseSpeed) => {
                setPhaseSpeeds((prev) => ({
                  ...prev,
                  [phaseIdx]: phaseSpeed,
                }));
              }}
              onResetPhaseSpeed={(phaseIdx) => {
                setPhaseSpeeds((prev) => {
                  const updated = { ...prev };
                  delete updated[phaseIdx];
                  return updated;
                });
              }}
              onTogglePitchView={handleTogglePitchView}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            />

            {/* Telestrator Drawing Suite */}
            <TelestratorToolbar
              activeTool={activeTool}
              activeColor={activeColor}
              activeStrokeWidth={activeStrokeWidth}
              isDashed={isDashed}
              canUndo={annotationHistory.length > 0}
              showHeatmap={showHeatmap}
              isLayersOpen={isLayersOpen}
              onSelectTool={(tool) => setActiveTool(tool)}
              onSelectColor={(color) => setActiveColor(color)}
              onToggleDashed={() => setIsDashed(!isDashed)}
              onToggleHeatmap={() => {
                setShowHeatmap((prev) => !prev);
                showToast(!showHeatmap ? 'Intensity Heatmap Overlay Enabled' : 'Intensity Heatmap Overlay Disabled');
              }}
              onToggleLayers={() => setIsLayersOpen((prev) => !prev)}
              onUndo={handleUndoAnnotation}
              onClearAll={() => setAnnotations([])}
            />

            {/* Live Phase Instruction & Tactical Coaching Cues */}
            <CoachingExplanationOverlay
              drill={activeDrill}
              currentPhase={currentPhase}
              onOpenVoicePrompt={() => {
                setInitialVoicePrompt('');
                setIsVoicePromptOpen(true);
              }}
              onOpenAddNote={() => {
                setPendingNoteCoords({ x: 0.5, y: 0.5 });
                setIsNoteDialogOpen(true);
              }}
              onViewDrillDetails={() => setIsDetailsOpen(true)}
            />

            {/* Fast Adjustments Bar */}
            <FastChangesBar onFastChange={handleFastChange} />
          </>
        )}
      </main>

      {/* Floating Prompt & Voice Note Action (Always easily accessible) */}
      <button
        id="floating-voice-note-fab"
        onClick={() => setIsVoicePromptOpen(true)}
        className="fixed bottom-5 right-5 z-40 px-4 py-3 bg-gradient-to-r from-[#00B0FF] to-[#00E5FF] text-[#0A131F] font-bold text-xs rounded-full shadow-[0_0_20px_rgba(0,229,255,0.6)] flex items-center gap-2 hover:scale-105 transition-all"
        title="Speak or Prompt to Generate Drill Animation"
      >
        <Mic className="w-4 h-4 fill-current" />
        <span>Coach Voice Note / Prompt</span>
      </button>

      {/* Modals & Dialogs */}
      <QuotaStatsModal
        isOpen={isQuotaModalOpen}
        onClose={() => {
          setIsQuotaModalOpen(false);
          setQuotaStats(getQuotaStats());
        }}
        onCacheCleared={() => {
          setQuotaStats(getQuotaStats());
          showToast('Tactical Cache reset and re-seeded with UEFA tactics.');
        }}
      />

      <VoicePromptSheet
        isOpen={isVoicePromptOpen}
        onClose={() => {
          setIsVoicePromptOpen(false);
          setInitialVoicePrompt('');
        }}
        onGenerateDrill={handleGenerateDrill}
        isGenerating={isGenerating}
        userRole={currentUser.role}
        username={currentUser.username}
        initialPrompt={initialVoicePrompt}
      />

      <RoleManagementDialog
        isOpen={isRoleModalOpen}
        currentUser={currentUser}
        availableUsers={DEFAULT_USERS}
        onSelectUser={(user) => {
          setCurrentUser(user);
          showToast(`Switched to: ${user.name} (${user.role})`);
        }}
        onClose={() => setIsRoleModalOpen(false)}
      />

      <SuperAdminUserManager
        isOpen={isSuperAdminManagerOpen}
        currentUser={currentUser}
        users={users}
        onClose={() => setIsSuperAdminManagerOpen(false)}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />

      <PlaybookDrawer
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
        drills={filteredDrills}
        activeDrillId={activeDrill?.id || ''}
        onSelectDrill={handleSelectDrill}
        onOpenVoicePrompt={() => {
          setInitialVoicePrompt('');
          setIsVoicePromptOpen(true);
        }}
      />

      {activeDrill && (
        <DrillDetailsSheet
          drill={activeDrill}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}

      <QuickNoteDialog
        isOpen={isNoteDialogOpen}
        coords={pendingNoteCoords}
        authorName={currentUser.name}
        onSave={handleSaveQuickNote}
        onClose={() => {
          setIsNoteDialogOpen(false);
          setPendingNoteCoords(null);
        }}
      />

      {/* Tactical Role Assignment Modal */}
      <TacticalRoleModal
        isOpen={isTacticalRoleModalOpen}
        player={selectedPlayerForRole}
        onClose={() => setIsTacticalRoleModalOpen(false)}
        onSelectRole={(role, duty) => handleAssignTacticalRole(role, duty)}
      />
    </div>
  );
}
