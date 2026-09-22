import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// UEFA Tactical Knowledge Synthesizer matching CoachTactics (heavylaws/CoachPlanner)
function synthesizeTacticalDrill(prompt: string, formation = "4-3-3", focusArea = "Positional Play", pitchViewChoice = "HALF") {
  const pLower = prompt.toLowerCase();
  const isPress = pLower.includes("press") || pLower.includes("trap") || pLower.includes("gegen") || focusArea === "High Press";
  const isTransition = pLower.includes("counter") || pLower.includes("transition") || pLower.includes("break") || focusArea === "Attacking Transition";
  const isOverlap = pLower.includes("overlap") || pLower.includes("wing") || pLower.includes("cutback") || pLower.includes("cross");
  const isCorner = pLower.includes("corner") || pLower.includes("set piece");

  let title = prompt.length > 3 && prompt.length < 50 ? prompt.charAt(0).toUpperCase() + prompt.slice(1) : "Dynamic Attacking Combination";
  let category = focusArea || "Tactical Mastery";
  let pitchView = (pitchViewChoice === "FULL" || isPress || isTransition) ? "FULL" : "HALF";

  if (isPress) {
    title = "Gegenpressing Midfield Trap & Vertical Break";
    category = "Defensive Transitions";
    return {
      id: `drill_${Date.now()}`,
      title,
      category,
      focusArea: "Trap Triggers & Simultaneous Convergence",
      durationMinutes: 20,
      pitchView: "FULL",
      description: `Coordinated pressing drill generated for coach instructions: "${prompt}". Traps holding midfielder and triggers instant vertical transition.`,
      coachingCues: [
        "Trigger press when opponent receiver turns back towards goal",
        "Simultaneous 3-player angle convergence to cut passing lanes",
        "First touch upon winning possession must be forward into open channel",
        "Striker makes immediate blind-side diagonal run",
      ],
      phases: [
        {
          step: 1,
          title: "Phase 1: Baiting & Setting the Trap",
          instruction: "Allow opponent #6 to receive in deep midfield; pressing triangle coordinates posture.",
          durationSec: 2.8,
          players: [
            { id: "opp6", number: 6, role: "DEFENSE", x: 0.50, y: 0.55, targetX: 0.50, targetY: 0.52, label: "Opp #6", hasBall: true },
            { id: "opp4", number: 4, role: "DEFENSE", x: 0.35, y: 0.70, targetX: 0.36, targetY: 0.68, label: "Opp CB #4" },
            { id: "opp5", number: 5, role: "DEFENSE", x: 0.65, y: 0.70, targetX: 0.64, targetY: 0.68, label: "Opp CB #5" },
            { id: "press8", number: 8, role: "ATTACK", x: 0.52, y: 0.42, targetX: 0.50, targetY: 0.48, label: "Press #8" },
            { id: "press10", number: 10, role: "ATTACK", x: 0.38, y: 0.45, targetX: 0.42, targetY: 0.50, label: "Press #10" },
            { id: "press9", number: 9, role: "ATTACK", x: 0.62, y: 0.45, targetX: 0.58, targetY: 0.48, label: "Press #9" },
            { id: "oppGk", number: 1, role: "GOALKEEPER", x: 0.50, y: 0.90, targetX: 0.50, targetY: 0.88, label: "Opp GK" },
          ],
          ball: { x: 0.50, y: 0.55, targetX: 0.50, targetY: 0.52, trajectory: "DRIBBLE" },
          equipment: [
            { id: "cone1", type: "CONE", x: 0.35, y: 0.45 },
            { id: "cone2", type: "CONE", x: 0.65, y: 0.45 },
          ],
        },
        {
          step: 2,
          title: "Phase 2: Snapping the Trap",
          instruction: "Opp #6 turns into trouble; #8 and #10 converge simultaneously to dispossess.",
          durationSec: 2.5,
          players: [
            { id: "opp6", number: 6, role: "DEFENSE", x: 0.50, y: 0.52, targetX: 0.50, targetY: 0.52, label: "Opp #6" },
            { id: "opp4", number: 4, role: "DEFENSE", x: 0.36, y: 0.68, targetX: 0.35, targetY: 0.65, label: "Opp CB #4" },
            { id: "opp5", number: 5, role: "DEFENSE", x: 0.64, y: 0.68, targetX: 0.65, targetY: 0.65, label: "Opp CB #5" },
            { id: "press8", number: 8, role: "ATTACK", x: 0.50, y: 0.48, targetX: 0.51, targetY: 0.52, label: "Press #8", hasBall: true },
            { id: "press10", number: 10, role: "ATTACK", x: 0.42, y: 0.50, targetX: 0.47, targetY: 0.52, label: "Press #10" },
            { id: "press9", number: 9, role: "ATTACK", x: 0.58, y: 0.48, targetX: 0.62, targetY: 0.35, label: "Press #9" },
            { id: "oppGk", number: 1, role: "GOALKEEPER", x: 0.50, y: 0.88, targetX: 0.50, targetY: 0.88, label: "Opp GK" },
          ],
          ball: { x: 0.50, y: 0.52, targetX: 0.51, targetY: 0.52, trajectory: "GROUND_PASS" },
          equipment: [
            { id: "cone1", type: "CONE", x: 0.35, y: 0.45 },
            { id: "cone2", type: "CONE", x: 0.65, y: 0.45 },
          ],
        },
        {
          step: 3,
          title: "Phase 3: Immediate Vertical Counter",
          instruction: "#8 wins possession and punches instant through-ball to sprinting #9 behind defense!",
          durationSec: 2.8,
          players: [
            { id: "opp6", number: 6, role: "DEFENSE", x: 0.50, y: 0.52, targetX: 0.48, targetY: 0.54, label: "Opp #6" },
            { id: "opp4", number: 4, role: "DEFENSE", x: 0.35, y: 0.65, targetX: 0.42, targetY: 0.50, label: "Opp CB #4" },
            { id: "opp5", number: 5, role: "DEFENSE", x: 0.65, y: 0.65, targetX: 0.58, targetY: 0.50, label: "Opp CB #5" },
            { id: "press8", number: 8, role: "ATTACK", x: 0.51, y: 0.52, targetX: 0.51, targetY: 0.45, label: "Press #8" },
            { id: "press10", number: 10, role: "ATTACK", x: 0.47, y: 0.52, targetX: 0.45, targetY: 0.38, label: "Press #10" },
            { id: "press9", number: 9, role: "ATTACK", x: 0.62, y: 0.35, targetX: 0.55, targetY: 0.18, label: "Press #9", hasBall: true },
            { id: "oppGk", number: 1, role: "GOALKEEPER", x: 0.50, y: 0.88, targetX: 0.50, targetY: 0.85, label: "Opp GK" },
          ],
          ball: { x: 0.51, y: 0.52, targetX: 0.55, targetY: 0.18, trajectory: "GROUND_PASS" },
          equipment: [
            { id: "cone1", type: "CONE", x: 0.35, y: 0.45 },
            { id: "cone2", type: "CONE", x: 0.65, y: 0.45 },
          ],
        },
      ],
    };
  }

  // Pep Guardiola Box Midfield Overload
  if (pLower.includes("box") || pLower.includes("guardiola") || pLower.includes("possession") || pLower.includes("tiki") || pLower.includes("3-2-5")) {
    return {
      id: `drill_${Date.now()}`,
      title: "Pep Guardiola 3-2-5 Box Midfield Overload",
      category: "Positional Play",
      focusArea: "Half-Space Penetration & 1v1 Winger Isolation",
      durationMinutes: 22,
      pitchView: "HALF",
      description: `Structured positional play drill creating a 4-man central box (double pivot + dual attacking 8s) to fix defenders and release the isolated winger.`,
      coachingCues: [
        "Playmaker waits until defensive mid commits before releasing pass",
        "Attacking #10 positions strictly between lines in half-space",
        "Winger maintains maximum width with toe on the touchline",
        "Attacking fullback provides secure rest-defense coverage",
      ],
      phases: [
        {
          step: 1,
          title: "Phase 1: Establishing the Central Box",
          instruction: "Double pivot circulates ball cleanly, inviting pressure from opponent midfield line.",
          durationSec: 2.8,
          players: [
            { id: "dm6", number: 6, role: "ATTACK", x: 0.42, y: 0.75, targetX: 0.44, targetY: 0.70, label: "Pivot #6", hasBall: true },
            { id: "dm8", number: 8, role: "ATTACK", x: 0.58, y: 0.75, targetX: 0.56, targetY: 0.70, label: "Pivot #8" },
            { id: "am10", number: 10, role: "ATTACK", x: 0.35, y: 0.45, targetX: 0.38, targetY: 0.40, label: "Pocket #10" },
            { id: "am7", number: 17, role: "ATTACK", x: 0.65, y: 0.45, targetX: 0.62, targetY: 0.40, label: "Pocket #17" },
            { id: "w11", number: 11, role: "ATTACK", x: 0.12, y: 0.40, targetX: 0.12, targetY: 0.32, label: "LW #11" },
            { id: "st9", number: 9, role: "ATTACK", x: 0.50, y: 0.30, targetX: 0.52, targetY: 0.25, label: "ST #9" },
            { id: "def4", number: 4, role: "DEFENSE", x: 0.42, y: 0.52, targetX: 0.43, targetY: 0.58, label: "Def CM" },
            { id: "def8", number: 8, role: "DEFENSE", x: 0.58, y: 0.52, targetX: 0.57, targetY: 0.56, label: "Def CM" },
          ],
          ball: { x: 0.42, y: 0.75, targetX: 0.44, targetY: 0.70, trajectory: "DRIBBLE" },
          equipment: [
            { id: "cone1", type: "CONE", x: 0.30, y: 0.50 },
            { id: "cone2", type: "CONE", x: 0.70, y: 0.50 },
          ],
        },
        {
          step: 2,
          title: "Phase 2: Breaking Lines into Pocket #10",
          instruction: "Pivot #6 threads sharp vertical ball through the defensive line into pocket #10's front foot.",
          durationSec: 2.6,
          players: [
            { id: "dm6", number: 6, role: "ATTACK", x: 0.44, y: 0.70, targetX: 0.45, targetY: 0.65, label: "Pivot #6" },
            { id: "dm8", number: 8, role: "ATTACK", x: 0.56, y: 0.70, targetX: 0.55, targetY: 0.65, label: "Pivot #8" },
            { id: "am10", number: 10, role: "ATTACK", x: 0.38, y: 0.40, targetX: 0.36, targetY: 0.35, label: "Pocket #10", hasBall: true },
            { id: "am7", number: 17, role: "ATTACK", x: 0.62, y: 0.40, targetX: 0.65, targetY: 0.30, label: "Pocket #17" },
            { id: "w11", number: 11, role: "ATTACK", x: 0.12, y: 0.32, targetX: 0.14, targetY: 0.22, label: "LW #11" },
            { id: "st9", number: 9, role: "ATTACK", x: 0.52, y: 0.25, targetX: 0.50, targetY: 0.20, label: "ST #9" },
            { id: "def4", number: 4, role: "DEFENSE", x: 0.43, y: 0.58, targetX: 0.40, targetY: 0.48, label: "Def CM" },
            { id: "def8", number: 8, role: "DEFENSE", x: 0.57, y: 0.56, targetX: 0.50, targetY: 0.45, label: "Def CM" },
          ],
          ball: { x: 0.44, y: 0.70, targetX: 0.36, targetY: 0.35, trajectory: "GROUND_PASS" },
          equipment: [
            { id: "cone1", type: "CONE", x: 0.30, y: 0.50 },
            { id: "cone2", type: "CONE", x: 0.70, y: 0.50 },
          ],
        },
        {
          step: 3,
          title: "Phase 3: Half-Turn & Isolation Release to LW",
          instruction: "Pocket #10 executes half-turn and slides diagonal pass to isolate LW #11 for 1v1 dribble.",
          durationSec: 2.7,
          players: [
            { id: "dm6", number: 6, role: "ATTACK", x: 0.45, y: 0.65, targetX: 0.48, targetY: 0.60, label: "Pivot #6" },
            { id: "dm8", number: 8, role: "ATTACK", x: 0.55, y: 0.65, targetX: 0.54, targetY: 0.58, label: "Pivot #8" },
            { id: "am10", number: 10, role: "ATTACK", x: 0.36, y: 0.35, targetX: 0.38, targetY: 0.25, label: "Pocket #10" },
            { id: "am7", number: 17, role: "ATTACK", x: 0.65, y: 0.30, targetX: 0.60, targetY: 0.18, label: "Pocket #17" },
            { id: "w11", number: 11, role: "ATTACK", x: 0.14, y: 0.22, targetX: 0.18, targetY: 0.15, label: "LW #11", hasBall: true },
            { id: "st9", number: 9, role: "ATTACK", x: 0.50, y: 0.20, targetX: 0.48, targetY: 0.12, label: "ST #9" },
            { id: "def4", number: 4, role: "DEFENSE", x: 0.40, y: 0.48, targetX: 0.35, targetY: 0.30, label: "Def CM" },
            { id: "def8", number: 8, role: "DEFENSE", x: 0.50, y: 0.45, targetX: 0.45, targetY: 0.25, label: "Def CM" },
          ],
          ball: { x: 0.36, y: 0.35, targetX: 0.18, targetY: 0.15, trajectory: "GROUND_PASS" },
          equipment: [
            { id: "cone1", type: "CONE", x: 0.30, y: 0.50 },
            { id: "cone2", type: "CONE", x: 0.70, y: 0.50 },
          ],
        },
      ],
    };
  }

  // Set-Piece / Corner routine
  if (isCorner) {
    return {
      id: `drill_${Date.now()}`,
      title: "Near-Post Decoy Corner Routine & Edge Strike",
      category: "Set Piece Routines",
      focusArea: "Decoy Runs & Late Box Edge Arrival",
      durationMinutes: 15,
      pitchView: "HALF",
      description: `Corner routine where two near-post decoys pull defensive marking away, clearing a shooting alley for the arriving midfielder on the edge of the 18-yard box.`,
      coachingCues: [
        "Near post runner must sprint with 100% conviction to drag markers",
        "Edge of box midfielder timing must match delivery trajectory",
        "Keep strike low, driving through the crowded penalty box",
      ],
      phases: [
        {
          step: 1,
          title: "Phase 1: Starting Setup & Decoy Motion",
          instruction: "Corner taker raises arm; near post runners initiate decoy dash towards near post flag.",
          durationSec: 2.5,
          players: [
            { id: "taker", number: 11, role: "ATTACK", x: 0.98, y: 0.05, targetX: 0.98, targetY: 0.05, label: "Taker #11", hasBall: true },
            { id: "decoy1", number: 9, role: "ATTACK", x: 0.55, y: 0.18, targetX: 0.75, targetY: 0.10, label: "Decoy #9" },
            { id: "decoy2", number: 5, role: "ATTACK", x: 0.45, y: 0.20, targetX: 0.65, targetY: 0.12, label: "Decoy #5" },
            { id: "shooter", number: 8, role: "ATTACK", x: 0.50, y: 0.40, targetX: 0.50, targetY: 0.28, label: "Shooter #8" },
            { id: "gk", number: 1, role: "GOALKEEPER", x: 0.50, y: 0.08, targetX: 0.55, targetY: 0.08, label: "GK" },
            { id: "def1", number: 3, role: "DEFENSE", x: 0.58, y: 0.16, targetX: 0.72, targetY: 0.11, label: "Marker" },
            { id: "def2", number: 4, role: "DEFENSE", x: 0.48, y: 0.18, targetX: 0.62, targetY: 0.13, label: "Marker" },
          ],
          ball: { x: 0.98, y: 0.05, targetX: 0.98, targetY: 0.05, trajectory: "DRIBBLE" },
        },
        {
          step: 2,
          title: "Phase 2: Driven Cutback Delivery to Edge of Box",
          instruction: "Taker cuts back pass along the turf, bypassing the near-post cluster to open Shooter #8.",
          durationSec: 2.4,
          players: [
            { id: "taker", number: 11, role: "ATTACK", x: 0.98, y: 0.05, targetX: 0.92, targetY: 0.08, label: "Taker #11" },
            { id: "decoy1", number: 9, role: "ATTACK", x: 0.75, y: 0.10, targetX: 0.78, targetY: 0.08, label: "Decoy #9" },
            { id: "decoy2", number: 5, role: "ATTACK", x: 0.65, y: 0.12, targetX: 0.68, targetY: 0.10, label: "Decoy #5" },
            { id: "shooter", number: 8, role: "ATTACK", x: 0.50, y: 0.28, targetX: 0.50, targetY: 0.24, label: "Shooter #8", hasBall: true },
            { id: "gk", number: 1, role: "GOALKEEPER", x: 0.55, y: 0.08, targetX: 0.52, targetY: 0.08, label: "GK" },
            { id: "def1", number: 3, role: "DEFENSE", x: 0.72, y: 0.11, targetX: 0.74, targetY: 0.10, label: "Marker" },
            { id: "def2", number: 4, role: "DEFENSE", x: 0.62, y: 0.13, targetX: 0.64, targetY: 0.12, label: "Marker" },
          ],
          ball: { x: 0.98, y: 0.05, targetX: 0.50, targetY: 0.24, trajectory: "GROUND_PASS" },
        },
        {
          step: 3,
          title: "Phase 3: First-Time Driven Finish",
          instruction: "Shooter #8 drives a powerful low finish into the bottom left corner.",
          durationSec: 2.2,
          players: [
            { id: "taker", number: 11, role: "ATTACK", x: 0.92, y: 0.08, targetX: 0.90, targetY: 0.12, label: "Taker #11" },
            { id: "decoy1", number: 9, role: "ATTACK", x: 0.78, y: 0.08, targetX: 0.75, targetY: 0.08, label: "Decoy #9" },
            { id: "decoy2", number: 5, role: "ATTACK", x: 0.68, y: 0.10, targetX: 0.65, targetY: 0.10, label: "Decoy #5" },
            { id: "shooter", number: 8, role: "ATTACK", x: 0.50, y: 0.24, targetX: 0.50, targetY: 0.22, label: "Shooter #8" },
            { id: "gk", number: 1, role: "GOALKEEPER", x: 0.52, y: 0.08, targetX: 0.42, targetY: 0.06, label: "GK" },
            { id: "def1", number: 3, role: "DEFENSE", x: 0.74, y: 0.10, targetX: 0.70, targetY: 0.10, label: "Marker" },
            { id: "def2", number: 4, role: "DEFENSE", x: 0.64, y: 0.12, targetX: 0.60, targetY: 0.12, label: "Marker" },
          ],
          ball: { x: 0.50, y: 0.24, targetX: 0.44, targetY: 0.04, trajectory: "SHOT" },
        },
      ],
    };
  }

  // Default attacking combination drill
  return {
    id: `drill_${Date.now()}`,
    title: title || "Overlapping Wing Delivery & Box Attack",
    category: isTransition ? "Attacking Transitions" : "Attacking Patterns",
    focusArea: isOverlap ? "Wide Overload & Timing of Runs" : "Spatial Awareness & Coordinated Movement",
    durationMinutes: 18,
    pitchView: pitchView as "FULL" | "HALF",
    description: `Tactical training animation generated for coach prompt: "${prompt}". Focuses on creating numerical superiority and clinical finishing.`,
    coachingCues: [
      "Firm, crisp pass into the front foot with optimum weight",
      "Fullback triggers sprint before ball reaches winger",
      "Head up to survey blind-side runners in the box",
      "One-touch clinical finish across the face of goal",
    ],
    phases: [
      {
        step: 1,
        title: "Phase 1: Build-Up & Trigger",
        instruction: "Central Midfielder collects from deep and scans the wide overload.",
        durationSec: 2.6,
        players: [
          { id: "cm8", number: 8, role: "ATTACK", x: 0.50, y: 0.78, targetX: 0.50, targetY: 0.72, label: "CM #8", hasBall: true },
          { id: "w7", number: 7, role: "ATTACK", x: 0.78, y: 0.60, targetX: 0.75, targetY: 0.52, label: "RW #7" },
          { id: "rb2", number: 2, role: "ATTACK", x: 0.85, y: 0.80, targetX: 0.88, targetY: 0.62, label: "RB #2" },
          { id: "st9", number: 9, role: "ATTACK", x: 0.48, y: 0.40, targetX: 0.52, targetY: 0.35, label: "ST #9" },
          { id: "am10", number: 10, role: "ATTACK", x: 0.35, y: 0.52, targetX: 0.38, targetY: 0.44, label: "AM #10" },
          { id: "cb4", number: 4, role: "DEFENSE", x: 0.46, y: 0.32, targetX: 0.48, targetY: 0.30, label: "CB #4" },
          { id: "lb5", number: 5, role: "DEFENSE", x: 0.66, y: 0.35, targetX: 0.68, targetY: 0.32, label: "LB #5" },
          { id: "gk1", number: 1, role: "GOALKEEPER", x: 0.50, y: 0.12, targetX: 0.50, targetY: 0.14, label: "GK #1" },
        ],
        ball: { x: 0.50, y: 0.78, targetX: 0.50, targetY: 0.72, trajectory: "DRIBBLE" },
        equipment: [
          { id: "cone1", type: "CONE", x: 0.30, y: 0.50 },
          { id: "cone2", type: "CONE", x: 0.70, y: 0.50 },
        ],
      },
      {
        step: 2,
        title: "Phase 2: Overlapping Release",
        instruction: "CM slips ball to RW, while RB accelerates on outside overlap into attacking third.",
        durationSec: 2.8,
        players: [
          { id: "cm8", number: 8, role: "ATTACK", x: 0.50, y: 0.72, targetX: 0.55, targetY: 0.60, label: "CM #8" },
          { id: "w7", number: 7, role: "ATTACK", x: 0.75, y: 0.52, targetX: 0.78, targetY: 0.46, label: "RW #7", hasBall: true },
          { id: "rb2", number: 2, role: "ATTACK", x: 0.88, y: 0.62, targetX: 0.90, targetY: 0.36, label: "RB #2" },
          { id: "st9", number: 9, role: "ATTACK", x: 0.52, y: 0.35, targetX: 0.50, targetY: 0.28, label: "ST #9" },
          { id: "am10", number: 10, role: "ATTACK", x: 0.38, y: 0.44, targetX: 0.40, targetY: 0.34, label: "AM #10" },
          { id: "cb4", number: 4, role: "DEFENSE", x: 0.48, y: 0.30, targetX: 0.50, targetY: 0.26, label: "CB #4" },
          { id: "lb5", number: 5, role: "DEFENSE", x: 0.68, y: 0.32, targetX: 0.78, targetY: 0.44, label: "LB #5" },
          { id: "gk1", number: 1, role: "GOALKEEPER", x: 0.50, y: 0.14, targetX: 0.50, targetY: 0.15, label: "GK #1" },
        ],
        ball: { x: 0.50, y: 0.72, targetX: 0.78, targetY: 0.46, trajectory: "GROUND_PASS" },
        equipment: [
          { id: "cone1", type: "CONE", x: 0.30, y: 0.50 },
          { id: "cone2", type: "CONE", x: 0.70, y: 0.50 },
        ],
      },
      {
        step: 3,
        title: "Phase 3: Byline Delivery & Darting Run",
        instruction: "Winger threads pass to overlapping RB who cuts back low cross across 6-yard box!",
        durationSec: 2.8,
        players: [
          { id: "cm8", number: 8, role: "ATTACK", x: 0.55, y: 0.60, targetX: 0.58, targetY: 0.45, label: "CM #8" },
          { id: "w7", number: 7, role: "ATTACK", x: 0.78, y: 0.46, targetX: 0.72, targetY: 0.38, label: "RW #7" },
          { id: "rb2", number: 2, role: "ATTACK", x: 0.90, y: 0.36, targetX: 0.88, targetY: 0.20, label: "RB #2", hasBall: true },
          { id: "st9", number: 9, role: "ATTACK", x: 0.50, y: 0.28, targetX: 0.45, targetY: 0.18, label: "ST #9" },
          { id: "am10", number: 10, role: "ATTACK", x: 0.40, y: 0.34, targetX: 0.35, targetY: 0.24, label: "AM #10" },
          { id: "cb4", number: 4, role: "DEFENSE", x: 0.50, y: 0.26, targetX: 0.48, targetY: 0.20, label: "CB #4" },
          { id: "lb5", number: 5, role: "DEFENSE", x: 0.78, y: 0.44, targetX: 0.82, targetY: 0.28, label: "LB #5" },
          { id: "gk1", number: 1, role: "GOALKEEPER", x: 0.50, y: 0.15, targetX: 0.55, targetY: 0.14, label: "GK #1" },
        ],
        ball: { x: 0.78, y: 0.46, targetX: 0.88, targetY: 0.20, trajectory: "GROUND_PASS" },
        equipment: [
          { id: "cone1", type: "CONE", x: 0.30, y: 0.50 },
          { id: "cone2", type: "CONE", x: 0.70, y: 0.50 },
        ],
      },
      {
        step: 4,
        title: "Phase 4: Clinical Finish",
        instruction: "Striker #9 cuts across CB to finish first-time into the corner of the net!",
        durationSec: 2.5,
        players: [
          { id: "cm8", number: 8, role: "ATTACK", x: 0.58, y: 0.45, targetX: 0.58, targetY: 0.35, label: "CM #8" },
          { id: "w7", number: 7, role: "ATTACK", x: 0.72, y: 0.38, targetX: 0.70, targetY: 0.28, label: "RW #7" },
          { id: "rb2", number: 2, role: "ATTACK", x: 0.88, y: 0.20, targetX: 0.85, targetY: 0.18, label: "RB #2" },
          { id: "st9", number: 9, role: "ATTACK", x: 0.45, y: 0.18, targetX: 0.50, targetY: 0.10, label: "ST #9", hasBall: true },
          { id: "am10", number: 10, role: "ATTACK", x: 0.35, y: 0.24, targetX: 0.30, targetY: 0.16, label: "AM #10" },
          { id: "cb4", number: 4, role: "DEFENSE", x: 0.48, y: 0.20, targetX: 0.49, targetY: 0.14, label: "CB #4" },
          { id: "lb5", number: 5, role: "DEFENSE", x: 0.82, y: 0.28, targetX: 0.76, targetY: 0.20, label: "LB #5" },
          { id: "gk1", number: 1, role: "GOALKEEPER", x: 0.55, y: 0.14, targetX: 0.50, targetY: 0.08, label: "GK #1" },
        ],
        ball: { x: 0.88, y: 0.20, targetX: 0.50, targetY: 0.08, trajectory: "SHOT" },
        equipment: [
          { id: "cone1", type: "CONE", x: 0.30, y: 0.50 },
          { id: "cone2", type: "CONE", x: 0.70, y: 0.50 },
        ],
      },
    ],
  };
}

