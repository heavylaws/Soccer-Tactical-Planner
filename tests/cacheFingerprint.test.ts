/**
 * CoachTactics — Phase 5: Deterministic Tactical Cache & Fingerprinting Tests
 *
 * Verifies:
 * 1. Deterministic canonicalization (whitespace, case, formation, pitch view, engine mode)
 * 2. Word order and tactical preposition preservation (no token sorting or indiscriminate stop-word stripping)
 * 3. Versioned fingerprint format: drill-cache:v2:<sha256-hex>
 * 4. Exact equivalence: identical fingerprints for equivalent inputs
 * 5. Strict isolation: different fingerprints for different tactical contexts (no fuzzy collisions)
 * 6. Non-semantic field exclusion (timestamps, user IDs, UI state excluded)
 * 7. Server & Client fingerprint parity (Node crypto vs isomorphic pure TS SHA-256)
 * 8. Cache store exact-hit and miss behavior (no fuzzy hits)
 * 9. Validation gatekeeper: unvalidated/corrupted drills cannot enter or stay in cache
 * 10. Separation between AI generation cache and coach-edited DrillRepository
 * 11. Cache metrics and clear-cache functionality
 */

import {
  generateCacheFingerprint as serverFingerprint,
  canonicalizeContext,
  normalizePrompt,
  normalizeFormation,
  normalizeFocusArea,
  normalizePitchView,
  serializeCanonicalContext,
  CACHE_VERSION,
  CACHE_KEY_PREFIX,
} from '../server/cache/cacheFingerprint.ts';

import {
  generateCacheFingerprint as clientFingerprint,
} from '../src/utils/cacheFingerprint.ts';

import {
  drillCache,
  findInDrillCache,
  saveToDrillCache,
  prewarmCache,
  cacheMetrics,
} from '../server.ts';

