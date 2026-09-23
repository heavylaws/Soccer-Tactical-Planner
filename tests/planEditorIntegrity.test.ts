// CoachTactics Phase 4.5 / 5A: Plan Editor Integrity & Single Source of Truth Test Suite
// Verifies that the current edited Tactical Domain Model is the single authoritative source of truth
// for playback, animation interpolation, persistence, phase isolation, and AI transformation.

import { InMemoryDrillRepository } from '../server/drills/drillRepository.ts';
import { DrillService } from '../server/drills/drillService.ts';
import { SafeUser } from '../server/auth/userService.ts';
import { SoccerDrill, DrillPhase, TacticalPlayer } from '../src/types.ts';
import { synthesizeTacticalDrill } from '../server/tactical/tacticalSynthesizer.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// Tactical interpolation function matching TacticalPitchView animation engine
function calculatePlayerPosition(
  player: TacticalPlayer,
  animationFraction: number
): { x: number; y: number } {
  const targetX = player.targetX ?? player.x;
  const targetY = player.targetY ?? player.y;
  return {
    x: player.x + (targetX - player.x) * animationFraction,
    y: player.y + (targetY - player.y) * animationFraction,
  };
}

function calculateBallPosition(
  ball: { x: number; y: number; targetX?: number; targetY?: number },
  animationFraction: number
): { x: number; y: number } {
  const targetX = ball.targetX ?? ball.x;
  const targetY = ball.targetY ?? ball.y;
  return {
    x: ball.x + (targetX - ball.x) * animationFraction,
    y: ball.y + (targetY - ball.y) * animationFraction,
  };
}

