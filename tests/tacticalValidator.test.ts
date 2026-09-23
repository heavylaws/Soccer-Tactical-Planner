// Automated Tactical Domain Validator Test Suite
import { validateTacticalDrill } from '../server/tactical/tacticalValidator.ts';
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

function runTests() {
  console.log('\n--- SECTION 1: VALID COMPLETE DRILL ---');

  const validDrill = {
    title: 'High Press 4-3-3 Trap',
    category: 'Defensive Pressing',
    focusArea: 'Central Trap & Angle Convergence',
    durationMinutes: 20,
    pitchView: 'FULL',
    description: 'A 3-phase pressing drill closing down the opponent pivot.',
    coachingCues: ['Sprint on touch', 'Cut passing lanes'],
    phases: [
      {
        step: 1,
        title: 'Phase 1: Initial Trigger',
        instruction: 'Winger presses outside shoulder.',
        durationSec: 2.5,
        players: [
          { id: 'w7', number: 7, role: 'ATTACK', x: 0.75, y: 0.50, targetX: 0.65, targetY: 0.40, label: 'RW #7' },
          { id: 'cm8', number: 8, role: 'ATTACK', x: 0.50, y: 0.60, targetX: 0.52, targetY: 0.48, label: 'CM #8', hasBall: true },
          { id: 'opp6', number: 6, role: 'DEFENSE', x: 0.50, y: 0.45, targetX: 0.48, targetY: 0.45, label: 'Opp #6' },
        ],
        ball: { x: 0.50, y: 0.60, targetX: 0.65, targetY: 0.40, trajectory: 'GROUND_PASS' },
        equipment: [
          { id: 'c1', type: 'CONE', x: 0.30, y: 0.40 },
          { id: 'g1', type: 'MINI_GOAL', x: 0.50, y: 0.95 },
        ],
      },
      {
        step: 2,
        title: 'Phase 2: Convergence & Interception',
        instruction: 'CM #8 steps in to win loose pass.',
        durationSec: 2.8,
        players: [
          { id: 'w7', number: 7, role: 'ATTACK', x: 0.65, y: 0.40, targetX: 0.60, targetY: 0.35, label: 'RW #7' },
          { id: 'cm8', number: 8, role: 'ATTACK', x: 0.52, y: 0.48, targetX: 0.50, targetY: 0.38, label: 'CM #8', hasBall: true },
          { id: 'opp6', number: 6, role: 'DEFENSE', x: 0.48, y: 0.45, targetX: 0.45, targetY: 0.48, label: 'Opp #6' },
        ],
        ball: { x: 0.65, y: 0.40, targetX: 0.50, targetY: 0.38, trajectory: 'INTERCEPTION' as any }, // will test below
      },
    ],
  };

  // 1.1 Complete valid drill with valid trajectory
  const validDrillCopy = JSON.parse(JSON.stringify(validDrill));
  validDrillCopy.phases[1].ball.trajectory = 'GROUND_PASS';
  const result1 = validateTacticalDrill(validDrillCopy);
  assert(result1.success === true, 'Valid complete drill passes validation');
  assert(result1.drill?.phases.length === 2, 'Result contains both valid phases');
  assert(result1.drill?.phases[0].equipment?.length === 2, 'Result contains equipment');

  console.log('\n--- SECTION 2: INVALID STRUCTURES ---');

  // 2.1 Null or primitive root
  assert(validateTacticalDrill(null).success === false, 'Rejects null input');
  assert(validateTacticalDrill('not a drill').success === false, 'Rejects string input');
  assert(validateTacticalDrill([1, 2, 3]).success === false, 'Rejects array root');

  // 2.2 Missing required fields
  const missingTitle = { ...validDrillCopy };
  delete (missingTitle as any).title;
  const resMissingTitle = validateTacticalDrill(missingTitle);
  assert(resMissingTitle.success === false, 'Rejects missing title');
  assert(resMissingTitle.errors?.some((e) => e.code === 'MISSING_DRILL_TITLE') === true, 'Returns MISSING_DRILL_TITLE error code');

  const missingPhases = { ...validDrillCopy, phases: [] };
  const resMissingPhases = validateTacticalDrill(missingPhases);
  assert(resMissingPhases.success === false, 'Rejects empty phases array');
  assert(resMissingPhases.errors?.some((e) => e.code === 'EMPTY_PHASES_ARRAY') === true, 'Returns EMPTY_PHASES_ARRAY error code');

  console.log('\n--- SECTION 3: COORDINATE BOUNDARIES & TYPES ---');

  // 3.1 Boundary coordinates (0.0 and 1.0 are valid)
  const minCoordDrill = JSON.parse(JSON.stringify(validDrillCopy));
  minCoordDrill.phases[0].players[0].x = 0.0;
  minCoordDrill.phases[0].players[0].y = 0.0;
  minCoordDrill.phases[0].players[0].targetX = 1.0;
  minCoordDrill.phases[0].players[0].targetY = 1.0;
  assert(validateTacticalDrill(minCoordDrill).success === true, 'Accepts exact boundary coordinates (0.0 and 1.0)');

  // 3.2 Negative coordinate
  const negCoordDrill = JSON.parse(JSON.stringify(validDrillCopy));
  negCoordDrill.phases[0].players[0].x = -0.05;
  const resNeg = validateTacticalDrill(negCoordDrill);
  assert(resNeg.success === false, 'Rejects negative coordinate (-0.05)');
  assert(resNeg.errors?.some((e) => e.code === 'COORDINATE_OUT_OF_BOUNDS') === true, 'Returns COORDINATE_OUT_OF_BOUNDS for negative coord');

  // 3.3 Out of bounds coordinate (> 1.0)
  const highCoordDrill = JSON.parse(JSON.stringify(validDrillCopy));
  highCoordDrill.phases[0].ball.targetX = 1.25;
  const resHigh = validateTacticalDrill(highCoordDrill);
  assert(resHigh.success === false, 'Rejects coordinate greater than 1.0 (1.25)');
  assert(resHigh.errors?.some((e) => e.code === 'COORDINATE_OUT_OF_BOUNDS') === true, 'Returns COORDINATE_OUT_OF_BOUNDS for coord > 1.0');

  // 3.4 NaN coordinate
  const nanCoordDrill = JSON.parse(JSON.stringify(validDrillCopy));
  nanCoordDrill.phases[0].players[0].targetY = NaN;
  const resNaN = validateTacticalDrill(nanCoordDrill);
  assert(resNaN.success === false, 'Rejects NaN coordinate');
  assert(resNaN.errors?.some((e) => e.code === 'INVALID_COORDINATE_VALUE') === true, 'Returns INVALID_COORDINATE_VALUE for NaN');

  // 3.5 Infinity coordinate
  const infCoordDrill = JSON.parse(JSON.stringify(validDrillCopy));
  infCoordDrill.phases[0].players[0].y = Infinity;
  const resInf = validateTacticalDrill(infCoordDrill);
  assert(resInf.success === false, 'Rejects Infinity coordinate');
  assert(resInf.errors?.some((e) => e.code === 'INVALID_COORDINATE_VALUE') === true, 'Returns INVALID_COORDINATE_VALUE for Infinity');

  console.log('\n--- SECTION 4: PLAYERS VALIDATION ---');

  // 4.1 Duplicate player ID within a phase
  const dupPlayerDrill = JSON.parse(JSON.stringify(validDrillCopy));
  dupPlayerDrill.phases[0].players.push({
    id: 'w7', // Duplicate of first player
    number: 17,
    role: 'ATTACK',
    x: 0.60,
    y: 0.60,
    targetX: 0.62,
    targetY: 0.62,
    label: 'RW #17',
  });
  const resDup = validateTacticalDrill(dupPlayerDrill);
  assert(resDup.success === false, 'Rejects duplicate player ID in phase');
  assert(resDup.errors?.some((e) => e.code === 'DUPLICATE_PLAYER_ID') === true, 'Returns DUPLICATE_PLAYER_ID code');

  // 4.2 Invalid player role
  const badRoleDrill = JSON.parse(JSON.stringify(validDrillCopy));
  badRoleDrill.phases[0].players[0].role = 'STRIKER'; // Not in ATTACK|DEFENSE|NEUTRAL|GOALKEEPER
  const resRole = validateTacticalDrill(badRoleDrill);
  assert(resRole.success === false, 'Rejects invalid player role');
  assert(resRole.errors?.some((e) => e.code === 'INVALID_ROLE_VALUE') === true, 'Returns INVALID_ROLE_VALUE code');

  // 4.3 Missing player label
  const badLabelDrill = JSON.parse(JSON.stringify(validDrillCopy));
  badLabelDrill.phases[0].players[0].label = '';
  const resLabel = validateTacticalDrill(badLabelDrill);
  assert(resLabel.success === false, 'Rejects empty player label');
  assert(resLabel.errors?.some((e) => e.code === 'MISSING_PLAYER_LABEL') === true, 'Returns MISSING_PLAYER_LABEL code');

  console.log('\n--- SECTION 5: PHASES & DURATION VALIDATION ---');

  // 5.1 Duplicate phase steps
  const dupStepDrill = JSON.parse(JSON.stringify(validDrillCopy));
  dupStepDrill.phases[1].step = 1; // Duplicate of phase 0
  const resDupStep = validateTacticalDrill(dupStepDrill);
  assert(resDupStep.success === false, 'Rejects duplicate phase step number');
  assert(resDupStep.errors?.some((e) => e.code === 'DUPLICATE_PHASE_STEP') === true, 'Returns DUPLICATE_PHASE_STEP code');

  // 5.2 Negative phase duration
  const negDurDrill = JSON.parse(JSON.stringify(validDrillCopy));
  negDurDrill.phases[0].durationSec = -2.5;
  const resNegDur = validateTacticalDrill(negDurDrill);
  assert(resNegDur.success === false, 'Rejects negative phase duration');
  assert(resNegDur.errors?.some((e) => e.code === 'INVALID_PHASE_DURATION') === true, 'Returns INVALID_PHASE_DURATION code');

  // 5.3 Zero duration
  const zeroDurDrill = JSON.parse(JSON.stringify(validDrillCopy));
  zeroDurDrill.phases[0].durationSec = 0;
  const resZeroDur = validateTacticalDrill(zeroDurDrill);
  assert(resZeroDur.success === false, 'Rejects zero phase duration');

  // 5.4 Phase with 0 players
  const zeroPlayersDrill = JSON.parse(JSON.stringify(validDrillCopy));
  zeroPlayersDrill.phases[0].players = [];
  const resZeroPlayers = validateTacticalDrill(zeroPlayersDrill);
  assert(resZeroPlayers.success === false, 'Rejects phase with empty players array');
  assert(resZeroPlayers.errors?.some((e) => e.code === 'EMPTY_PLAYERS_ARRAY') === true, 'Returns EMPTY_PLAYERS_ARRAY code');

  console.log('\n--- SECTION 6: BALL & TRAJECTORY VALIDATION ---');

  // 6.1 Invalid ball trajectory
  const badTrajDrill = JSON.parse(JSON.stringify(validDrillCopy));
  badTrajDrill.phases[0].ball.trajectory = 'KICK_OFF';
  const resTraj = validateTacticalDrill(badTrajDrill);
  assert(resTraj.success === false, 'Rejects invalid ball trajectory');
  assert(resTraj.errors?.some((e) => e.code === 'INVALID_TRAJECTORY_VALUE') === true, 'Returns INVALID_TRAJECTORY_VALUE code');

  console.log('\n--- SECTION 7: EQUIPMENT VALIDATION ---');

  // 7.1 Invalid equipment type
  const badEqDrill = JSON.parse(JSON.stringify(validDrillCopy));
  badEqDrill.phases[0].equipment[0].type = 'FLAGPOLE';
  const resBadEq = validateTacticalDrill(badEqDrill);
  assert(resBadEq.success === false, 'Rejects invalid equipment type');
  assert(resBadEq.errors?.some((e) => e.code === 'INVALID_EQUIPMENT_VALUE') === true, 'Returns INVALID_EQUIPMENT_VALUE code');

  // 7.2 Duplicate equipment ID in same phase
  const dupEqDrill = JSON.parse(JSON.stringify(validDrillCopy));
  dupEqDrill.phases[0].equipment[1].id = dupEqDrill.phases[0].equipment[0].id;
  const resDupEq = validateTacticalDrill(dupEqDrill);
  assert(resDupEq.success === false, 'Rejects duplicate equipment ID in phase');
  assert(resDupEq.errors?.some((e) => e.code === 'DUPLICATE_EQUIPMENT_ID') === true, 'Returns DUPLICATE_EQUIPMENT_ID code');

  console.log('\n--- SECTION 8: SAFE NORMALIZATION ---');

  // 8.1 Numeric strings safely converted to numbers
  const strNumDrill = JSON.parse(JSON.stringify(validDrillCopy));
  strNumDrill.phases[0].players[0].x = '0.75';
  strNumDrill.phases[0].players[0].number = '7';
  strNumDrill.phases[0].durationSec = '2.5';
  strNumDrill.pitchView = 'half'; // Lowercase normalization
  const resNorm = validateTacticalDrill(strNumDrill);
  assert(resNorm.success === true, 'Safely normalizes numeric strings and lowercase pitch view');
  assert(typeof resNorm.drill?.phases[0].players[0].x === 'number', 'Coordinate normalized to number');
  assert(resNorm.drill?.phases[0].players[0].x === 0.75, 'Coordinate value matches 0.75');
  assert(resNorm.drill?.phases[0].players[0].number === 7, 'Jersey number normalized to number 7');
  assert(resNorm.drill?.pitchView === 'HALF', 'pitchView normalized to uppercase HALF');

  // 8.2 Missing optional equipment array normalized to []
  const noEqDrill = JSON.parse(JSON.stringify(validDrillCopy));
  delete noEqDrill.phases[0].equipment;
  delete noEqDrill.phases[1].equipment;
  const resNoEq = validateTacticalDrill(noEqDrill);
  assert(resNoEq.success === true, 'Valid when equipment is omitted');
  assert(Array.isArray(resNoEq.drill?.phases[0].equipment), 'Equipment normalized to array');

  console.log('\n--- SECTION 9: INTEGRATION WITH OFFLINE ENGINE ---');

  // 9.1 Synthesized counter-attack drill passes validation
  const synth1 = synthesizeTacticalDrill('3-phase counter attack', '4-3-3', 'Attacking Transition', 'FULL');
  const resSynth1 = validateTacticalDrill(synth1);
  assert(resSynth1.success === true, 'Offline synthesized Counter Attack drill passes validation');

  // 9.2 Synthesized box midfield drill passes validation
  const synth2 = synthesizeTacticalDrill('pep guardiola box midfield overload', '3-2-5', 'Positional Play', 'HALF');
  const resSynth2 = validateTacticalDrill(synth2);
  assert(resSynth2.success === true, 'Offline synthesized Pep Box drill passes validation');

  // 9.3 Synthesized corner routine drill passes validation
  const synth3 = synthesizeTacticalDrill('near post decoy corner routine', '4-3-3', 'Set Piece Routines', 'HALF');
  const resSynth3 = validateTacticalDrill(synth3);
  assert(resSynth3.success === true, 'Offline synthesized Corner Routine drill passes validation');

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