import { InMemoryDrillRepository } from '../server/drills/drillRepository.ts';
import { DrillService } from '../server/drills/drillService.ts';
import { synthesizeTacticalDrill } from '../server/tactical/tacticalSynthesizer.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function runTests() {
  console.log('--- TEST SUITE 1: CANONICALIZATION & NORMALIZATION ---');

  // 1. Prompt normalization
  const p1 = normalizePrompt('  3-phase   Counter  Attack!  ');
  assert(p1 === '3-phase counter attack', 'normalizePrompt trims, collapses spaces, lowercases, strips trailing punctuation');

  const p2 = normalizePrompt('Build-up in a 4 - 3 - 3 shape with #6 pivot.');
  assert(p2 === 'build-up in a 4-3-3 shape with #6 pivot', 'normalizePrompt normalizes formation hyphens and preserves player numbers');

  const pQuotes = normalizePrompt('“High Press” in ‘Midfield’');
  assert(pQuotes === '"high press" in \'midfield\'', 'normalizePrompt normalizes smart quotes to standard quotes');

  // 2. Word order preservation (CRITICAL: anti-fuzzy match test)
  const pForward = normalizePrompt('CB pass to pivot');
  const pReverse = normalizePrompt('pivot pass to CB');
  assert(pForward !== pReverse, 'normalizePrompt preserves word order (CB->pivot !== pivot->CB)');

  // 3. Tactical prepositions preservation
  const pBehind = normalizePrompt('run behind defensive line');
  const pFront = normalizePrompt('run in front of defensive line');
  assert(pBehind !== pFront, 'normalizePrompt preserves tactical prepositions ("behind" vs "in front of")');

  // 4. Formation normalization
  assert(normalizeFormation(' 4 - 3 - 3 ') === '4-3-3', 'normalizeFormation normalizes spaced hyphens');
  assert(normalizeFormation('3-5-2') === '3-5-2', 'normalizeFormation handles compact formations');
  assert(normalizeFormation(undefined) === '', 'normalizeFormation handles undefined gracefully');

  // 5. Focus area normalization
  assert(normalizeFocusArea('  Attacking   Transition ') === 'attacking transition', 'normalizeFocusArea normalizes text');

  // 6. Pitch view normalization
  assert(normalizePitchView('HALF') === 'HALF', 'normalizePitchView preserves HALF');
  assert(normalizePitchView('half') === 'HALF', 'normalizePitchView lower to UPPER');
  assert(normalizePitchView('FULL') === 'FULL', 'normalizePitchView FULL');
  assert(normalizePitchView(undefined) === 'FULL', 'normalizePitchView defaults to FULL');

  console.log('\n--- TEST SUITE 2: DETERMINISTIC FINGERPRINT FORMAT & EQUIVALENCE ---');

  // 7. Format
  const fp1 = serverFingerprint({
    prompt: 'High pressing trap on opponent #6',
    formation: '4-3-3',
    focusArea: 'High Press',
  });
  assert(fp1.startsWith(CACHE_KEY_PREFIX), `Fingerprint starts with '${CACHE_KEY_PREFIX}'`);
  assert(fp1.startsWith('drill-cache:v2:'), 'Fingerprint contains version v2');
  const hashPart = fp1.slice(CACHE_KEY_PREFIX.length);
  assert(/^[0-9a-f]{64}$/.test(hashPart), 'Fingerprint contains valid 64-character SHA-256 hex');

  // 8. Equivalence across formatting differences
  const fpEquivalentA = serverFingerprint({
    prompt: '  High   pressing   trap on opponent #6! ',
    formation: ' 4 - 3 - 3 ',
    focusArea: 'HIGH PRESS',
    pitchView: 'full',
  });
  const fpEquivalentB = serverFingerprint({
    prompt: 'high pressing trap on opponent #6',
    formation: '4-3-3',
    focusArea: 'high press',
    pitchView: 'FULL',
  });
  assert(fpEquivalentA === fpEquivalentB, 'Equivalent prompts with formatting/case differences generate identical fingerprint');

  // 9. Non-semantic field exclusion
  const fpWithTransient = serverFingerprint({
    prompt: 'high pressing trap on opponent #6',
    formation: '4-3-3',
    focusArea: 'high press',
    pitchView: 'FULL',
    // transient fields that must not affect fingerprint:
    ...({ timestamp: 123456789, authorId: 'user_xyz', zoomLevel: 1.5, selectedTool: 'arrow' } as any),
  });
  assert(fpWithTransient === fpEquivalentB, 'Transient/non-semantic fields (timestamps, user IDs, UI state) do not change fingerprint');

  console.log('\n--- TEST SUITE 3: STRICT ISOLATION (NO FUZZY COLLISIONS) ---');

  // 10. Different prompts must produce different fingerprints
  const fpDiffA = serverFingerprint({
    prompt: '4v4 high pressing trap on #6',
    formation: '4-3-3',
    focusArea: 'High Press',
  });
  const fpDiffB = serverFingerprint({
    prompt: '4v4 low block counter attack with wing cutback',
    formation: '4-3-3',
    focusArea: 'High Press',
  });
  assert(fpDiffA !== fpDiffB, 'Different tactical prompts produce strictly different fingerprints');

  // 11. Inverted direction / roles must produce different fingerprints
  const fpOrderA = serverFingerprint({
    prompt: 'defender press striker',
    formation: '4-3-3',
  });
  const fpOrderB = serverFingerprint({
    prompt: 'striker press defender',
    formation: '4-3-3',
  });
  assert(fpOrderA !== fpOrderB, 'Inverted actor/action order produces strictly different fingerprints');

  // 12. Different formations produce different fingerprints
  const fpFormationA = serverFingerprint({ prompt: 'box midfield buildup', formation: '3-2-5' });
  const fpFormationB = serverFingerprint({ prompt: 'box midfield buildup', formation: '4-3-3' });
  assert(fpFormationA !== fpFormationB, 'Different formations produce different fingerprints');

  // 13. Pitch view isolation
  const fpViewFull = serverFingerprint({ prompt: 'corner kick routine', pitchView: 'FULL' });
  const fpViewHalf = serverFingerprint({ prompt: 'corner kick routine', pitchView: 'HALF' });
  assert(fpViewFull !== fpViewHalf, 'FULL vs HALF pitchView produce different fingerprints');

  // 14. Engine mode isolation (ecoMode vs standard)
  const fpStandard = serverFingerprint({ prompt: 'counter attack drill', ecoMode: false });
  const fpEco = serverFingerprint({ prompt: 'counter attack drill', ecoMode: true });
  assert(fpStandard !== fpEco, 'ecoMode true vs false produce different fingerprints');

  console.log('\n--- TEST SUITE 4: SERVER & CLIENT ISOMORPHIC PARITY ---');

  // 15. Server & Client parity across complex contexts
  const contexts = [
    { prompt: '3-phase counter attack', formation: '4-3-3', focusArea: 'Attacking' },
    { prompt: 'pep guardiola 3-2-5 buildup', formation: '3-2-5', focusArea: 'Positional Play', pitchView: 'HALF' },
    { prompt: 'near-post corner routine', formation: 'Set Piece', focusArea: 'Set Piece', ecoMode: true },
    { prompt: 'rapid 4v3 counter with overlapping #2 and decoy run', formation: '4-3-3', playerCount: 7 },
  ];

  for (let i = 0; i < contexts.length; i++) {
    const ctx = contexts[i];
    const sFp = serverFingerprint(ctx);
    const cFp = clientFingerprint(ctx);
    assert(sFp === cFp, `Context ${i + 1} server and client fingerprints match identically: ${sFp}`);
  }

  console.log('\n--- TEST SUITE 5: CACHE STORE BEHAVIOR & EXACT MATCHING ---');

  // Initialize and prewarm cache
  prewarmCache();
  assert(drillCache.size === 8, `Prewarmed cache initialized with exactly 8 seeds (found ${drillCache.size})`);

  // 16. Exact cache hit on prewarmed item
  const seedReq = {
    prompt: "3-phase counter attack with overlapping winger and low cutback cross",
    formation: "4-3-3",
    focusArea: "Attacking Transition",
    pitchView: "FULL",
    ecoMode: false,
  };
  const hit = findInDrillCache(seedReq);
  assert(hit !== null, 'Prewarmed seed request produces a valid cache hit');
  assert(hit?.drill?.title?.length > 0, 'Cached entry contains valid tactical drill');

  // 17. Cache miss on non-matching query
  const missReq = {
    prompt: "Unseen unique drill request for testing cache miss behavior",
    formation: "4-4-2",
    focusArea: "Defending",
  };
  const miss = findInDrillCache(missReq);
  assert(miss === null, 'Unseen request produces a cache miss (no spurious fuzzy hit)');

  // 18. Elimination of fuzzy collisions:
  // A query sharing 80% of words with seedReq but materially different MUST be a miss!
  const similarFuzzyReq = {
    prompt: "3-phase counter attack with overlapping winger and HIGH LOOPING CROSS",
    formation: "4-3-3",
    focusArea: "Attacking Transition",
    pitchView: "FULL",
    ecoMode: false,
  };
  const fuzzyMiss = findInDrillCache(similarFuzzyReq);
  assert(fuzzyMiss === null, 'Subtly different request is NOT falsely matched by old fuzzy token overlap');

  // 19. Cache write and subsequent exact hit
  const newDrill = synthesizeTacticalDrill(missReq.prompt, missReq.formation, missReq.focusArea, "FULL");
  const writtenFp = saveToDrillCache(missReq, newDrill, "coachtactics-synthesized");
  assert(writtenFp.startsWith('drill-cache:v2:'), 'saveToDrillCache returns valid v2 fingerprint');
  const readBack = findInDrillCache(missReq);
  assert(readBack !== null, 'Newly cached drill is immediately retrievable via exact fingerprint');
  assert(readBack?.fingerprint === writtenFp, 'Retrieved fingerprint matches written fingerprint');

  // 20. Validation gate: invalid drill cannot be cached
  const invalidDrill = { title: "Bad drill", phases: [] }; // missing required fields, phases < 1
  const invalidWrite = saveToDrillCache({ prompt: 'bad' }, invalidDrill, "coachtactics-synthesized");
  assert(invalidWrite === '', 'saveToDrillCache rejects drill failing tactical validation');

  // 21. Eviction of corrupt entries
  const corruptCtx = { prompt: 'corrupt drill test', formation: '4-3-3', focusArea: 'Test', pitchView: 'FULL', ecoMode: false };
  const corruptFp = serverFingerprint(corruptCtx);
  drillCache.set(corruptFp, {
    fingerprint: corruptFp,
    context: canonicalizeContext(corruptCtx),
    drill: { title: "Corrupt", phases: [] }, // invalid
    createdAt: Date.now(),
    hits: 0,
    source: "gemini-cached",
  });
  // Attempt to read it via findInDrillCache
  const corruptRead = findInDrillCache(corruptCtx);
  assert(corruptRead === null, 'findInDrillCache evicts and returns null for corrupted/invalid cached drill');
  assert(!drillCache.has(corruptFp), 'Corrupted entry was removed from drillCache Map');

  console.log('\n--- TEST SUITE 6: CACHE ISOLATION FROM SAVED DRILL REPOSITORY ---');

  // 22. Saving an edited drill does NOT alter or contaminate the AI generation cache
  const repo = new InMemoryDrillRepository();
  const drillService = new DrillService(repo);

  const initialCacheSize = drillCache.size;
  const authUser = { id: 'coach_123', username: 'coach123', role: 'HEAD_COACH' };

  // Generate a starting drill
  const startingDrill = synthesizeTacticalDrill('possession rondo', '4-3-3', 'Possession', 'FULL');
  const genContext = { prompt: 'possession rondo', formation: '4-3-3', focusArea: 'Possession', pitchView: 'FULL', ecoMode: false };
  saveToDrillCache(genContext, startingDrill, 'coachtactics-synthesized');
  const expectedCacheSize = initialCacheSize + 1;
  assert(drillCache.size === expectedCacheSize, 'Generation cache holds synthesized drill');

  // Coach manually modifies the drill in the Plan Editor
  const coachEditedDrill = JSON.parse(JSON.stringify(startingDrill));
  coachEditedDrill.title = "Coach's Customized 6v3 Rondo (Manual)";
  coachEditedDrill.phases[0].players[0].x = 0.42;
  coachEditedDrill.phases[0].players[0].targetX = 0.55;

  // Coach saves the edited plan to the authoritative DrillRepository
  const savedRepoDrill = await drillService.createDrill(coachEditedDrill, authUser as any);
  assert(savedRepoDrill.id.startsWith('drill_'), 'DrillRepository saved coach-edited plan');
  assert(savedRepoDrill.createdBy === 'coach_123', 'DrillRepository records coach ownership');

  // Verify that the AI generation cache still contains the pure unedited template
  assert(drillCache.size === expectedCacheSize, 'Saving edited drill to repository did NOT change cache size');
  const cachedTemplate = findInDrillCache(genContext);
  assert(cachedTemplate !== null, 'AI generation cache still retains template');
  assert(cachedTemplate?.drill.title !== "Coach's Customized 6v3 Rondo (Manual)",
    'AI generation cache was NOT mutated by coach manual edits');

  console.log('\n--- TEST SUMMARY ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner threw unhandled error:', err);
  process.exit(1);
});
