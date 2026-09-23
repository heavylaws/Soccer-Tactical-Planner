// CoachTactics Tactical Knowledge Synthesizer (heavylaws/CoachPlanner)
import { SoccerDrill } from './tacticalDomain.ts';

/**
 * Deterministic offline tactical drill synthesis engine.
 * Generates valid multi-phase drills adhering strictly to CoachTactics domain model.
 */
export function synthesizeTacticalDrill(
  prompt: string,
  formation = '4-3-3',
  focusArea = 'Positional Play',
  pitchViewChoice = 'HALF'
): SoccerDrill {
  const pLower = prompt.toLowerCase();
  const isPress = pLower.includes('press') || pLower.includes('trap') || pLower.includes('gegen') || focusArea === 'High Press';
  const isTransition = pLower.includes('counter') || pLower.includes('transition') || pLower.includes('break') || focusArea === 'Attacking Transition';
  const isOverlap = pLower.includes('overlap') || pLower.includes('wing') || pLower.includes('cutback') || pLower.includes('cross');
  const isCorner = pLower.includes('corner') || pLower.includes('set piece');

  let title = prompt.length > 3 && prompt.length < 50 ? prompt.charAt(0).toUpperCase() + prompt.slice(1) : 'Dynamic Attacking Combination';
  let category = focusArea || 'Tactical Mastery';
  let pitchView: 'FULL' | 'HALF' = (pitchViewChoice === 'FULL' || isPress || isTransition) ? 'FULL' : 'HALF';

  if (isPress) {
    title = 'Gegenpressing Midfield Trap & Vertical Break';
    category = 'Defensive Transitions';
    return {
      id: `drill_${Date.now()}`,
      title,
      category,
      focusArea: 'Trap Triggers & Simultaneous Convergence',
      durationMinutes: 20,
      pitchView: 'FULL',
      description: `Coordinated pressing drill generated for coach instructions: "${prompt}". Traps holding midfielder and triggers instant vertical transition.`,
      coachingCues: [
        'Trigger press when opponent receiver turns back towards goal',
        'Simultaneous 3-player angle convergence to cut passing lanes',
        'First touch upon winning possession must be forward into open channel',
        'Striker makes immediate blind-side diagonal run',
      ],
      phases: [
        {
          step: 1,
          title: 'Phase 1: Baiting & Setting the Trap',
          instruction: 'Allow opponent #6 to receive in deep midfield; pressing triangle coordinates posture.',
          durationSec: 2.8,
          players: [
            { id: 'opp6', number: 6, role: 'DEFENSE', x: 0.50, y: 0.55, targetX: 0.50, targetY: 0.52, label: 'Opp #6', hasBall: true },
            { id: 'opp4', number: 4, role: 'DEFENSE', x: 0.35, y: 0.70, targetX: 0.36, targetY: 0.68, label: 'Opp CB #4' },
            { id: 'opp5', number: 5, role: 'DEFENSE', x: 0.65, y: 0.70, targetX: 0.64, targetY: 0.68, label: 'Opp CB #5' },
            { id: 'press8', number: 8, role: 'ATTACK', x: 0.52, y: 0.42, targetX: 0.50, targetY: 0.48, label: 'Press #8' },
            { id: 'press10', number: 10, role: 'ATTACK', x: 0.38, y: 0.45, targetX: 0.42, targetY: 0.50, label: 'Press #10' },
            { id: 'press9', number: 9, role: 'ATTACK', x: 0.62, y: 0.45, targetX: 0.58, targetY: 0.48, label: 'Press #9' },
            { id: 'oppGk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.90, targetX: 0.50, targetY: 0.88, label: 'Opp GK' },
          ],
          ball: { x: 0.50, y: 0.55, targetX: 0.50, targetY: 0.52, trajectory: 'DRIBBLE' },
          equipment: [
            { id: 'cone1', type: 'CONE', x: 0.35, y: 0.45 },
            { id: 'cone2', type: 'CONE', x: 0.65, y: 0.45 },
          ],
        },
        {
          step: 2,
          title: 'Phase 2: Snapping the Trap',
          instruction: 'Opp #6 turns into trouble; #8 and #10 converge simultaneously to dispossess.',
          durationSec: 2.5,
          players: [
            { id: 'opp6', number: 6, role: 'DEFENSE', x: 0.50, y: 0.52, targetX: 0.50, targetY: 0.52, label: 'Opp #6' },
            { id: 'opp4', number: 4, role: 'DEFENSE', x: 0.36, y: 0.68, targetX: 0.35, targetY: 0.65, label: 'Opp CB #4' },
            { id: 'opp5', number: 5, role: 'DEFENSE', x: 0.64, y: 0.68, targetX: 0.65, targetY: 0.65, label: 'Opp CB #5' },
            { id: 'press8', number: 8, role: 'ATTACK', x: 0.50, y: 0.48, targetX: 0.51, targetY: 0.52, label: 'Press #8', hasBall: true },
            { id: 'press10', number: 10, role: 'ATTACK', x: 0.42, y: 0.50, targetX: 0.47, targetY: 0.52, label: 'Press #10' },
            { id: 'press9', number: 9, role: 'ATTACK', x: 0.58, y: 0.48, targetX: 0.62, targetY: 0.35, label: 'Press #9' },
            { id: 'oppGk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.88, targetX: 0.50, targetY: 0.88, label: 'Opp GK' },
          ],
          ball: { x: 0.50, y: 0.52, targetX: 0.51, targetY: 0.52, trajectory: 'GROUND_PASS' },
          equipment: [
            { id: 'cone1', type: 'CONE', x: 0.35, y: 0.45 },
            { id: 'cone2', type: 'CONE', x: 0.65, y: 0.45 },
          ],
        },
        {
          step: 3,
          title: 'Phase 3: Immediate Vertical Counter',
          instruction: '#8 wins possession and punches instant through-ball to sprinting #9 behind defense!',
          durationSec: 2.8,
          players: [
            { id: 'opp6', number: 6, role: 'DEFENSE', x: 0.50, y: 0.52, targetX: 0.48, targetY: 0.54, label: 'Opp #6' },
            { id: 'opp4', number: 4, role: 'DEFENSE', x: 0.35, y: 0.65, targetX: 0.42, targetY: 0.50, label: 'Opp CB #4' },
            { id: 'opp5', number: 5, role: 'DEFENSE', x: 0.65, y: 0.65, targetX: 0.58, targetY: 0.50, label: 'Opp CB #5' },
            { id: 'press8', number: 8, role: 'ATTACK', x: 0.51, y: 0.52, targetX: 0.51, targetY: 0.45, label: 'Press #8' },
            { id: 'press10', number: 10, role: 'ATTACK', x: 0.47, y: 0.52, targetX: 0.45, targetY: 0.38, label: 'Press #10' },
            { id: 'press9', number: 9, role: 'ATTACK', x: 0.62, y: 0.35, targetX: 0.55, targetY: 0.18, label: 'Press #9', hasBall: true },
            { id: 'oppGk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.88, targetX: 0.50, targetY: 0.85, label: 'Opp GK' },
          ],
          ball: { x: 0.51, y: 0.52, targetX: 0.55, targetY: 0.18, trajectory: 'GROUND_PASS' },
          equipment: [
            { id: 'cone1', type: 'CONE', x: 0.35, y: 0.45 },
            { id: 'cone2', type: 'CONE', x: 0.65, y: 0.45 },
          ],
        },
      ],
    };
  }

  // Pep Guardiola Box Midfield Overload
  if (pLower.includes('box') || pLower.includes('guardiola') || pLower.includes('possession') || pLower.includes('tiki') || pLower.includes('3-2-5')) {
    return {
      id: `drill_${Date.now()}`,
      title: 'Pep Guardiola 3-2-5 Box Midfield Overload',
      category: 'Positional Play',
      focusArea: 'Half-Space Penetration & 1v1 Winger Isolation',
      durationMinutes: 22,
      pitchView: 'HALF',
      description: `Structured positional play drill creating a 4-man central box (double pivot + dual attacking 8s) to fix defenders and release the isolated winger.`,
      coachingCues: [
        'Playmaker waits until defensive mid commits before releasing pass',
        'Attacking #10 positions strictly between lines in half-space',
        'Winger maintains maximum width with toe on the touchline',
        'Attacking fullback provides secure rest-defense coverage',
      ],
      phases: [
        {
          step: 1,
          title: 'Phase 1: Establishing the Central Box',
          instruction: 'Double pivot circulates ball cleanly, inviting pressure from opponent midfield line.',
          durationSec: 2.8,
          players: [
            { id: 'dm6', number: 6, role: 'ATTACK', x: 0.42, y: 0.75, targetX: 0.44, targetY: 0.70, label: 'Pivot #6', hasBall: true },
            { id: 'dm8', number: 8, role: 'ATTACK', x: 0.58, y: 0.75, targetX: 0.56, targetY: 0.70, label: 'Pivot #8' },
            { id: 'am10', number: 10, role: 'ATTACK', x: 0.35, y: 0.45, targetX: 0.38, targetY: 0.40, label: 'Pocket #10' },
            { id: 'am7', number: 17, role: 'ATTACK', x: 0.65, y: 0.45, targetX: 0.62, targetY: 0.40, label: 'Pocket #17' },
            { id: 'w11', number: 11, role: 'ATTACK', x: 0.12, y: 0.40, targetX: 0.12, targetY: 0.32, label: 'LW #11' },
            { id: 'st9', number: 9, role: 'ATTACK', x: 0.50, y: 0.30, targetX: 0.52, targetY: 0.25, label: 'ST #9' },
            { id: 'def4', number: 4, role: 'DEFENSE', x: 0.42, y: 0.52, targetX: 0.43, targetY: 0.58, label: 'Def CM' },
            { id: 'def8', number: 8, role: 'DEFENSE', x: 0.58, y: 0.52, targetX: 0.57, targetY: 0.56, label: 'Def CM' },
          ],
          ball: { x: 0.42, y: 0.75, targetX: 0.44, targetY: 0.70, trajectory: 'DRIBBLE' },
          equipment: [
            { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
            { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
          ],
        },
        {
          step: 2,
          title: 'Phase 2: Breaking Lines into Pocket #10',
          instruction: "Pivot #6 threads sharp vertical ball through the defensive line into pocket #10's front foot.",
          durationSec: 2.6,
          players: [
            { id: 'dm6', number: 6, role: 'ATTACK', x: 0.44, y: 0.70, targetX: 0.45, targetY: 0.65, label: 'Pivot #6' },
            { id: 'dm8', number: 8, role: 'ATTACK', x: 0.56, y: 0.70, targetX: 0.55, targetY: 0.65, label: 'Pivot #8' },
            { id: 'am10', number: 10, role: 'ATTACK', x: 0.38, y: 0.40, targetX: 0.36, targetY: 0.35, label: 'Pocket #10', hasBall: true },
            { id: 'am7', number: 17, role: 'ATTACK', x: 0.62, y: 0.40, targetX: 0.65, targetY: 0.30, label: 'Pocket #17' },
            { id: 'w11', number: 11, role: 'ATTACK', x: 0.12, y: 0.32, targetX: 0.14, targetY: 0.22, label: 'LW #11' },
            { id: 'st9', number: 9, role: 'ATTACK', x: 0.52, y: 0.25, targetX: 0.50, targetY: 0.20, label: 'ST #9' },
            { id: 'def4', number: 4, role: 'DEFENSE', x: 0.43, y: 0.58, targetX: 0.40, targetY: 0.48, label: 'Def CM' },
            { id: 'def8', number: 8, role: 'DEFENSE', x: 0.57, y: 0.56, targetX: 0.50, targetY: 0.45, label: 'Def CM' },
          ],
          ball: { x: 0.44, y: 0.70, targetX: 0.36, targetY: 0.35, trajectory: 'GROUND_PASS' },
          equipment: [
            { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
            { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
          ],
        },
        {
          step: 3,
          title: 'Phase 3: Half-Turn & Isolation Release to LW',
          instruction: 'Pocket #10 executes half-turn and slides diagonal pass to isolate LW #11 for 1v1 dribble.',
          durationSec: 2.7,
          players: [
            { id: 'dm6', number: 6, role: 'ATTACK', x: 0.45, y: 0.65, targetX: 0.48, targetY: 0.60, label: 'Pivot #6' },
            { id: 'dm8', number: 8, role: 'ATTACK', x: 0.55, y: 0.65, targetX: 0.54, targetY: 0.58, label: 'Pivot #8' },
            { id: 'am10', number: 10, role: 'ATTACK', x: 0.36, y: 0.35, targetX: 0.38, targetY: 0.25, label: 'Pocket #10' },
            { id: 'am7', number: 17, role: 'ATTACK', x: 0.65, y: 0.30, targetX: 0.60, targetY: 0.18, label: 'Pocket #17' },
            { id: 'w11', number: 11, role: 'ATTACK', x: 0.14, y: 0.22, targetX: 0.18, targetY: 0.15, label: 'LW #11', hasBall: true },
            { id: 'st9', number: 9, role: 'ATTACK', x: 0.50, y: 0.20, targetX: 0.48, targetY: 0.12, label: 'ST #9' },
            { id: 'def4', number: 4, role: 'DEFENSE', x: 0.40, y: 0.48, targetX: 0.35, targetY: 0.30, label: 'Def CM' },
            { id: 'def8', number: 8, role: 'DEFENSE', x: 0.50, y: 0.45, targetX: 0.45, targetY: 0.25, label: 'Def CM' },
          ],
          ball: { x: 0.36, y: 0.35, targetX: 0.18, targetY: 0.15, trajectory: 'GROUND_PASS' },
          equipment: [
            { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
            { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
          ],
        },
      ],
    };
  }

  // Set-Piece / Corner routine
  if (isCorner) {
    return {
      id: `drill_${Date.now()}`,
      title: 'Near-Post Decoy Corner Routine & Edge Strike',
      category: 'Set Piece Routines',
      focusArea: 'Decoy Runs & Late Box Edge Arrival',
      durationMinutes: 15,
      pitchView: 'HALF',
      description: `Corner routine where two near-post decoys pull defensive marking away, clearing a shooting alley for the arriving midfielder on the edge of the 18-yard box.`,
      coachingCues: [
        'Near post runner must sprint with 100% conviction to drag markers',
        'Edge of box midfielder timing must match delivery trajectory',
        'Keep strike low, driving through the crowded penalty box',
      ],
      phases: [
        {
          step: 1,
          title: 'Phase 1: Starting Setup & Decoy Motion',
          instruction: 'Corner taker raises arm; near post runners initiate decoy dash towards near post flag.',
          durationSec: 2.5,
          players: [
            { id: 'taker', number: 11, role: 'ATTACK', x: 0.98, y: 0.05, targetX: 0.98, targetY: 0.05, label: 'Taker #11', hasBall: true },
            { id: 'decoy1', number: 9, role: 'ATTACK', x: 0.55, y: 0.18, targetX: 0.75, targetY: 0.10, label: 'Decoy #9' },
            { id: 'decoy2', number: 5, role: 'ATTACK', x: 0.45, y: 0.20, targetX: 0.65, targetY: 0.12, label: 'Decoy #5' },
            { id: 'shooter', number: 8, role: 'ATTACK', x: 0.50, y: 0.40, targetX: 0.50, targetY: 0.28, label: 'Shooter #8' },
            { id: 'gk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.08, targetX: 0.55, targetY: 0.08, label: 'GK' },
            { id: 'def1', number: 3, role: 'DEFENSE', x: 0.58, y: 0.16, targetX: 0.72, targetY: 0.11, label: 'Marker' },
            { id: 'def2', number: 4, role: 'DEFENSE', x: 0.48, y: 0.18, targetX: 0.62, targetY: 0.13, label: 'Marker' },
          ],
          ball: { x: 0.98, y: 0.05, targetX: 0.98, targetY: 0.05, trajectory: 'DRIBBLE' },
        },
        {
          step: 2,
          title: 'Phase 2: Driven Cutback Delivery to Edge of Box',
          instruction: 'Taker cuts back pass along the turf, bypassing the near-post cluster to open Shooter #8.',
          durationSec: 2.4,
          players: [
            { id: 'taker', number: 11, role: 'ATTACK', x: 0.98, y: 0.05, targetX: 0.92, targetY: 0.08, label: 'Taker #11' },
            { id: 'decoy1', number: 9, role: 'ATTACK', x: 0.75, y: 0.10, targetX: 0.78, targetY: 0.08, label: 'Decoy #9' },
            { id: 'decoy2', number: 5, role: 'ATTACK', x: 0.65, y: 0.12, targetX: 0.68, targetY: 0.10, label: 'Decoy #5' },
            { id: 'shooter', number: 8, role: 'ATTACK', x: 0.50, y: 0.28, targetX: 0.50, targetY: 0.24, label: 'Shooter #8', hasBall: true },
            { id: 'gk', number: 1, role: 'GOALKEEPER', x: 0.55, y: 0.08, targetX: 0.52, targetY: 0.08, label: 'GK' },
            { id: 'def1', number: 3, role: 'DEFENSE', x: 0.72, y: 0.11, targetX: 0.74, targetY: 0.10, label: 'Marker' },
            { id: 'def2', number: 4, role: 'DEFENSE', x: 0.62, y: 0.13, targetX: 0.64, targetY: 0.12, label: 'Marker' },
          ],
          ball: { x: 0.98, y: 0.05, targetX: 0.50, targetY: 0.24, trajectory: 'GROUND_PASS' },
        },
        {
          step: 3,
          title: 'Phase 3: First-Time Driven Finish',
          instruction: 'Shooter #8 drives a powerful low finish into the bottom left corner.',
          durationSec: 2.2,
          players: [
            { id: 'taker', number: 11, role: 'ATTACK', x: 0.92, y: 0.08, targetX: 0.90, targetY: 0.12, label: 'Taker #11' },
            { id: 'decoy1', number: 9, role: 'ATTACK', x: 0.78, y: 0.08, targetX: 0.75, targetY: 0.08, label: 'Decoy #9' },
            { id: 'decoy2', number: 5, role: 'ATTACK', x: 0.68, y: 0.10, targetX: 0.65, targetY: 0.10, label: 'Decoy #5' },
            { id: 'shooter', number: 8, role: 'ATTACK', x: 0.50, y: 0.24, targetX: 0.50, targetY: 0.22, label: 'Shooter #8' },
            { id: 'gk', number: 1, role: 'GOALKEEPER', x: 0.52, y: 0.08, targetX: 0.42, targetY: 0.06, label: 'GK' },
            { id: 'def1', number: 3, role: 'DEFENSE', x: 0.74, y: 0.10, targetX: 0.70, targetY: 0.10, label: 'Marker' },
            { id: 'def2', number: 4, role: 'DEFENSE', x: 0.64, y: 0.12, targetX: 0.60, targetY: 0.12, label: 'Marker' },
          ],
          ball: { x: 0.50, y: 0.24, targetX: 0.44, targetY: 0.04, trajectory: 'SHOT' },
        },
      ],
    };
  }

  // Default attacking combination drill
  return {
    id: `drill_${Date.now()}`,
    title: title || 'Overlapping Wing Delivery & Box Attack',
    category: isTransition ? 'Attacking Transitions' : 'Attacking Patterns',
    focusArea: isOverlap ? 'Wide Overload & Timing of Runs' : 'Spatial Awareness & Coordinated Movement',
    durationMinutes: 18,
    pitchView: pitchView as 'FULL' | 'HALF',
    description: `Tactical training animation generated for coach prompt: "${prompt}". Focuses on creating numerical superiority and clinical finishing.`,
    coachingCues: [
      'Firm, crisp pass into the front foot with optimum weight',
      'Fullback triggers sprint before ball reaches winger',
      'Head up to survey blind-side runners in the box',
      'One-touch clinical finish across the face of goal',
    ],
    phases: [
      {
        step: 1,
        title: 'Phase 1: Build-Up & Trigger',
        instruction: 'Central Midfielder collects from deep and scans the wide overload.',
        durationSec: 2.6,
        players: [
          { id: 'cm8', number: 8, role: 'ATTACK', x: 0.50, y: 0.78, targetX: 0.50, targetY: 0.72, label: 'CM #8', hasBall: true },
          { id: 'w7', number: 7, role: 'ATTACK', x: 0.78, y: 0.60, targetX: 0.75, targetY: 0.52, label: 'RW #7' },
          { id: 'rb2', number: 2, role: 'ATTACK', x: 0.85, y: 0.80, targetX: 0.88, targetY: 0.62, label: 'RB #2' },
          { id: 'st9', number: 9, role: 'ATTACK', x: 0.48, y: 0.40, targetX: 0.52, targetY: 0.35, label: 'ST #9' },
          { id: 'am10', number: 10, role: 'ATTACK', x: 0.35, y: 0.52, targetX: 0.38, targetY: 0.44, label: 'AM #10' },
          { id: 'cb4', number: 4, role: 'DEFENSE', x: 0.46, y: 0.32, targetX: 0.48, targetY: 0.30, label: 'CB #4' },
          { id: 'lb5', number: 5, role: 'DEFENSE', x: 0.66, y: 0.35, targetX: 0.68, targetY: 0.32, label: 'LB #5' },
          { id: 'gk1', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.12, targetX: 0.50, targetY: 0.14, label: 'GK #1' },
        ],
        ball: { x: 0.50, y: 0.78, targetX: 0.50, targetY: 0.72, trajectory: 'DRIBBLE' },
        equipment: [
          { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
          { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
        ],
      },
      {
        step: 2,
        title: 'Phase 2: Overlapping Release',
        instruction: 'CM slips ball to RW, while RB accelerates on outside overlap into attacking third.',
        durationSec: 2.8,
        players: [
          { id: 'cm8', number: 8, role: 'ATTACK', x: 0.50, y: 0.72, targetX: 0.55, targetY: 0.60, label: 'CM #8' },
          { id: 'w7', number: 7, role: 'ATTACK', x: 0.75, y: 0.52, targetX: 0.78, targetY: 0.46, label: 'RW #7', hasBall: true },
          { id: 'rb2', number: 2, role: 'ATTACK', x: 0.88, y: 0.62, targetX: 0.90, targetY: 0.36, label: 'RB #2' },
          { id: 'st9', number: 9, role: 'ATTACK', x: 0.52, y: 0.35, targetX: 0.50, targetY: 0.28, label: 'ST #9' },
          { id: 'am10', number: 10, role: 'ATTACK', x: 0.38, y: 0.44, targetX: 0.40, targetY: 0.34, label: 'AM #10' },
          { id: 'cb4', number: 4, role: 'DEFENSE', x: 0.48, y: 0.30, targetX: 0.50, targetY: 0.26, label: 'CB #4' },
          { id: 'lb5', number: 5, role: 'DEFENSE', x: 0.68, y: 0.32, targetX: 0.78, targetY: 0.44, label: 'LB #5' },
          { id: 'gk1', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.14, targetX: 0.50, targetY: 0.15, label: 'GK #1' },
        ],
        ball: { x: 0.50, y: 0.72, targetX: 0.78, targetY: 0.46, trajectory: 'GROUND_PASS' },
        equipment: [
          { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
          { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
        ],
      },
      {
        step: 3,
        title: 'Phase 3: Byline Delivery & Darting Run',
        instruction: 'Winger threads pass to overlapping RB who cuts back low cross across 6-yard box!',
        durationSec: 2.8,
        players: [
          { id: 'cm8', number: 8, role: 'ATTACK', x: 0.55, y: 0.60, targetX: 0.58, targetY: 0.45, label: 'CM #8' },
          { id: 'w7', number: 7, role: 'ATTACK', x: 0.78, y: 0.46, targetX: 0.72, targetY: 0.38, label: 'RW #7' },
          { id: 'rb2', number: 2, role: 'ATTACK', x: 0.90, y: 0.36, targetX: 0.88, targetY: 0.20, label: 'RB #2', hasBall: true },
          { id: 'st9', number: 9, role: 'ATTACK', x: 0.50, y: 0.28, targetX: 0.45, targetY: 0.18, label: 'ST #9' },
          { id: 'am10', number: 10, role: 'ATTACK', x: 0.40, y: 0.34, targetX: 0.35, targetY: 0.24, label: 'AM #10' },
          { id: 'cb4', number: 4, role: 'DEFENSE', x: 0.50, y: 0.26, targetX: 0.48, targetY: 0.20, label: 'CB #4' },
          { id: 'lb5', number: 5, role: 'DEFENSE', x: 0.78, y: 0.44, targetX: 0.82, targetY: 0.28, label: 'LB #5' },
          { id: 'gk1', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.15, targetX: 0.55, targetY: 0.14, label: 'GK #1' },
        ],
        ball: { x: 0.78, y: 0.46, targetX: 0.88, targetY: 0.20, trajectory: 'GROUND_PASS' },
        equipment: [
          { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
          { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
        ],
      },
      {
        step: 4,
        title: 'Phase 4: Clinical Finish',
        instruction: 'Striker #9 cuts across CB to finish first-time into the corner of the net!',
        durationSec: 2.5,
        players: [
          { id: 'cm8', number: 8, role: 'ATTACK', x: 0.58, y: 0.45, targetX: 0.58, targetY: 0.35, label: 'CM #8' },
          { id: 'w7', number: 7, role: 'ATTACK', x: 0.72, y: 0.38, targetX: 0.70, targetY: 0.28, label: 'RW #7' },
          { id: 'rb2', number: 2, role: 'ATTACK', x: 0.88, y: 0.20, targetX: 0.85, targetY: 0.18, label: 'RB #2' },
          { id: 'st9', number: 9, role: 'ATTACK', x: 0.45, y: 0.18, targetX: 0.50, targetY: 0.10, label: 'ST #9', hasBall: true },
          { id: 'am10', number: 10, role: 'ATTACK', x: 0.35, y: 0.24, targetX: 0.30, targetY: 0.16, label: 'AM #10' },
          { id: 'cb4', number: 4, role: 'DEFENSE', x: 0.48, y: 0.20, targetX: 0.49, targetY: 0.14, label: 'CB #4' },
          { id: 'lb5', number: 5, role: 'DEFENSE', x: 0.82, y: 0.28, targetX: 0.76, targetY: 0.20, label: 'LB #5' },
          { id: 'gk1', number: 1, role: 'GOALKEEPER', x: 0.55, y: 0.14, targetX: 0.50, targetY: 0.08, label: 'GK #1' },
        ],
        ball: { x: 0.88, y: 0.20, targetX: 0.50, targetY: 0.08, trajectory: 'SHOT' },
        equipment: [
          { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
          { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
        ],
      },
    ],
  };
}
