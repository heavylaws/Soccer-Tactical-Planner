import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  SoccerDrill,
  DrillPhase,
  TacticalPlayer,
  AnnotationTool,
  TacticalAnnotation,
  LaserPoint,
  QuickTacticalNote,
  AnnotationPoint,
  EquipmentType,
  BallTrajectory,
  TacticalLayerConfig,
  TacticalLayerType,
} from '../types.ts';

interface TacticalPitchViewProps {
  drill: SoccerDrill;
  currentPhase: DrillPhase;
  nextPhase: DrillPhase;
  animationFraction: number; // 0 to 1
  highlightedPlayerNumber?: number | null;
  isEditable?: boolean;
  annotations: TacticalAnnotation[];
  laserPoints: LaserPoint[];
  quickNotes: QuickTacticalNote[];
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  isDashed: boolean;
  isFullscreen?: boolean;
  showHeatmap?: boolean;
  layers?: Record<TacticalLayerType, TacticalLayerConfig>;
  onPlayerMoved: (playerId: string, newX: number, newY: number) => void;
  onPlayerTargetMoved: (playerId: string, targetX: number, targetY: number) => void;
  onBallMoved?: (newX: number, newY: number) => void;
  onBallTargetMoved?: (targetX: number, targetY: number) => void;
  onPlayerSelected: (player: TacticalPlayer) => void;
  onPlayerHovered?: (player: TacticalPlayer | null) => void;
  onAddAnnotation: (annotation: TacticalAnnotation) => void;
  onEraseNear: (normX: number, normY: number) => void;
  onLaserMoved: (normX: number, normY: number) => void;
  onPitchTapForNote: (normX: number, normY: number) => void;
  onDeleteNote?: (noteId: string) => void;
}