// In-Memory Tactical Drill Cache System (Zero-Cost Quota Preservation)
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "from",
  "drill", "drills", "exercise", "training", "practice", "session", "plan",
  "tactical", "tactics", "animated", "animation", "please", "generate", "create",
  "make", "build", "show", "soccer", "football", "coach"
]);

function normalizePromptToKey(prompt: string, formation = "", focusArea = ""): { key: string; tokens: string[] } {
  const combined = `${prompt} ${formation} ${focusArea}`.toLowerCase();
  const tokens = combined
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .sort();
  const key = tokens.join("_") || "tactical_general";
  return { key, tokens };
}

interface CachedDrillEntry {
  key: string;
  tokens: string[];
  drill: any;
  createdAt: number;
  hits: number;
  source: "uefa-prewarmed" | "uefa-synthesized" | "gemini-cached";
}

const drillCache = new Map<string, CachedDrillEntry>();

const cacheMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  apiCalls: 0,
  quotaSaved: 0,
};

function saveToDrillCache(prompt: string, formation: string, focusArea: string, drill: any, source: CachedDrillEntry["source"]) {
  const { key, tokens } = normalizePromptToKey(prompt, formation, focusArea);
  drillCache.set(key, {
    key,
    tokens,
    drill: JSON.parse(JSON.stringify(drill)),
    createdAt: Date.now(),
    hits: 0,
    source,
  });
}