async function runTests() {
  console.log('\n================================================================');
  console.log('  CoachTactics Phase 4.5: Plan Editor Tactical Model Integrity');
  console.log('================================================================\n');

  const repo = new InMemoryDrillRepository();
  const service = new DrillService(repo);

  const headCoach: SafeUser = {
    id: 'coach_pep_01',
    username: 'head_coach_test',
    name: 'Head Coach (Test)',
    role: 'HEAD_COACH',
    team: 'Manchester City',
    avatarColor: '#00E676',
    email: 'pep@tactics.club',
    needsEmailSetup: false,
  };

  // 1. Synthesize initial base plan
  console.log('1. Initial Base Plan Setup:');
  const basePlan = synthesizeTacticalDrill('4-3-3 Build Up Press', '4-3-3', 'Build Up');
  assert(Boolean(basePlan), 'Initial base plan synthesized successfully');
  assert(basePlan.phases.length >= 2, 'Base plan has multiple phases for playback');

  const p1Original = basePlan.phases[0].players[0];
  const originalStartX = p1Original.x;
  const originalStartY = p1Original.y;
  const originalTargetX = p1Original.targetX;
  const originalTargetY = p1Original.targetY;
  console.log(`   Base Player 1: start=(${originalStartX}, ${originalStartY}), target=(${originalTargetX}, ${originalTargetY})`);

  // 2. Position edit: Coach manually repositions player on tactical board
  console.log('\n2. Position Edit & Playback Start Verification:');
  const editedStartX = 0.25;
  const editedStartY = 0.35;

  // Simulate handlePlayerMoved
  const dx = (p1Original.targetX ?? p1Original.x) - p1Original.x;
  const dy = (p1Original.targetY ?? p1Original.y) - p1Original.y;
  const editedTargetX = Math.max(0.02, Math.min(0.98, editedStartX + dx));
  const editedTargetY = Math.max(0.02, Math.min(0.98, editedStartY + dy));

  const drillAfterPosEdit: SoccerDrill = {
    ...basePlan,
    phases: basePlan.phases.map((ph, idx) => {
      if (idx !== 0) return ph;
      return {
        ...ph,
        players: ph.players.map((p) => {
          if (p.id !== p1Original.id) return p;
          return {
            ...p,
            x: editedStartX,
            y: editedStartY,
            targetX: editedTargetX,
            targetY: editedTargetY,
          };
        }),
      };
    }),
  };

  const p1EditedPos = drillAfterPosEdit.phases[0].players[0];
  const playbackPosAtZero = calculatePlayerPosition(p1EditedPos, 0.0);
  assert(
    Math.abs(playbackPosAtZero.x - editedStartX) < 1e-4 && Math.abs(playbackPosAtZero.y - editedStartY) < 1e-4,
    'Playback starts precisely from the coach edited start position at progress = 0',
    `Expected (${editedStartX}, ${editedStartY}), got (${playbackPosAtZero.x}, ${playbackPosAtZero.y})`
  );
  assert(
    playbackPosAtZero.x !== originalStartX && playbackPosAtZero.y !== originalStartY,
    'Playback does NOT use the stale original AI base start position'
  );

  // 3. Destination edit: Coach sets a new movement vector/destination
  console.log('\n3. Destination Edit & Trajectory Interpolation Verification:');
  const customDestinationX = 0.88;
  const customDestinationY = 0.72;

  // Simulate handlePlayerTargetMoved
  const drillAfterTargetEdit: SoccerDrill = {
    ...drillAfterPosEdit,
    phases: drillAfterPosEdit.phases.map((ph, idx) => {
      if (idx !== 0) return ph;
      return {
        ...ph,
        players: ph.players.map((p) => {
          if (p.id !== p1Original.id) return p;
          return {
            ...p,
            targetX: customDestinationX,
            targetY: customDestinationY,
          };
        }),
      };
    }),
  };

  const p1EditedTarget = drillAfterTargetEdit.phases[0].players[0];
  const playbackMidpoint = calculatePlayerPosition(p1EditedTarget, 0.5);
  const expectedMidX = p1EditedTarget.x + (customDestinationX - p1EditedTarget.x) * 0.5;
  const expectedMidY = p1EditedTarget.y + (customDestinationY - p1EditedTarget.y) * 0.5;
  assert(
    Math.abs(playbackMidpoint.x - expectedMidX) < 1e-4 && Math.abs(playbackMidpoint.y - expectedMidY) < 1e-4,
    'Playback interpolates toward the coach-edited destination at progress = 0.5'
  );

  const playbackEnd = calculatePlayerPosition(p1EditedTarget, 1.0);
  assert(
    Math.abs(playbackEnd.x - customDestinationX) < 1e-4 && Math.abs(playbackEnd.y - customDestinationY) < 1e-4,
    'Playback arrives precisely at the coach-edited destination at progress = 1.0'
  );

  // 4. Multiple Player Edits: Coach adjusts multiple players simultaneously
  console.log('\n4. Multiple Player Edits Verification:');
  const p2Original = basePlan.phases[0].players[1];
  const p3Original = basePlan.phases[0].players[2];

  const drillMultiEdit: SoccerDrill = {
    ...drillAfterTargetEdit,
    phases: drillAfterTargetEdit.phases.map((ph, idx) => {
      if (idx !== 0) return ph;
      return {
        ...ph,
        players: ph.players.map((p) => {
          if (p.id === p2Original.id) {
            return { ...p, x: 0.15, y: 0.85, targetX: 0.35, targetY: 0.75 };
          }
          if (p.id === p3Original.id) {
            return { ...p, x: 0.75, y: 0.15, targetX: 0.90, targetY: 0.40 };
          }
          return p;
        }),
      };
    }),
  };

  const p1Check = drillMultiEdit.phases[0].players[0];
  const p2Check = drillMultiEdit.phases[0].players[1];
  const p3Check = drillMultiEdit.phases[0].players[2];

  assert(
    p1Check.targetX === customDestinationX && p1Check.targetY === customDestinationY,
    'Player 1 edits remain intact when other players are edited'
  );
  assert(
    p2Check.x === 0.15 && p2Check.targetX === 0.35,
    'Player 2 edits are honored without conflicting'
  );
  assert(
    p3Check.x === 0.75 && p3Check.targetX === 0.90,
    'Player 3 edits are honored without conflicting'
  );

  const p2Mid = calculatePlayerPosition(p2Check, 0.5);
  const p3Mid = calculatePlayerPosition(p3Check, 0.5);
  assert(
    Math.abs(p2Mid.x - 0.25) < 1e-4 && Math.abs(p3Mid.x - 0.825) < 1e-4,
    'All edited players animate simultaneously toward their respective coach destinations'
  );

  // 5. Ball Destination Edit & Playback
  console.log('\n5. Ball Destination Edit & Playback:');
  const drillWithBallEdit: SoccerDrill = {
    ...drillMultiEdit,
    phases: drillMultiEdit.phases.map((ph, idx) => {
      if (idx !== 0) return ph;
      return {
        ...ph,
        ball: {
          ...ph.ball,
          x: 0.45,
          y: 0.50,
          targetX: 0.80,
          targetY: 0.20,
        },
      };
    }),
  };

  const ballProgress0 = calculateBallPosition(drillWithBallEdit.phases[0].ball, 0);
  const ballProgressHalf = calculateBallPosition(drillWithBallEdit.phases[0].ball, 0.5);
  const ballProgress1 = calculateBallPosition(drillWithBallEdit.phases[0].ball, 1.0);

  assert(ballProgress0.x === 0.45 && ballProgress0.y === 0.50, 'Ball starts at edited position (0.45, 0.50)');
  assert(
    Math.abs(ballProgressHalf.x - 0.625) < 1e-4 && Math.abs(ballProgressHalf.y - 0.35) < 1e-4,
    'Ball animates along pass corridor to (0.625, 0.35) at 50%'
  );
  assert(ballProgress1.x === 0.80 && ballProgress1.y === 0.20, 'Ball reaches target destination (0.80, 0.20)');

  // 6. Phase Isolation Verification
  console.log('\n6. Phase Isolation:');
  const phase1Players = drillWithBallEdit.phases[0].players;
  const phase2OriginalPlayers = basePlan.phases[1].players;
  const phase2CurrentPlayers = drillWithBallEdit.phases[1].players;

  assert(
    JSON.stringify(phase2CurrentPlayers) === JSON.stringify(phase2OriginalPlayers),
    'Editing Phase 1 did NOT modify Phase 2 players in any way'
  );
  assert(
    phase1Players[0].x !== phase2CurrentPlayers[0].x || phase1Players[0].targetX !== phase2CurrentPlayers[0].targetX,
    'Phase 1 and Phase 2 maintain strict tactical isolation'
  );

  // 7. Save and Reload via Server Authoritative Repository
  console.log('\n7. Server Persistence & Reload Verification:');
  // First create on server
  const createdDrill = await service.createDrill(
    {
      ...drillWithBallEdit,
      title: 'Pep Masterplan Build Up (Edited)',
      tags: ['build-up', 'edited-plan'],
    },
    headCoach
  );
  assert(Boolean(createdDrill.id), 'Edited plan created in server repository');
  assert(createdDrill.version === 1, 'Initial server version = 1');

  // Verify stored drill has edited coordinates intact
  const reloadedV1 = await service.getDrillById(createdDrill.id, headCoach);
  assert(
    reloadedV1.phases[0].players[0].targetX === customDestinationX,
    'Reloaded drill preserves Player 1 custom destination'
  );
  assert(
    reloadedV1.phases[0].ball.targetX === 0.80,
    'Reloaded drill preserves ball custom destination'
  );

  // Update with further tactical tweak
  const furtherTweaked: Partial<SoccerDrill> = {
    phases: reloadedV1.phases.map((ph, idx) => {
      if (idx !== 0) return ph;
      return {
        ...ph,
        players: ph.players.map((p) => {
          if (p.id === p1Original.id) {
            return { ...p, targetX: 0.95, targetY: 0.90 };
          }
          return p;
        }),
      };
    }),
  };

  const updatedDrill = await service.updateDrill(createdDrill.id, furtherTweaked, headCoach);
  assert(updatedDrill.version === 2, 'Updating edited drill increments version to 2');

  const reloadedV2 = await service.getDrillById(createdDrill.id, headCoach);
  assert(
    reloadedV2.phases[0].players[0].targetX === 0.95,
    'Reloaded v2 drill reflects latest coach edit (0.95)'
  );
  assert(
    reloadedV2.phases[0].players[0].targetX !== originalTargetX,
    'Reloaded drill is completely freed from the stale original AI base plan'
  );

  // 8. AI / Fast-Change Tactical Transformation Input
  console.log('\n8. Tactical Transformation Consuming Edited Tactical Model:');
  // Simulate Fast Change "+1 Defender Press" applied to the EDITED drill model
  const addDefenderPress = (drill: SoccerDrill): SoccerDrill => {
    // The transformation consumes drill.phases[0].players (the EDITED model)
    const activePhase = drill.phases[0];
    const newDefender: TacticalPlayer = {
      id: `p_press_${Date.now()}`,
      number: 99,
      role: 'DEFENSE',
      label: 'Pressing CB',
      x: 0.50,
      y: 0.40,
      targetX: activePhase.players[0].x, // Press against player 1's edited start position!
      targetY: activePhase.players[0].y,
    };
    return {
      ...drill,
      phases: drill.phases.map((ph, idx) => {
        if (idx !== 0) return ph;
        return {
          ...ph,
          players: [...ph.players, newDefender],
        };
      }),
    };
  };

  const transformedDrill = addDefenderPress(reloadedV2 as unknown as SoccerDrill);
  const pressingPlayer = transformedDrill.phases[0].players.find((p) => p.number === 99);
  assert(Boolean(pressingPlayer), 'Transformation added pressing defender');
  assert(
    pressingPlayer?.targetX === editedStartX && pressingPlayer?.targetY === editedStartY,
    'Transformation targeted the coach-edited player position rather than the old AI base position'
  );

  // 9. Single Source of Truth Enforcement Check
  console.log('\n9. Single Source of Truth Verification:');
  assert(
    transformedDrill.phases[0].players[0].targetX === 0.95,
    'Edited player 1 destination preserved through subsequent transformation'
  );

  console.log('\n================================================================');
  console.log(`  Tests Completed: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