export const TacticalPitchView: React.FC<TacticalPitchViewProps> = ({
  drill,
  currentPhase,
  nextPhase,
  animationFraction,
  highlightedPlayerNumber,
  isEditable = true,
  annotations,
  laserPoints,
  quickNotes,
  activeTool,
  activeColor,
  activeStrokeWidth,
  isDashed,
  isFullscreen = false,
  showHeatmap = false,
  layers,
  onPlayerMoved,
  onPlayerTargetMoved,
  onBallMoved,
  onBallTargetMoved,
  onPlayerSelected,
  onPlayerHovered,
  onAddAnnotation,
  onEraseNear,
  onLaserMoved,
  onPitchTapForNote,
  onDeleteNote,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [draggingTargetPlayerId, setDraggingTargetPlayerId] = useState<string | null>(null);
  const [draggingBall, setDraggingBall] = useState<boolean>(false);
  const [draggingBallTarget, setDraggingBallTarget] = useState<boolean>(false);
  const [hoveredPlayerNumber, setHoveredPlayerNumber] = useState<number | null>(null);
  const [draftPoints, setDraftPoints] = useState<AnnotationPoint[]>([]);
  const [draftStart, setDraftStart] = useState<AnnotationPoint | null>(null);
  const [draftEnd, setDraftEnd] = useState<AnnotationPoint | null>(null);

  const isHalfPitch = drill.pitchView === 'HALF';

  // Get normalized coordinates from mouse/touch event
  const getNormalizedCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): AnnotationPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Handle pointer down / touch start
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getNormalizedCoords(e);

    if (activeTool === 'MOVE') {
      if (!isEditable) return;
      // 1. First check if clicking near destination target handle of any player
      const clickedTargetPlayer = currentPhase.players.find((p) => {
        const tx = p.targetX ?? p.x;
        const ty = p.targetY ?? p.y;
        return Math.hypot(tx - x, ty - y) < 0.06;
      });
      if (clickedTargetPlayer) {
        setDraggingTargetPlayerId(clickedTargetPlayer.id);
        onPlayerSelected(clickedTargetPlayer);
        return;
      }

      // 2. Check if clicking near ball destination target handle
      if (currentPhase.ball.targetX != null && currentPhase.ball.targetY != null) {
        const btx = currentPhase.ball.targetX;
        const bty = currentPhase.ball.targetY;
        if (Math.hypot(btx - x, bty - y) < 0.06) {
          setDraggingBallTarget(true);
          return;
        }
      }

      // 3. Check if clicking near ball marker
      if (Math.hypot(currentPhase.ball.x - x, currentPhase.ball.y - y) < 0.06) {
        setDraggingBall(true);
        return;
      }

      // 4. Check if clicking near any player marker body
      const clickedPlayer = currentPhase.players.find((p) => {
        const d = Math.hypot(p.x - x, p.y - y);
        return d < 0.08;
      });
      if (clickedPlayer) {
        setDraggingPlayerId(clickedPlayer.id);
        onPlayerSelected(clickedPlayer);
      }
    } else if (activeTool === 'PEN') {
      setDraftPoints([{ x, y }]);
    } else if (['ARROW', 'PASS', 'DRIBBLE', 'ZONE'].includes(activeTool)) {
      setDraftStart({ x, y });
      setDraftEnd({ x, y });
    } else if (activeTool === 'LASER') {
      onLaserMoved(x, y);
    } else if (activeTool === 'NOTE') {
      onPitchTapForNote(x, y);
    } else if (activeTool === 'ERASER') {
      onEraseNear(x, y);
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getNormalizedCoords(e);

    // Detect hovered player for tactical role tooltips and highlights (using authoritative target interpolation)
    if (!draggingPlayerId && !draggingTargetPlayerId && !draggingBall && !draggingBallTarget) {
      const hovered = currentPhase.players.find((p) => {
        const targetX = p.targetX ?? p.x;
        const targetY = p.targetY ?? p.y;
        const currentInterpX = p.x + (targetX - p.x) * animationFraction;
        const currentInterpY = p.y + (targetY - p.y) * animationFraction;
        const d = Math.hypot(currentInterpX - x, currentInterpY - y);
        return d < 0.055;
      });

      const newHoverNum = hovered ? hovered.number : null;
      if (newHoverNum !== hoveredPlayerNumber) {
        setHoveredPlayerNumber(newHoverNum);
        onPlayerHovered?.(hovered || null);
      }
    }

    if (activeTool === 'MOVE' && draggingTargetPlayerId) {
      onPlayerTargetMoved(
        draggingTargetPlayerId,
        Math.max(0.02, Math.min(0.98, x)),
        Math.max(0.02, Math.min(0.98, y))
      );
    } else if (activeTool === 'MOVE' && draggingPlayerId) {
      onPlayerMoved(
        draggingPlayerId,
        Math.max(0.02, Math.min(0.98, x)),
        Math.max(0.02, Math.min(0.98, y))
      );
    } else if (activeTool === 'MOVE' && draggingBallTarget && onBallTargetMoved) {
      onBallTargetMoved(
        Math.max(0.02, Math.min(0.98, x)),
        Math.max(0.02, Math.min(0.98, y))
      );
    } else if (activeTool === 'MOVE' && draggingBall && onBallMoved) {
      onBallMoved(
        Math.max(0.02, Math.min(0.98, x)),
        Math.max(0.02, Math.min(0.98, y))
      );
    } else if (activeTool === 'PEN' && draftPoints.length > 0) {
      setDraftPoints((prev) => [...prev, { x, y }]);
    } else if (['ARROW', 'PASS', 'DRIBBLE', 'ZONE'].includes(activeTool) && draftStart) {
      setDraftEnd({ x, y });
    } else if (activeTool === 'LASER') {
      onLaserMoved(x, y);
    } else if (activeTool === 'ERASER' && ('buttons' in e ? e.buttons === 1 : true)) {
      onEraseNear(x, y);
    }
  };

  const handlePointerLeave = () => {
    setHoveredPlayerNumber(null);
    onPlayerHovered?.(null);
  };

  const handlePointerUp = () => {
    if (activeTool === 'MOVE') {
      setDraggingPlayerId(null);
      setDraggingTargetPlayerId(null);
      setDraggingBall(false);
      setDraggingBallTarget(false);
    } else if (activeTool === 'PEN' && draftPoints.length >= 2) {
      onAddAnnotation({
        id: `ann_${Date.now()}`,
        tool: 'PEN',
        points: draftPoints,
        color: activeColor,
        strokeWidth: activeStrokeWidth,
        isDashed,
      });
      setDraftPoints([]);
    } else if (activeTool === 'ARROW' && draftStart && draftEnd) {
      const dist = Math.hypot(draftEnd.x - draftStart.x, draftEnd.y - draftStart.y);
      if (dist > 0.02) {
        // If movement arrow originates near a player, authoritatively set that player's destination
        const sourcePlayer = currentPhase.players.find((p) => {
          return Math.hypot(p.x - draftStart.x, p.y - draftStart.y) < 0.08;
        });
        if (sourcePlayer) {
          onPlayerTargetMoved(
            sourcePlayer.id,
            Math.max(0.02, Math.min(0.98, draftEnd.x)),
            Math.max(0.02, Math.min(0.98, draftEnd.y))
          );
        } else {
          // General pitch movement arrow annotation
          onAddAnnotation({
            id: `ann_${Date.now()}`,
            tool: 'ARROW',
            points: [draftStart, draftEnd],
            color: activeColor,
            strokeWidth: activeStrokeWidth,
            isDashed,
          });
        }
      }
      setDraftStart(null);
      setDraftEnd(null);
    } else if (activeTool === 'PASS' && draftStart && draftEnd) {
      const dist = Math.hypot(draftEnd.x - draftStart.x, draftEnd.y - draftStart.y);
      if (dist > 0.02) {
        // If pass vector originates near current ball, authoritatively set ball destination
        const isNearBall =
          Math.hypot(currentPhase.ball.x - draftStart.x, currentPhase.ball.y - draftStart.y) < 0.08;
        if (isNearBall && onBallTargetMoved) {
          onBallTargetMoved(
            Math.max(0.02, Math.min(0.98, draftEnd.x)),
            Math.max(0.02, Math.min(0.98, draftEnd.y))
          );
        } else {
          onAddAnnotation({
            id: `ann_${Date.now()}`,
            tool: 'PASS',
            points: [draftStart, draftEnd],
            color: activeColor,
            strokeWidth: activeStrokeWidth,
            isDashed: true,
          });
        }
      }
      setDraftStart(null);
      setDraftEnd(null);
    } else if (['DRIBBLE', 'ZONE'].includes(activeTool) && draftStart && draftEnd) {
      const dist = Math.hypot(draftEnd.x - draftStart.x, draftEnd.y - draftStart.y);
      if (dist > 0.02) {
        onAddAnnotation({
          id: `ann_${Date.now()}`,
          tool: activeTool as any,
          points: [draftStart, draftEnd],
          color: activeColor,
          strokeWidth: activeStrokeWidth,
          isDashed: isDashed,
        });
      }
      setDraftStart(null);
      setDraftEnd(null);
    } else {
      setDraftPoints([]);
      setDraftStart(null);
      setDraftEnd(null);
    }
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. DRAW PITCH GRASS STRIPES
    const stripes = isHalfPitch ? 8 : 14;
    const stripeH = h / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0B1724' : '#0D1E30';
      ctx.fillRect(0, i * stripeH, w, stripeH);
    }

    // Outer pitch edge stroke
    ctx.strokeStyle = '#1E2D40';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, w, h);

    // 2. DRAW TACTICAL PITCH LINES
    const pad = w * 0.05;
    const pitchW = w - pad * 2;
    const pitchH = h - pad * 2;
    const lineColor = 'rgba(255, 255, 255, 0.45)';

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;

    // Main touchline border
    ctx.strokeRect(pad, pad, pitchW, pitchH);

    if (isHalfPitch) {
      // Half Pitch View (attacking toward top goal)
      const goalW = pitchW * 0.28;
      const goalLeft = pad + (pitchW - goalW) / 2;

      // Top Goal Net
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(goalLeft, pad - 14, goalW, 14);

      // 6-yard box
      const sixW = pitchW * 0.38;
      const sixH = pitchH * 0.15;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(pad + (pitchW - sixW) / 2, pad, sixW, sixH);

      // 18-yard penalty box
      const penW = pitchW * 0.68;
      const penH = pitchH * 0.38;
      ctx.strokeRect(pad + (pitchW - penW) / 2, pad, penW, penH);

      // Penalty spot
      const penSpotY = pad + penH * 0.68;
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(w / 2, penSpotY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Arc (D outside the 18-yard box)
      ctx.beginPath();
      ctx.arc(w / 2, penSpotY, 44, 0.25 * Math.PI, 0.75 * Math.PI, false);
      ctx.stroke();

      // Halfway line at bottom
      ctx.beginPath();
      ctx.moveTo(pad, pad + pitchH);
      ctx.lineTo(pad + pitchW, pad + pitchH);
      ctx.stroke();

      // Center circle arc at bottom
      ctx.beginPath();
      ctx.arc(w / 2, pad + pitchH, 50, Math.PI, 2 * Math.PI, false);
      ctx.stroke();
    } else {
      // Full Pitch View
      // Halfway line
      ctx.beginPath();
      ctx.moveTo(pad, pad + pitchH / 2);
      ctx.lineTo(pad + pitchW, pad + pitchH / 2);
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Top Penalty Box & Goal
      const penW = pitchW * 0.60;
      const penH = pitchH * 0.18;
      ctx.strokeRect(pad + (pitchW - penW) / 2, pad, penW, penH);

      // Top 6-yard box
      const sixW = pitchW * 0.34;
      const sixH = pitchH * 0.07;
      ctx.strokeRect(pad + (pitchW - sixW) / 2, pad, sixW, sixH);

      // Top Goal
      const goalW = pitchW * 0.24;
      ctx.strokeRect(pad + (pitchW - goalW) / 2, pad - 12, goalW, 12);

      // Bottom Penalty Box & Goal
      ctx.strokeRect(pad + (pitchW - penW) / 2, pad + pitchH - penH, penW, penH);
      ctx.strokeRect(pad + (pitchW - sixW) / 2, pad + pitchH - sixH, sixW, sixH);
      ctx.strokeRect(pad + (pitchW - goalW) / 2, pad + pitchH, goalW, 12);
    }

    // 2.5 HEATMAP INTENSITY OVERLAYS (Player Movement History & Spatial Occupation)
    if (showHeatmap && drill.phases && drill.phases.length > 0) {
      ctx.save();
      // Render tactical intensity density blobs for all player phase positions
      drill.phases.forEach((phase, phaseIdx) => {
        const isCurrent = phaseIdx === currentPhase.step - 1;
        const phaseWeight = isCurrent ? 1.0 : 0.65;

        phase.players.forEach((p) => {
          const px = p.x * w;
          const py = p.y * h;
          const tx = (p.targetX || p.x) * w;
          const ty = (p.targetY || p.y) * h;

          // Connect movement vector corridor with semi-transparent heat path
          const dist = Math.hypot(tx - px, ty - py);
          if (dist > 10) {
            ctx.save();
            ctx.strokeStyle = p.role === 'ATTACK' ? 'rgba(255, 109, 0, 0.22)' : 'rgba(255, 23, 68, 0.22)';
            ctx.lineWidth = 28;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.restore();
          }

          // Radial multi-stop gradient for thermal density
          const radius = p.role === 'ATTACK' ? 42 : 36;
          const radial = ctx.createRadialGradient(px, py, 4, px, py, radius);

          if (p.role === 'ATTACK') {
            // High intensity attack heat (Yellow -> Orange -> Deep Red -> Transparent)
            radial.addColorStop(0, `rgba(255, 234, 0, ${0.75 * phaseWeight})`);
            radial.addColorStop(0.35, `rgba(255, 109, 0, ${0.55 * phaseWeight})`);
            radial.addColorStop(0.7, `rgba(255, 23, 68, ${0.25 * phaseWeight})`);
            radial.addColorStop(1, 'rgba(255, 23, 68, 0)');
          } else if (p.role === 'DEFENSE') {
            // High intensity defensive press heat (Amber -> Magenta -> Crimson -> Transparent)
            radial.addColorStop(0, `rgba(255, 215, 64, ${0.75 * phaseWeight})`);
            radial.addColorStop(0.35, `rgba(255, 61, 0, ${0.5 * phaseWeight})`);
            radial.addColorStop(0.7, `rgba(197, 17, 98, ${0.2 * phaseWeight})`);
            radial.addColorStop(1, 'rgba(197, 17, 98, 0)');
          } else {
            // Neutral / Goalkeeper zone
            radial.addColorStop(0, `rgba(0, 229, 255, ${0.7 * phaseWeight})`);
            radial.addColorStop(0.4, `rgba(0, 184, 212, ${0.45 * phaseWeight})`);
            radial.addColorStop(0.8, `rgba(0, 150, 136, ${0.15 * phaseWeight})`);
            radial.addColorStop(1, 'rgba(0, 150, 136, 0)');
          }

          ctx.fillStyle = radial;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();

          // Also plot target position footprint
          if (dist > 15) {
            const targetRadial = ctx.createRadialGradient(tx, ty, 2, tx, ty, radius * 0.75);
            targetRadial.addColorStop(0, 'rgba(255, 234, 0, 0.4)');
            targetRadial.addColorStop(0.5, 'rgba(255, 109, 0, 0.25)');
            targetRadial.addColorStop(1, 'rgba(255, 23, 68, 0)');
            ctx.fillStyle = targetRadial;
            ctx.beginPath();
            ctx.arc(tx, ty, radius * 0.75, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      });
      ctx.restore();
    }

    // 3. DRAW EQUIPMENT (Cones, Mini Goals, Mannequins)
    if (currentPhase.equipment) {
      currentPhase.equipment.forEach((eq) => {
        const eqX = eq.x * w;
        const eqY = eq.y * h;

        if (eq.type === 'CONE') {
          // Orange Cone
          ctx.fillStyle = '#FF5722';
          ctx.beginPath();
          ctx.moveTo(eqX, eqY - 9);
          ctx.lineTo(eqX + 7, eqY + 6);
          ctx.lineTo(eqX - 7, eqY + 6);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (eq.type === 'MINI_GOAL') {
          // Neon Green Mini-Goal
          ctx.strokeStyle = '#00E676';
          ctx.lineWidth = 3;
          ctx.strokeRect(eqX - 14, eqY - 6, 28, 12);
          ctx.fillStyle = 'rgba(0, 230, 118, 0.2)';
          ctx.fillRect(eqX - 14, eqY - 6, 28, 12);
        } else if (eq.type === 'MANNEQUIN') {
          // Training dummy
          ctx.fillStyle = '#FFD54F';
          ctx.beginPath();
          ctx.arc(eqX, eqY - 5, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFD54F';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(eqX, eqY);
          ctx.lineTo(eqX, eqY + 12);
          ctx.moveTo(eqX - 8, eqY + 5);
          ctx.lineTo(eqX + 8, eqY + 5);
          ctx.stroke();
        }
      });
    }

    // Helper to check layer visibility and styling
    const getLayerForRole = (role: string): TacticalLayerConfig | undefined => {
      if (!layers) return undefined;
      if (role === 'ATTACK') return layers.OFFENSE;
      if (role === 'DEFENSE') return layers.DEFENSE;
      return layers.NEUTRAL;
    };

    // 4. DRAW MOVEMENT TRAJECTORIES & DESTINATION HANDLES - Authoritative Edited Model
    currentPhase.players.forEach((p) => {
      const layer = getLayerForRole(p.role);
      // Skip if layer is hidden or trajectories disabled for this layer
      if (layer && (!layer.visible || !layer.showTrajectories)) {
        return;
      }

      const tx = p.targetX ?? p.x;
      const ty = p.targetY ?? p.y;
      const targetScreenX = tx * w;
      const targetScreenY = ty * h;
      const curScreenX = p.x * w;
      const curScreenY = p.y * h;

      const dist = Math.hypot(targetScreenX - curScreenX, targetScreenY - curScreenY);
      const isPlayerSelected = highlightedPlayerNumber === p.number || hoveredPlayerNumber === p.number;

      if (dist > 15) {
        ctx.save();
        const pathColor = layer?.pathColor || (p.role === 'ATTACK' ? '#00E5FF' : '#FF6E40');
        ctx.strokeStyle = pathColor;
        ctx.lineWidth = isPlayerSelected ? 3 : 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(curScreenX, curScreenY);
        ctx.lineTo(targetScreenX, targetScreenY);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(targetScreenY - curScreenY, targetScreenX - curScreenX);
        ctx.setLineDash([]);
        ctx.fillStyle = pathColor;
        ctx.beginPath();
        ctx.moveTo(targetScreenX, targetScreenY);
        ctx.lineTo(targetScreenX - 9 * Math.cos(angle - Math.PI / 6), targetScreenY - 9 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(targetScreenX - 9 * Math.cos(angle + Math.PI / 6), targetScreenY - 9 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // If in MOVE mode or player selected, draw an interactive Destination Target Handle ring
      if (activeTool === 'MOVE' || isPlayerSelected) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(targetScreenX, targetScreenY, dist > 15 ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isPlayerSelected ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = isPlayerSelected ? '#00E5FF' : 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Subtle crosshair center in target handle
        if (dist > 15) {
          ctx.beginPath();
          ctx.arc(targetScreenX, targetScreenY, 2, 0, Math.PI * 2);
          ctx.fillStyle = isPlayerSelected ? '#00E5FF' : '#FFFFFF';
          ctx.fill();
        }
        ctx.restore();
      }
    });

    // 5. DRAW ANIMATED PLAYERS - Respecting Layer Isolation & Authoritative Edited Model
    currentPhase.players.forEach((currPlayer) => {
      const layer = getLayerForRole(currPlayer.role);
      // Skip player if layer is hidden
      if (layer && !layer.visible) {
        return;
      }

      // AUTHORITATIVE PLAYBACK:
      // Player moves from current phase start (x, y) to current phase target (targetX, targetY)
      const targetX = currPlayer.targetX ?? currPlayer.x;
      const targetY = currPlayer.targetY ?? currPlayer.y;

      const interpX = (currPlayer.x + (targetX - currPlayer.x) * animationFraction) * w;
      const interpY = (currPlayer.y + (targetY - currPlayer.y) * animationFraction) * h;

      const nextPlayer = nextPhase?.players?.find((np) => np.id === currPlayer.id) || currPlayer;
      const isHighlighted = highlightedPlayerNumber != null && currPlayer.number === highlightedPlayerNumber;
      const isHovered = hoveredPlayerNumber != null && currPlayer.number === hoveredPlayerNumber;
      const isFocused = isHighlighted || isHovered;
      const hasBall =
        (currPlayer.hasBall && animationFraction < 0.5) ||
        (nextPlayer.hasBall && animationFraction >= 0.5);

      // Pulse glow if has ball, highlighted, or hovered
      if (hasBall || isFocused) {
        ctx.beginPath();
        ctx.arc(interpX, interpY, isFocused ? 22 : 18, 0, Math.PI * 2);
        ctx.fillStyle = hasBall
          ? 'rgba(255, 238, 88, 0.4)'
          : isHovered
          ? 'rgba(0, 229, 255, 0.45)'
          : 'rgba(0, 229, 255, 0.35)';
        ctx.fill();
      }

      // Player circle base - prioritize custom layer color
      let teamColor = layer?.color || '#00E5FF'; // Default Attack Cyan
      if (!layer) {
        if (currPlayer.role === 'DEFENSE') teamColor = '#FF6E40'; // Defense Coral
        else if (currPlayer.role === 'GOALKEEPER') teamColor = '#FFD600'; // GK Gold
        else if (currPlayer.role === 'NEUTRAL') teamColor = '#69F0AE'; // Neutral Mint
      }

      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(interpX, interpY, isFocused ? 14.5 : 13, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.fill();
      ctx.lineWidth = isFocused ? 2.5 : 2;
      ctx.strokeStyle = isFocused ? '#FFFFFF' : '#FFFFFF';
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Jersey number inside
      ctx.fillStyle = '#0B131E';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(currPlayer.number), interpX, interpY);

      // Base Label Tag pill underneath
      if (currPlayer.label) {
        const labelText = currPlayer.label;
        ctx.font = 'bold 9px sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const tagW = textWidth + 8;
        const tagH = 14;

        ctx.fillStyle = 'rgba(11, 19, 30, 0.85)';
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(interpX - tagW / 2, interpY + 16, tagW, tagH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, interpX, interpY + 23);
      }

      // TACTICAL ROLE CALLOUT (Attached above player marker when hovering or selected)
      const tacticalRole = currPlayer.tacticalRole;
      if (tacticalRole && (isFocused || isHighlighted || isHovered)) {
        ctx.save();
        const roleText = tacticalRole.toUpperCase();
        ctx.font = 'bold 9.5px sans-serif';
        const roleWidth = ctx.measureText(roleText).width;
        const pillPaddingX = 8;
        const pillW = roleWidth + pillPaddingX * 2;
        const pillH = 18;
        const pillY = interpY - 32;

        // Subtle connector pointer stem down to player circle
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(interpX, pillY + pillH);
        ctx.lineTo(interpX, interpY - 14.5);
        ctx.stroke();

        // Background tactical badge pill
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#0B1524';
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(interpX - pillW / 2, pillY, pillW, pillH, 5);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Tactical icon indicator dot
        ctx.fillStyle = teamColor;
        ctx.beginPath();
        ctx.arc(interpX - pillW / 2 + 7, pillY + pillH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Text label inside tactical pill
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(roleText, interpX + 3, pillY + pillH / 2);

        // Extended duty tooltip banner on hover / select if tacticalDuty exists
        if (currPlayer.tacticalDuty) {
          const dutyText = currPlayer.tacticalDuty;
          ctx.font = '500 8.5px sans-serif';
          const dutyWidth = ctx.measureText(dutyText).width;
          const dutyW = Math.min(w * 0.45, Math.max(120, dutyWidth + 12));
          const dutyH = 16;
          const dutyY = pillY - 18;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(interpX - dutyW / 2, dutyY, dutyW, dutyH, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#94A3B8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const truncatedDuty = dutyText.length > 35 ? dutyText.slice(0, 34) + '…' : dutyText;
          ctx.fillText(truncatedDuty, interpX, dutyY + dutyH / 2);
        }

        ctx.restore();
      }
    });

    // 6. DRAW ANIMATED BALL (Respect BALL_CORRIDORS layer if present) - Authoritative Edited Model
    const ballLayer = layers?.BALL_CORRIDORS;
    if (!ballLayer || ballLayer.visible) {
      const ballStart = currentPhase.ball;
      const targetBallX = ballStart.targetX ?? ballStart.x;
      const targetBallY = ballStart.targetY ?? ballStart.y;

      // If ball trajectory vector is requested, draw passing trajectory path
      if (ballLayer?.showTrajectories) {
        const bsX = ballStart.x * w;
        const bsY = ballStart.y * h;
        const btX = targetBallX * w;
        const btY = targetBallY * h;
        const bDist = Math.hypot(btX - bsX, btY - bsY);
        if (bDist > 15) {
          ctx.save();
          ctx.strokeStyle = ballLayer.pathColor || '#FFD600';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(bsX, bsY);
          ctx.lineTo(btX, btY);
          ctx.stroke();
          ctx.restore();
        }
      }

      const ballX = (ballStart.x + (targetBallX - ballStart.x) * animationFraction) * w;
      const ballBaseY = (ballStart.y + (targetBallY - ballStart.y) * animationFraction) * h;

      // Aerial arc if AERIAL_PASS
      const arcOffset =
        ballStart.trajectory === 'AERIAL_PASS'
          ? -Math.sin(animationFraction * Math.PI) * (h * 0.08)
          : 0;

      const finalBallY = ballBaseY + arcOffset;

      // Ball motion blur / trail if SHOT
      if (ballStart.trajectory === 'SHOT') {
        ctx.beginPath();
        ctx.arc(ballX - 4, finalBallY, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fill();
      }

      // Shadow on ground during aerial arc
      if (arcOffset < -4) {
        ctx.beginPath();
        ctx.ellipse(ballX, ballBaseY, 6, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();
      }

      // Soccer ball graphic
      ctx.beginPath();
      ctx.arc(ballX, finalBallY, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#1E293B';
      ctx.stroke();

      // Subtle pentagon center dot
      ctx.beginPath();
      ctx.arc(ballX, finalBallY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1E293B';
      ctx.fill();

      // Ball Destination Target Handle (Interactive in Move mode)
      if (
        isEditable &&
        ballStart.targetX != null &&
        ballStart.targetY != null &&
        Math.hypot(targetBallX - ballStart.x, targetBallY - ballStart.y) > 0.03
      ) {
        const btHandleX = targetBallX * w;
        const btHandleY = targetBallY * h;

        ctx.save();
        ctx.beginPath();
        ctx.arc(btHandleX, btHandleY, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD600';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(btHandleX, btHandleY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD600';
        ctx.fill();
        ctx.restore();
      }
    }

    // 7. DRAW COMPLETED ANNOTATIONS (Telestrator)
    annotations.forEach((ann) => {
      if (ann.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (ann.isDashed) ctx.setLineDash([6, 6]);

      if (ann.tool === 'PEN') {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x * w, ann.points[0].y * h);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x * w, ann.points[i].y * h);
        }
        ctx.stroke();
      } else if (['ARROW', 'PASS', 'DRIBBLE'].includes(ann.tool)) {
        const p1 = ann.points[0];
        const p2 = ann.points[ann.points.length - 1];
        const sx = p1.x * w;
        const sy = p1.y * h;
        const ex = p2.x * w;
        const ey = p2.y * h;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(ey - sy, ex - sx);
        ctx.setLineDash([]);
        ctx.fillStyle = ann.color;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 12 * Math.cos(angle - Math.PI / 6), ey - 12 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - 12 * Math.cos(angle + Math.PI / 6), ey - 12 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (ann.tool === 'ZONE') {
        const p1 = ann.points[0];
        const p2 = ann.points[1];
        const cx = ((p1.x + p2.x) / 2) * w;
        const cy = ((p1.y + p2.y) / 2) * h;
        const rx = (Math.abs(p2.x - p1.x) / 2) * w;
        const ry = (Math.abs(p2.y - p1.y) / 2) * h;

        ctx.fillStyle = ann.color.replace('rgb', 'rgba').replace(')', ', 0.22)');
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(12, rx), Math.max(12, ry), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });

    // 8. DRAW IN-PROGRESS DRAFT ANNOTATION
    if (activeTool === 'PEN' && draftPoints.length >= 2) {
      ctx.save();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeStrokeWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(draftPoints[0].x * w, draftPoints[0].y * h);
      for (let i = 1; i < draftPoints.length; i++) {
        ctx.lineTo(draftPoints[i].x * w, draftPoints[i].y * h);
      }
      ctx.stroke();
      ctx.restore();
    } else if (['ARROW', 'PASS', 'DRIBBLE', 'ZONE'].includes(activeTool) && draftStart && draftEnd) {
      ctx.save();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeStrokeWidth;
      if (activeTool === 'PASS' || isDashed) ctx.setLineDash([6, 6]);

      const sx = draftStart.x * w;
      const sy = draftStart.y * h;
      const ex = draftEnd.x * w;
      const ey = draftEnd.y * h;

      if (activeTool === 'ZONE') {
        const cx = (sx + ex) / 2;
        const cy = (sy + ey) / 2;
        const rx = Math.abs(ex - sx) / 2;
        const ry = Math.abs(ey - sy) / 2;
        ctx.fillStyle = 'rgba(255, 238, 88, 0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(10, rx), Math.max(10, ry), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 9. DRAW PINNED QUICK TACTICAL NOTES
    quickNotes.forEach((note) => {
      const nx = note.x * w;
      const ny = note.y * h;

      // Note Pin Icon & Bubble
      ctx.fillStyle = '#FFE082';
      ctx.beginPath();
      ctx.roundRect(nx - 40, ny - 24, 80, 20, 6);
      ctx.fill();
      ctx.strokeStyle = '#FFB300';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pin stem
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(nx, ny - 24, 4, 0, Math.PI * 2);
      ctx.fill();

      // Text inside note
      ctx.fillStyle = '#263238';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const shortText = note.text.length > 12 ? note.text.slice(0, 11) + '..' : note.text;
      ctx.fillText(shortText, nx, ny - 14);
    });

    // 10. DRAW LASER POINTER TRAIL
    if (laserPoints.length > 0) {
      const now = Date.now();
      laserPoints.forEach((lp) => {
        const age = now - lp.timestamp;
        if (age < 1200) {
          const alpha = 1 - age / 1200;
          ctx.beginPath();
          ctx.arc(lp.x * w, lp.y * h, 6 * alpha, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 23, 68, ${alpha})`;
          ctx.shadowColor = '#FF1744';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
      });
    }

    ctx.restore();
  }, [
    currentPhase,
    nextPhase,
    animationFraction,
    highlightedPlayerNumber,
    isHalfPitch,
    annotations,
    laserPoints,
    quickNotes,
    draftPoints,
    draftStart,
    draftEnd,
    activeTool,
    activeColor,
    activeStrokeWidth,
    isDashed,
    showHeatmap,
    drill.phases,
    layers,
    hoveredPlayerNumber,
  ]);

  return (
    <div
      ref={containerRef}
      id="tactical-pitch-container"
      className={`relative w-full rounded-2xl overflow-hidden bg-[#0A131F] border border-[#1B2B3E] shadow-2xl flex items-center justify-center select-none ${
        isFullscreen ? 'h-full' : isHalfPitch ? 'aspect-[4/3] max-h-[620px]' : 'aspect-[3/4] max-h-[720px]'
      }`}
    >
      <canvas
        ref={canvasRef}
        id="tactical-pitch-canvas"
        className="w-full h-full cursor-crosshair touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerLeave}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
};
