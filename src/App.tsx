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
import { DEFAULT_TACTICAL_DRILLS } from './data/sampleTactics.ts';
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
import { CoachPlanEditorTutorialModal } from './components/CoachPlanEditorTutorialModal.tsx';
import {
  getClientCachedDrill,
  saveDrillToClientCache,
  getQuotaStats,
  incrementQuotaStat,
  clearClientCache,
} from './utils/drillCache.ts';
import { loadSessionToken, saveSessionToken } from './utils/sessionToken.ts';
import { LogOut, UserCog, Zap, ShieldCheck } from 'lucide-react';

export default function App() {
  // Registered users directory (synced from server for SUPER_ADMIN)
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Authenticated server identity
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  // Bearer token: kept in memory; persisted to sessionStorage only when embedded (AI Studio preview)
  const [authToken, setAuthToken] = useState<string | null>(() => loadSessionToken());
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  useEffect(() => {
    saveSessionToken(authToken);
  }, [authToken]);

  // Verify server-side session on mount
  useEffect(() => {
    let isMounted = true;
    const initialToken = loadSessionToken();
    fetch('/api/auth/me', {
      credentials: 'include',
      headers: initialToken ? { Authorization: `Bearer ${initialToken}` } : {},
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setCurrentUser(data.user);
          }
        } else if (res.status === 401 && isMounted) {
          setAuthToken(null);
        }
      })
      .catch(() => {
        // Unauthenticated visitor
      })
      .finally(() => {
        if (isMounted) setIsAuthChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync users list from server when SUPER_ADMIN is authenticated
  const fetchServerUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', {
        credentials: 'include',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error('Failed to sync users directory:', err);
    }
  }, [authToken]);

  useEffect(() => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      fetchServerUsers();
    }
  }, [currentUser?.role, fetchServerUsers]);

  // Drills state initialized with default system drills
  const [drills, setDrills] = useState<SoccerDrill[]>(DEFAULT_TACTICAL_DRILLS);
  const [activeDrill, setActiveDrill] = useState<SoccerDrill>(DEFAULT_TACTICAL_DRILLS[0]);
  const [isSavingDrill, setIsSavingDrill] = useState<boolean>(false);

  // Auth Dialog States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isFirstLoginEmailModalOpen, setIsFirstLoginEmailModalOpen] = useState(false);
  const [isSuperAdminManagerOpen, setIsSuperAdminManagerOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Server-Authoritative Drill Repository Sync
  const fetchServerDrills = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/drills', {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.drills)) {
          setDrills(data.drills);
          if (data.drills.length > 0) {
            setActiveDrill((prev) => {
              const stillExists = data.drills.find((d: SoccerDrill) => d.id === prev?.id);
              return stillExists || data.drills[0];
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load server drills:', err);
    }
  }, [currentUser, authToken]);

  // One-time safe migration from browser localStorage to server-authoritative repository
  useEffect(() => {
    if (!currentUser) return;

    const checkAndMigrateLocalStorage = async () => {
      try {
        const rawLocal = localStorage.getItem('coachtactics_drills');
        if (!rawLocal) {
          fetchServerDrills();
          return;
        }

        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const legacyDrillsToMigrate = parsed.filter(
            (d: any) => !['drill_overlap_wing', 'drill_gegenpress_trap', 'drill_counter_attack'].includes(d.id)
          );

          if (legacyDrillsToMigrate.length > 0) {
            const migrateRes = await fetch('/api/drills/migrate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              },
              credentials: 'include',
              body: JSON.stringify({ drills: legacyDrillsToMigrate }),
            });
            if (migrateRes.ok) {
              const resData = await migrateRes.json();
              if (resData.imported > 0) {
                showToast(`Migrated ${resData.imported} drill(s) from local browser to server`);
              }
            }
          }
          // Remove legacy local key once processed
          localStorage.removeItem('coachtactics_drills');
        }
      } catch (err) {
        console.error('Migration error:', err);
      } finally {
        fetchServerDrills();
      }
    };

    checkAndMigrateLocalStorage();
  }, [currentUser?.id, authToken, fetchServerDrills]);

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
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
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
        (d) => d.ownerId === currentUser.id || d.ownerId === currentUser.username || d.createdBy === currentUser.id
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

  // Refs mirror playback state so the rAF loop never has to call setState inside another
  // setState updater (StrictMode runs updaters twice in dev, which skipped phases in the preview).
  const fractionRef = useRef(0);
  const phaseIndexRef = useRef(0);
  useEffect(() => {
    fractionRef.current = animationFraction;
  }, [animationFraction]);
  useEffect(() => {
    phaseIndexRef.current = currentPhaseIndex;
  }, [currentPhaseIndex]);

  // 60FPS Animation Loop
  const phases = activeDrill?.phases;
  useEffect(() => {
    let active = true;

    const animate = (now: number) => {
      if (!active) return;

      // Clamp so returning to a background tab doesn't jump several phases at once.
      const deltaMs = Math.min(100, now - lastTimeRef.current);
      lastTimeRef.current = now;

      if (isPlaying && phases && phases.length > 0) {
        const idx = phaseIndexRef.current < phases.length ? phaseIndexRef.current : 0;
        const phase = phases[idx];
        const effectiveSpeed = speed * (phaseSpeeds[idx] ?? 1.0);
        const phaseDurationMs = (phase?.durationSec || 3.0) * 1000;
        const next = fractionRef.current + (deltaMs * effectiveSpeed) / phaseDurationMs;

        if (next >= 1.0) {
          const nextIdx = (idx + 1) % phases.length;
          phaseIndexRef.current = nextIdx;
          fractionRef.current = 0;
          setCurrentPhaseIndex(nextIdx);
          setAnimationFraction(0);
        } else {
          fractionRef.current = next;
          setAnimationFraction(next);
        }
      }

      // Expire laser dots. Timestamps are Date.now() (the old code compared them against
      // performance.now(), so dots never expired). Returning prev skips a re-render when idle.
      setLaserPoints((prev) => {
        if (prev.length === 0) return prev;
        const cutoff = Date.now() - 1000;
        const kept = prev.filter((lp) => lp.timestamp >= cutoff);
        return kept.length === prev.length ? prev : kept;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speed, phaseSpeeds, phases]);

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

  // Player Repositioning in active phase (preserving trajectory offset and keeping state in sync)
  const handlePlayerMoved = (playerId: string, newX: number, newY: number) => {
    setActiveDrill((prevDrill) => {
      const updatedPhases = prevDrill.phases.map((ph, idx) => {
        if (idx !== currentPhaseIndex) return ph;
        const updatedPlayers = ph.players.map((p) => {
          if (p.id !== playerId) return p;
          const dx = (p.targetX ?? p.x) - p.x;
          const dy = (p.targetY ?? p.y) - p.y;
          const updatedTargetX = Math.max(0.02, Math.min(0.98, newX + dx));
          const updatedTargetY = Math.max(0.02, Math.min(0.98, newY + dy));
          return {
            ...p,
            x: newX,
            y: newY,
            targetX: updatedTargetX,
            targetY: updatedTargetY,
          };
        });
        return { ...ph, players: updatedPlayers };
      });
      const updated = { ...prevDrill, phases: updatedPhases };
      setDrills((all) => all.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    });
  };

  // Player Target / Movement Vector Destination in active phase
  const handlePlayerTargetMoved = (playerId: string, newTargetX: number, newTargetY: number) => {
    setActiveDrill((prevDrill) => {
      const updatedPhases = prevDrill.phases.map((ph, idx) => {
        if (idx !== currentPhaseIndex) return ph;
        const updatedPlayers = ph.players.map((p) => {
          if (p.id !== playerId) return p;
          return {
            ...p,
            targetX: newTargetX,
            targetY: newTargetY,
          };
        });
        return { ...ph, players: updatedPlayers };
      });
      const updated = { ...prevDrill, phases: updatedPhases };
      setDrills((all) => all.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    });
  };

  // Ball Destination in active phase
  const handleBallTargetMoved = (newTargetX: number, newTargetY: number) => {
    setActiveDrill((prevDrill) => {
      const updatedPhases = prevDrill.phases.map((ph, idx) => {
        if (idx !== currentPhaseIndex) return ph;
        return {
          ...ph,
          ball: {
            ...ph.ball,
            targetX: newTargetX,
            targetY: newTargetY,
          },
        };
      });
      const updated = { ...prevDrill, phases: updatedPhases };
      setDrills((all) => all.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    });
  };

  // Ball Repositioning in active phase
  const handleBallMoved = (newX: number, newY: number) => {
    setActiveDrill((prevDrill) => {
      const updatedPhases = prevDrill.phases.map((ph, idx) => {
        if (idx !== currentPhaseIndex) return ph;
        const dx = (ph.ball.targetX ?? ph.ball.x) - ph.ball.x;
        const dy = (ph.ball.targetY ?? ph.ball.y) - ph.ball.y;
        return {
          ...ph,
          ball: {
            ...ph.ball,
            x: newX,
            y: newY,
            targetX: Math.max(0.02, Math.min(0.98, newX + dx)),
            targetY: Math.max(0.02, Math.min(0.98, newY + dy)),
          },
        };
      });
      const updated = { ...prevDrill, phases: updatedPhases };
      setDrills((all) => all.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
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
      const updated = { ...prevDrill, phases: updatedPhases };
      setDrills((all) => all.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    });

    showToast(`Assigned Tactical Role: "${role}" to #${targetNumber}`);
  };

  // Save a newly generated drill to the server playbook. Returns the stored drill, or null on failure.
  const persistGeneratedDrill = async (drill: SoccerDrill): Promise<SoccerDrill | null> => {
    try {
      const saveRes = await fetch('/api/drills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(drill),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (saveRes.ok && saveData.success && saveData.drill) return saveData.drill as SoccerDrill;
      if (saveData.error) showToast(saveData.error);
    } catch (saveErr) {
      console.error('Failed to persist drill to server repository:', saveErr);
    }
    return null;
  };

  const activateNewDrill = (drill: SoccerDrill) => {
    setDrills((prev) => [drill, ...prev.filter((d) => d.id !== drill.id)]);
    setActiveDrill(drill);
    setCurrentPhaseIndex(0);
    setAnimationFraction(0);
    setIsPlaying(true);
    setIsVoicePromptOpen(false);
  };

  // AI Prompt Drill Generation (cache-first, quota-preserving)
  const handleGenerateDrill = async (
    prompt: string,
    formation: string,
    focusArea: string,
    forceRefresh = false,
    ecoMode = false
  ) => {
    if (!currentUser) return;
    setIsGenerating(true);
    const pitchView = activeDrill?.pitchView || 'FULL';
    try {
      // Level 1: this user's local cache (no network, no quota)
      if (!forceRefresh) {
        const localCached = getClientCachedDrill(currentUser.id, prompt, formation, focusArea, pitchView, ecoMode);
        if (localCached) {
          const saved = await persistGeneratedDrill(localCached);
          if (saved) {
            activateNewDrill(saved);
            setQuotaStats(getQuotaStats());
            showToast(`Loaded from your recent drills (no AI cost): "${saved.title}"`);
            return;
          }
          // Could not save: fall through to the server so the drill ends up in the playbook.
        }
      }

      // Level 2: server (cache → eco engine → Gemini → offline fallback)
      const response = await fetch('/api/generate-drill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt,
          currentFormation: formation,
          focusArea,
          pitchView,
          forceRefresh,
          ecoMode,
        }),
      });

      if (response.status === 401) {
        setCurrentUser(null);
        setAuthToken(null);
        showToast('Your session expired. Please sign in again.');
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.drill) {
        showToast(data.error || 'Drill generation failed. Please try again.');
        return;
      }

      const isFallback = Boolean(data.isTacticalFallback);
      const saved = await persistGeneratedDrill(data.drill);
      const drill: SoccerDrill = saved ?? {
        ...data.drill,
        isCached: data.cached || data.drill.isCached || false,
        quotaSaved: data.quotaSaved ?? true,
      };

      // Only cache real results locally. A fallback template must not hide Gemini once it recovers.
      if (saved && !isFallback) {
        saveDrillToClientCache(currentUser.id, prompt, saved, formation, focusArea, pitchView, ecoMode);
      }

      if (data.cached || isFallback || data.ecoMode) {
        incrementQuotaStat('serverHits');
      } else {
        incrementQuotaStat('apiCalls');
      }
      setQuotaStats(getQuotaStats());
      activateNewDrill(drill);

      const unsavedNote = saved ? '' : ' (not saved to playbook)';
      if (isFallback) {
        showToast(
          data.fallbackReason === 'NO_API_KEY'
            ? `No Gemini key configured: built from the offline template instead${unsavedNote}`
            : `Gemini is unavailable right now: built from the offline template instead${unsavedNote}`
        );
      } else if (data.ecoMode) {
        showToast(`Built with the offline tactical engine (eco mode)${unsavedNote}: "${drill.title}"`);
      } else if (data.cached) {
        showToast(`Loaded from cache (no AI cost)${unsavedNote}: "${drill.title}"`);
      } else {
        showToast(`Generated with ${data.modelUsed || 'Gemini'}${unsavedNote}: "${drill.title}"`);
      }
    } catch (err: any) {
      console.error('Failed to generate drill:', err);
      showToast('Network error while generating the drill.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete drill from server repository
  const handleDeleteDrill = async (drillId: string) => {
    try {
      const res = await fetch(`/api/drills/${drillId}`, {
        method: 'DELETE',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to delete drill');
        return;
      }
      setDrills((prev) => {
        const remaining = prev.filter((d) => d.id !== drillId);
        if (activeDrill?.id === drillId) {
          setActiveDrill(remaining[0] || DEFAULT_TACTICAL_DRILLS[0]);
        }
        return remaining;
      });
      showToast('Drill removed from tactical playbook');
    } catch (err) {
      console.error('Failed to delete drill:', err);
      showToast('Network error deleting drill');
    }
  };

  // Fast Tactical Adjustments (e.g. "+1 Defender Press", "Fullback Overlap")
  const handleFastChange = async (changeType: string) => {
    try {
      const response = await fetch('/api/fast-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          drill: activeDrill,
          changeType,
        }),
      });

      if (response.status === 401) {
        setCurrentUser(null);
        setAuthToken(null);
        showToast('Authentication session expired. Please sign in again.');
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && data.drill) {
        setActiveDrill(data.drill);
        setDrills((prev) => prev.map((d) => (d.id === data.drill.id ? data.drill : d)));
        setAnimationFraction(0);
        setIsPlaying(true);
        showToast(data.message || `Adjustment applied: ${changeType}`);
      } else {
        showToast(data.error || 'Could not apply that adjustment.');
      }
    } catch (err) {
      console.error('Failed fast change:', err);
    }
  };

  // Toggle Pitch View (FULL / HALF)
  const handleTogglePitchView = () => {
    const nextView: 'FULL' | 'HALF' = activeDrill.pitchView === 'HALF' ? 'FULL' : 'HALF';
    setActiveDrill((prev) => {
      const updated: SoccerDrill = { ...prev, pitchView: nextView };
      setDrills((all) => all.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    });
    showToast(`Switched to ${nextView} Pitch View`);
  };

  // Authoritative Server-Side Save for Currently Edited Tactical Plan
  const handleSaveCurrentDrill = async () => {
    if (!activeDrill) return;
    setIsSavingDrill(true);
    try {
      const isOwned =
        Boolean(currentUser) &&
        (activeDrill.createdBy === currentUser?.id || activeDrill.ownerId === currentUser?.id);
      const isSystem = activeDrill.isSystem === true;

      const url = isOwned && !isSystem ? `/api/drills/${activeDrill.id}` : '/api/drills';
      const method = isOwned && !isSystem ? 'PUT' : 'POST';

      const payload = isOwned && !isSystem
        ? activeDrill
        : {
            ...activeDrill,
            id: `drill_${Date.now()}`,
            title: isSystem ? `${activeDrill.title} (Custom)` : activeDrill.title,
            isSystem: false,
          };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        showToast('Please sign in to save your tactical plan to the playbook.');
        setIsLoginModalOpen(true);
        return;
      }

      const data = await res.json();
      if (res.ok && data.success && data.drill) {
        const saved = data.drill;
        setActiveDrill(saved);
        setDrills((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)]);
        showToast(`Saved "${saved.title}" (v${saved.version}) to playbook`);
      } else {
        showToast(data.error || 'Failed to save tactical plan.');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Network error saving tactical plan.');
    } finally {
      setIsSavingDrill(false);
    }
  };

  // Authentication Handlers (Server-Backed)
  const handleLoginSuccess = (user: UserProfile, token?: string) => {
    setCurrentUser(user);
    if (token) setAuthToken(token);
    setIsLoginModalOpen(false);

    // If first login and needs email setup, trigger FirstLoginEmailModal
    if (user.needsEmailSetup) {
      setIsFirstLoginEmailModalOpen(true);
    } else {
      showToast(`Logged in as @${user.username} (${user.role})`);
    }
  };

  const handleFirstLoginEmailSubmit = async (email: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/auth/me/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setCurrentUser(data.user);
        setIsFirstLoginEmailModalOpen(false);
        showToast(`Email ${email} linked to @${data.user.username}!`);
      } else {
        showToast(data.error || 'Failed to update email address.');
      }
    } catch (err) {
      console.error('Failed to link email:', err);
      showToast('Network error updating email.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setAuthToken(null);
    setUsers([]);
    clearClientCache();
    try {
      localStorage.removeItem('coachtactics_current_user');
    } catch (err) {
      console.error(err);
    }
    setIsLoginModalOpen(true);
    showToast('Logged out of tactical session');
  };

  // Super Admin User Management (Server-Authoritative CRUD)
  const handleAddUser = async (newUserFields: Omit<UserProfile, 'id'>) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(newUserFields),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to create user');
        return;
      }
      setUsers((prev) => [...prev, data.user]);
      showToast(`Added User @${data.user.username} (${data.user.role})`);
    } catch (err) {
      console.error(err);
      showToast('Network error creating user');
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<UserProfile>) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update user');
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
      if (currentUser && currentUser.id === id) {
        setCurrentUser(data.user);
        if (data.token) setAuthToken(data.token);
      }
      showToast(data.sessionsRevoked && currentUser?.id !== id ? 'User updated. Their existing sessions were signed out.' : 'User profile updated');
    } catch (err) {
      console.error(err);
      showToast('Network error updating user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to delete user');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('User account removed');
    } catch (err) {
      console.error(err);
      showToast('Network error deleting user');
    }
  };

  // 0. Auth Verification State: display smooth tactical loader while verifying server session
  if (isAuthChecking) {
    return (
      <div id="coach-tactics-auth-loading" className="min-h-screen bg-[#070D15] text-white flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400 font-medium">Verifying tactical credentials...</span>
      </div>
    );
  }

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

            {/* Coach Plan Editor Tutorial Guide */}
            <button
              id="header-btn-coach-guide"
              onClick={() => setIsTutorialOpen(true)}
              className="px-2.5 py-1.5 bg-[#122235] hover:bg-[#1A314D] border border-[#00E5FF]/40 text-[#00E5FF] hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Coach Plan Editor Guide: How to manually create, edit, pass, and choreograph drills"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Coach Guide</span>
            </button>

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
              title="Your account and role"
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
                onPlayerTargetMoved={handlePlayerTargetMoved}
                onBallMoved={handleBallMoved}
                onBallTargetMoved={handleBallTargetMoved}
                onPlayerSelected={(player) => {
                  setHighlightedPlayerNumber(player.number);
                  setSelectedPlayerForRole(player);
                }}
                onAddAnnotation={handleAddAnnotation}
                onEraseNear={handleEraseNear}
                onLaserMoved={handleLaserMoved}
                onPitchTapForNote={handlePitchTapForNote}
                onInteractionStart={() => setIsPlaying(false)}
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
              onSavePlan={handleSaveCurrentDrill}
              isSaving={isSavingDrill}
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
              onOpenTutorial={() => setIsTutorialOpen(true)}
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
              onOpenTutorial={() => setIsTutorialOpen(true)}
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
        availableUsers={[currentUser]}
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
        currentUser={currentUser}
        onSelectDrill={handleSelectDrill}
        onDeleteDrill={handleDeleteDrill}
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

      {/* Coach Plan Editor Help & Tutorial Modal */}
      <CoachPlanEditorTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onOpenPlaybook={() => setIsPlaybookOpen(true)}
      />
    </div>
  );
}