function findInDrillCache(prompt: string, formation = "", focusArea = ""): CachedDrillEntry | null {
  const { key, tokens } = normalizePromptToKey(prompt, formation, focusArea);
  // 1. Exact key match
  const exact = drillCache.get(key);
  if (exact) return exact;

  // 2. Fuzzy token overlap match (if at least 70% of tokens match an existing cached drill)
  if (tokens.length >= 2) {
    for (const entry of drillCache.values()) {
      const matchCount = tokens.filter((t) => entry.tokens.includes(t)).length;
      const ratio = matchCount / tokens.length;
      if (ratio >= 0.70) {
        return entry;
      }
    }
  }

  return null;
}

function prewarmCache() {
  const seeds = [
    {
      prompt: "3-phase counter attack with overlapping winger and low cutback cross",
      formation: "4-3-3",
      focusArea: "Attacking Transition",
    },
    {
      prompt: "High pressing trap on opponent #6 with 3-man angle convergence",
      formation: "4-3-3",
      focusArea: "High Press",
    },
    {
      prompt: "Pep Guardiola 3-2-5 box midfield build-up to isolate 1v1 winger",
      formation: "3-2-5",
      focusArea: "Positional Play",
    },
    {
      prompt: "Near-post decoy corner routine with late edge-of-box arrival",
      formation: "Set Piece",
      focusArea: "Set Piece",
    },
    {
      prompt: "Gegenpressing Midfield Trap & Vertical Break",
      formation: "4-3-3",
      focusArea: "Defensive Transitions",
    },
    {
      prompt: "Overlapping wing delivery and box attack",
      formation: "4-3-3",
      focusArea: "Attacking Patterns",
    },
    {
      prompt: "Rapid 4v3 counter-attack with decoy run pinning defender",
      formation: "4-3-3",
      focusArea: "Attacking Transition",
    },
    {
      prompt: "Third-man run combination through central channel to break low block",
      formation: "4-3-3",
      focusArea: "Positional Play",
    },
  ];

  for (const s of seeds) {
    const drill = synthesizeTacticalDrill(s.prompt, s.formation, s.focusArea, "FULL");
    saveToDrillCache(s.prompt, s.formation, s.focusArea, drill, "uefa-prewarmed");
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize pre-warmed cache with UEFA drills
  prewarmCache();

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      platform: "CoachTactics",
      version: "2.0.0",
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      cachedDrillsCount: drillCache.size,
    });
  });

  // Cache stats and quota preservation metrics
  app.get("/api/cache-stats", (_req, res) => {
    const hitRate = cacheMetrics.totalRequests > 0
      ? Math.round((cacheMetrics.cacheHits / cacheMetrics.totalRequests) * 100)
      : 100;

    res.json({
      totalRequests: cacheMetrics.totalRequests,
      cacheHits: cacheMetrics.cacheHits,
      apiCalls: cacheMetrics.apiCalls,
      quotaSaved: cacheMetrics.quotaSaved,
      hitRatePercent: hitRate,
      cachedDrillsCount: drillCache.size,
    });
  });

  // Clear server cache
  app.post("/api/clear-cache", (_req, res) => {
    drillCache.clear();
    prewarmCache();
    cacheMetrics.totalRequests = 0;
    cacheMetrics.cacheHits = 0;
    cacheMetrics.apiCalls = 0;
    cacheMetrics.quotaSaved = 0;
    res.json({ success: true, message: "Tactical cache refreshed and re-seeded." });
  });

  // Generate Animated Tactical Drill with Cache-First Strategy
  app.post("/api/generate-drill", async (req, res) => {
    const { prompt, currentFormation, focusArea, pitchView, forceRefresh, ecoMode } = req.body || {};

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({
        error: "Prompt is required to generate a tactical training drill.",
      });
    }

    cacheMetrics.totalRequests++;

    // 1. Cache-First Check (Zero API Call, Instant 0ms Latency)
    if (!forceRefresh) {
      const cached = findInDrillCache(prompt, currentFormation, focusArea);
      if (cached) {
        cached.hits++;
        cacheMetrics.cacheHits++;
        cacheMetrics.quotaSaved++;
        return res.json({
          success: true,
          drill: {
            ...cached.drill,
            id: `drill_cached_${Date.now()}`,
            isCached: true,
            cacheSource: "server-memory",
            quotaSaved: true,
          },
          cached: true,
          cacheHits: cached.hits,
          quotaSaved: true,
          message: "Loaded from Tactical Cache (0 API calls, $0 quota used).",
        });
      }
    }

    // 2. Eco / Free Mode Check (Synthesizes UEFA tactics locally at $0 cost)
    if (ecoMode) {
      cacheMetrics.cacheHits++;
      cacheMetrics.quotaSaved++;
      const synthesized = synthesizeTacticalDrill(prompt, currentFormation, focusArea, pitchView);
      saveToDrillCache(prompt, currentFormation, focusArea, synthesized, "uefa-synthesized");
      return res.json({
        success: true,
        drill: {
          ...synthesized,
          id: `drill_eco_${Date.now()}`,
          isCached: true,
          cacheSource: "uefa-offline",
          quotaSaved: true,
        },
        cached: true,
        quotaSaved: true,
        ecoMode: true,
        message: "Generated via UEFA Tactical Engine ($0 API cost, quota preserved).",
      });
    }

    // 3. Live Gemini Generation (Using lowest token cost model: gemini-3.1-flash-lite)
    let drillData: any = null;

    // Supported modern Gemini models in fallback order:
    // gemini-3.1-flash-lite is the most cost-efficient, highest free-tier quota model
    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
    ];

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `You are the Tactical AI Engine for CoachTactics (an elite soccer tactical animation board).
Generate dynamic, animated multi-phase soccer training drills.
Each drill MUST contain 3 to 4 sequential phases showing players moving smoothly from start positions to target positions.

Coordinates are normalized 0.0 to 1.0:
- x (width): 0.0 = left touchline, 0.5 = center, 1.0 = right touchline
- y (length): 0.0 = attacking goal/byline (top), 0.5 = midfield, 1.0 = defensive goal/byline (bottom)

For each player:
- role: 'ATTACK' (Cyan), 'DEFENSE' (Orange), 'GOALKEEPER' (Gold), or 'NEUTRAL'
- x, y: starting position in phase (0.05 to 0.95)
- targetX, targetY: ending position where player runs in this phase
- hasBall: boolean (true if player starts phase with the ball)
- label: short name or position (e.g. "CM #8", "RW #7", "CB #4", "Press #10")
- number: jersey number

For the ball:
- x, y: starting coordinate
- targetX, targetY: destination where ball is kicked/passed/shot
- trajectory: 'GROUND_PASS' | 'AERIAL_PASS' | 'DRIBBLE' | 'SHOT'

Equipment (optional):
- type: 'CONE' | 'MINI_GOAL' | 'MANNEQUIN' | 'AGILITY_LADDER'
- x, y: coordinate`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Professional name of drill" },
          category: { type: Type.STRING, description: "Category (e.g., 'Attacking Patterns', 'Defensive Transitions')" },
          focusArea: { type: Type.STRING, description: "Specific tactical theme" },
          durationMinutes: { type: Type.INTEGER, description: "Recommended drill duration in minutes" },
          pitchView: { type: Type.STRING, description: "'FULL' or 'HALF'" },
          description: { type: Type.STRING, description: "Comprehensive tactical drill overview" },
          coachingCues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Coaching cues to emphasize during drill"
          },
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.INTEGER },
                title: { type: Type.STRING, description: "Phase name (e.g., 'Phase 1: Build-Up & Trigger')" },
                instruction: { type: Type.STRING, description: "Tactical instruction for this animation phase" },
                durationSec: { type: Type.NUMBER, description: "Duration in seconds (typically 2.4 to 3.2)" },
                players: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      number: { type: Type.INTEGER },
                      role: { type: Type.STRING, description: "'ATTACK' | 'DEFENSE' | 'NEUTRAL' | 'GOALKEEPER'" },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                      targetX: { type: Type.NUMBER },
                      targetY: { type: Type.NUMBER },
                      label: { type: Type.STRING },
                      hasBall: { type: Type.BOOLEAN }
                    },
                    required: ["id", "number", "role", "x", "y", "targetX", "targetY", "label"]
                  }
                },
                ball: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    targetX: { type: Type.NUMBER },
                    targetY: { type: Type.NUMBER },
                    trajectory: { type: Type.STRING, description: "'GROUND_PASS' | 'AERIAL_PASS' | 'DRIBBLE' | 'SHOT'" }
                  },
                  required: ["x", "y", "targetX", "targetY", "trajectory"]
                },
                equipment: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING, description: "'CONE' | 'MINI_GOAL' | 'MANNEQUIN' | 'AGILITY_LADDER'" },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER }
                    },
                    required: ["id", "type", "x", "y"]
                  }
                }
              },
              required: ["step", "title", "instruction", "durationSec", "players", "ball"]
            }
          }
        },
        required: ["title", "category", "focusArea", "durationMinutes", "pitchView", "description", "coachingCues", "phases"]
      };

      for (const modelName of candidateModels) {
        try {
          console.log(`Generating tactical animated drill using ${modelName}...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `Generate an animated tactical drill for coach instructions: "${prompt}".
${currentFormation ? `Team Formation: ${currentFormation}.` : ""}
${focusArea ? `Focus Area: ${focusArea}.` : ""}
${pitchView ? `Preferred Pitch View: ${pitchView}.` : ""}
Ensure realistic player movements, passing trajectories, and 3 to 4 sequential phases.`,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema,
              maxOutputTokens: 2500,
            }
          });

          const rawText = response.text?.trim();
          if (rawText) {
            drillData = JSON.parse(rawText);
            drillData.id = `drill_ai_${Date.now()}`;
            drillData.isCached = false;
            drillData.cacheSource = "gemini-fresh";
            drillData.quotaSaved = false;
            cacheMetrics.apiCalls++;
            // Save to server cache for future zero-cost hits
            saveToDrillCache(prompt, currentFormation, focusArea, drillData, "gemini-cached");
            break;
          }
        } catch (modelErr: any) {
          console.log(`Model ${modelName} unavailable, checking next candidate model...`);
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    } catch (outerErr: any) {
      console.log("AI generation engaged fallback mode:", outerErr?.message);
    }

    if (drillData && drillData.phases && drillData.phases.length > 0) {
      return res.json({
        success: true,
        drill: drillData,
        isTacticalFallback: false,
        cached: false,
        quotaSaved: false,
      });
    }

    // High demand fallback (Overload, rate limit, 503, or network outage)
    cacheMetrics.quotaSaved++;
    const synthesized = synthesizeTacticalDrill(prompt, currentFormation, focusArea, pitchView);
    saveToDrillCache(prompt, currentFormation, focusArea, synthesized, "uefa-synthesized");
    return res.json({
      success: true,
      drill: {
        ...synthesized,
        id: `drill_synth_${Date.now()}`,
        isCached: true,
        cacheSource: "uefa-offline",
        quotaSaved: true,
      },
      isTacticalFallback: true,
      cached: false,
      quotaSaved: true,
      note: "Drill synthesized with UEFA tactical principles ($0 API cost).",
    });
  });

  // Fast Tactical Adjustments (e.g. "+1 Defender Press", "Add 2 Mini-Goals", "Fullback Overlap")
  app.post("/api/fast-change", (req, res) => {
    const { drill, changeType } = req.body || {};
    if (!drill) {
      return res.status(400).json({ error: "Active drill is required" });
    }

    const updatedDrill = JSON.parse(JSON.stringify(drill));
    updatedDrill.coachingCues = updatedDrill.coachingCues || [];
    updatedDrill.phases = updatedDrill.phases || [];

    if (changeType === "+1 Defender Press") {
      // Add a pressing defender to each phase near the ball
      updatedDrill.phases.forEach((phase: any, idx: number) => {
        const presserId = "press_def_extra";
        const bx = phase.ball.x;
        const by = phase.ball.y;
        const exists = phase.players.find((p: any) => p.id === presserId);
        if (!exists) {
          phase.players.push({
            id: presserId,
            number: 99,
            role: "DEFENSE",
            x: Math.min(0.9, Math.max(0.1, bx + (idx % 2 === 0 ? 0.08 : -0.08))),
            y: Math.min(0.9, Math.max(0.1, by - 0.08)),
            targetX: bx,
            targetY: by,
            label: "Press #99",
          });
        }
      });
      updatedDrill.coachingCues.push("Apply immediate direct pressure on ball receiver");
    } else if (changeType === "Fullback Overlap") {
      updatedDrill.phases.forEach((phase: any) => {
        const rb = phase.players.find((p: any) => p.label?.includes("RB") || p.label?.includes("#2"));
        if (rb) {
          rb.targetX = 0.92;
          rb.targetY = Math.max(0.15, rb.targetY - 0.15);
        }
      });
    } else if (changeType === "Add 2 Mini-Goals") {
      updatedDrill.phases.forEach((phase: any) => {
        phase.equipment = phase.equipment || [];
        phase.equipment.push(
          { id: `goal_1_${Date.now()}`, type: "MINI_GOAL", x: 0.25, y: 0.90 },
          { id: `goal_2_${Date.now()}`, type: "MINI_GOAL", x: 0.75, y: 0.90 }
        );
      });
    } else if (changeType === "Add Cones & Grid") {
      updatedDrill.phases.forEach((phase: any) => {
        phase.equipment = phase.equipment || [];
        phase.equipment.push(
          { id: `cone_tl_${Date.now()}`, type: "CONE", x: 0.25, y: 0.30 },
          { id: `cone_tr_${Date.now()}`, type: "CONE", x: 0.75, y: 0.30 },
          { id: `cone_bl_${Date.now()}`, type: "CONE", x: 0.25, y: 0.70 },
          { id: `cone_br_${Date.now()}`, type: "CONE", x: 0.75, y: 0.70 }
        );
      });
    } else if (changeType === "Flip Pitch View") {
      updatedDrill.pitchView = updatedDrill.pitchView === "HALF" ? "FULL" : "HALF";
    }

    return res.json({ success: true, drill: updatedDrill });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
        watch: isHmrDisabled ? null : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CoachTactics Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start CoachTactics server:", err);
  process.exit(1);
});
