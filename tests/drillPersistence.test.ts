// Automated Server-Side Drill Persistence & Authoritative Ownership Test Suite
import { InMemoryDrillRepository } from '../server/drills/drillRepository.ts';
import { DrillService, NotFoundError, ForbiddenError, ValidationError } from '../server/drills/drillService.ts';
import { SafeUser } from '../server/auth/userService.ts';
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

async function runTests() {
  console.log('\n========================================================');
  console.log('  CoachTactics Phase 4: Drill Persistence & Ownership');
  console.log('========================================================\n');

  const repo = new InMemoryDrillRepository();
  const service = new DrillService(repo);

  const coachPep: SafeUser = {
    id: 'coach_pep',
    username: 'pepguardiola',
    name: 'Coach Pep',
    role: 'HEAD_COACH',
    team: 'Elite FC',
    avatarColor: '#00E676',
    email: 'pep@tactics.club',
    needsEmailSetup: false,
  };

  const coachKlopp: SafeUser = {
    id: 'coach_klopp',
    username: 'jklopp',
    name: 'Coach Jurgen',
    role: 'HEAD_COACH',
    team: 'Reds FC',
    avatarColor: '#FF1744',
    email: 'klopp@tactics.club',
    needsEmailSetup: false,
  };

  const clientUser: SafeUser = {
    id: 'user_client_42',
    username: 'c00ldude',
    name: 'Cool Dude',
    role: 'CLIENT',
    team: 'Academy Client',
    avatarColor: '#FFD600',
    email: 'client@example.com',
    needsEmailSetup: false,
  };

  const superAdmin: SafeUser = {
    id: 'user_superadmin',
    username: 'heavylaws',
    name: 'HeavyLaws (Super Admin)',
    role: 'SUPER_ADMIN',
    team: 'Tactical HQ',
    avatarColor: '#00E5FF',
    email: 'admin@tactics.club',
    needsEmailSetup: false,
  };

  // Helper valid drill payload
  const validTacticalDrill = synthesizeTacticalDrill(
    'Midfield Triangle Overload with Blindside Cut',
    '4-3-3',
    'Positional Play',
    'FULL'
  );

  console.log('--- TEST GROUP 1: REPOSITORY INITIALIZATION & SYSTEM PRESETS ---');
  const systemDrills = await repo.findSystemDrills();
  assert(systemDrills.length === 3, 'Repository pre-seeds exactly 3 canonical system demo drills');
  assert(systemDrills.every((d) => d.isSystem === true), 'All seeded drills have isSystem: true');
  assert(systemDrills.every((d) => d.createdBy === 'system'), 'All seeded drills have createdBy: "system"');

  console.log('\n--- TEST GROUP 2: ROLE-BASED DRILL VISIBILITY ---');
  const clientInitialDrills = await service.getDrillsForUser(clientUser);
  assert(
    clientInitialDrills.length === 0,
    'Client user initially receives 0 drills (clean start, no unauthorized system/coach data)',
    `Got count: ${clientInitialDrills.length}`
  );

  const coachInitialDrills = await service.getDrillsForUser(coachPep);
  assert(
    coachInitialDrills.length === 3,
    'Coach user initially sees the 3 system reference drills',
    `Got count: ${coachInitialDrills.length}`
  );

  const superAdminInitialDrills = await service.getDrillsForUser(superAdmin);
  assert(
    superAdminInitialDrills.length >= 3,
    'Super Admin can inspect all drills in the tactical repository'
  );

  console.log('\n--- TEST GROUP 3: SERVER-AUTHORITATIVE DRILL CREATION ---');
  const createdDrill = await service.createDrill(validTacticalDrill, coachPep);
  assert(!!createdDrill.id, 'Server assigns an authoritative drill ID');
  assert(createdDrill.createdBy === coachPep.id, 'createdBy is strictly set from authenticated server identity');
  assert(createdDrill.createdByUsername === coachPep.username, 'createdByUsername is recorded server-side');
  assert(createdDrill.createdByRole === 'HEAD_COACH', 'createdByRole is recorded server-side');
  assert(createdDrill.version === 1, 'Initial version is set to 1');
  assert(createdDrill.isSystem === false, 'User-created drill has isSystem: false');
  assert(!isNaN(Date.parse(createdDrill.createdAt)), 'createdAt is a valid ISO 8601 server timestamp');

  // Verify coach now sees 3 system + 1 custom drill
  const coachDrillsAfterCreate = await service.getDrillsForUser(coachPep);
  assert(
    coachDrillsAfterCreate.length === 4,
    'Coach sees 4 drills after creating one (3 system + 1 custom)'
  );

  // Client creates a drill
  const clientDrill = await service.createDrill(
    {
      ...validTacticalDrill,
      title: 'Client Practice Plan',
    },
    clientUser
  );
  assert(clientDrill.createdBy === clientUser.id, 'Client drill createdBy belongs to client');

  const clientDrillsAfterCreate = await service.getDrillsForUser(clientUser);
  assert(
    clientDrillsAfterCreate.length === 1 && clientDrillsAfterCreate[0].id === clientDrill.id,
    'Client now sees exactly their 1 own created drill'
  );

  console.log('\n--- TEST GROUP 4: SPOOFING RESISTANCE ON CREATION ---');
  // Attacker client attempts to inject ownership metadata in body
  const spoofedPayload = {
    ...validTacticalDrill,
    title: 'Hacked Admin Drill',
    createdBy: 'user_superadmin',
    createdByUsername: 'superadmin',
    createdByRole: 'SUPER_ADMIN',
    ownerId: 'user_superadmin',
    isSystem: true,
    version: 999,
    createdAt: '1970-01-01T00:00:00.000Z',
  };

  const createdSpoofed = await service.createDrill(spoofedPayload, clientUser);
  assert(
    createdSpoofed.createdBy === clientUser.id,
    'Server rejects client-supplied createdBy and binds to authenticated client'
  );
  assert(
    createdSpoofed.createdByRole === clientUser.role,
    'Server rejects client-supplied createdByRole'
  );
  assert(
    createdSpoofed.isSystem === false,
    'Server rejects client-supplied isSystem: true flag'
  );
  assert(
    createdSpoofed.version === 1,
    'Server rejects client-supplied version: 999'
  );
  assert(
    Date.parse(createdSpoofed.createdAt) > Date.parse('2026-01-01'),
    'Server rejects client-supplied 1970 createdAt timestamp'
  );

  console.log('\n--- TEST GROUP 5: TACTICAL DOMAIN VALIDATION GATE ---');
  let rejectedOutOfBounds = false;
  try {
    const invalidDrill = JSON.parse(JSON.stringify(validTacticalDrill));
    invalidDrill.phases[0].players[0].x = 1.95; // Out of bounds!
    await service.createDrill(invalidDrill, coachPep);
  } catch (err) {
    if (err instanceof ValidationError) {
      rejectedOutOfBounds = true;
    }
  }
  assert(rejectedOutOfBounds, 'Persistence layer rejects drill with out-of-bounds coordinates (x=1.95)');

  let rejectedEmptyPhases = false;
  try {
    const invalidDrill = JSON.parse(JSON.stringify(validTacticalDrill));
    invalidDrill.phases = [];
    await service.createDrill(invalidDrill, coachPep);
  } catch (err) {
    if (err instanceof ValidationError) {
      rejectedEmptyPhases = true;
    }
  }
  assert(rejectedEmptyPhases, 'Persistence layer rejects drill with 0 phases');

  console.log('\n--- TEST GROUP 6: ACCESS CONTROL BY ID & RESOURCE HIDING ---');
  // Coach Pep can read their own drill
  const fetchedPepDrill = await service.getDrillById(createdDrill.id, coachPep);
  assert(fetchedPepDrill.id === createdDrill.id, 'Drill owner can read their own drill');

  // Coach Klopp cannot read Coach Pep's private drill (throws NotFoundError to hide existence)
  let kloppBlocked = false;
  try {
    await service.getDrillById(createdDrill.id, coachKlopp);
  } catch (err) {
    if (err instanceof NotFoundError) {
      kloppBlocked = true;
    }
  }
  assert(kloppBlocked, 'Non-owner coach receives 404 NotFoundError attempting to read private drill');

  // Super Admin can read any private drill
  const adminFetched = await service.getDrillById(createdDrill.id, superAdmin);
  assert(adminFetched.id === createdDrill.id, 'Super Admin can access any drill for administrative support');

  console.log('\n--- TEST GROUP 7: SERVER-AUTHORITATIVE UPDATES ---');
  // Owner updates title and coaching cues
  const updatedDrill = await service.updateDrill(
    createdDrill.id,
    {
      title: 'Updated Tactical Concept v2',
      coachingCues: ['Updated cue 1', 'Updated cue 2'],
    },
    coachPep
  );
  assert(updatedDrill.title === 'Updated Tactical Concept v2', 'Owner can update mutable fields');
  assert(updatedDrill.version === 2, 'Server increments version counter to 2 on update');
  assert(updatedDrill.updatedBy === coachPep.id, 'updatedBy set to authenticated user ID');
  assert(updatedDrill.createdBy === coachPep.id, 'Original immutable createdBy preserved');
  assert(updatedDrill.createdAt === createdDrill.createdAt, 'Original immutable createdAt preserved');

  // Non-owner attempts to update drill
  let nonOwnerUpdateBlocked = false;
  try {
    await service.updateDrill(createdDrill.id, { title: 'Malicious Overwrite' }, coachKlopp);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      nonOwnerUpdateBlocked = true;
    }
  }
  assert(nonOwnerUpdateBlocked, 'Non-owner cannot update drill (rejected with ForbiddenError)');

  // Coach attempts to mutate a system demo drill
  let systemDrillUpdateBlocked = false;
  try {
    await service.updateDrill('drill_overlap_wing', { title: 'Overwritten System Drill' }, coachPep);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      systemDrillUpdateBlocked = true;
    }
  }
  assert(systemDrillUpdateBlocked, 'Regular coach cannot modify system reference drills');

  // Update with invalid tactical content fails
  let invalidUpdateBlocked = false;
  try {
    await service.updateDrill(
      createdDrill.id,
      {
        phases: [
          {
            step: 1,
            title: 'Corrupted Phase',
            instruction: 'Bad coords',
            durationSec: 2.0,
            players: [], // Invalid: no players
            ball: { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, trajectory: 'GROUND_PASS' },
          },
        ],
      },
      coachPep
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      invalidUpdateBlocked = true;
    }
  }
  assert(invalidUpdateBlocked, 'Drill update fails if tactical validation fails');

  console.log('\n--- TEST GROUP 8: DELETION AND IMMUTABILITY ---');
  // Non-owner cannot delete
  let deleteBlocked = false;
  try {
    await service.deleteDrill(createdDrill.id, coachKlopp);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      deleteBlocked = true;
    }
  }
  assert(deleteBlocked, 'Non-owner cannot delete drill');

  // Cannot delete system drill
  let systemDeleteBlocked = false;
  try {
    await service.deleteDrill('drill_overlap_wing', coachPep);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      systemDeleteBlocked = true;
    }
  }
  assert(systemDeleteBlocked, 'Regular coach cannot delete system reference drills');

  // Owner can delete own drill
  const deleted = await service.deleteDrill(createdDrill.id, coachPep);
  assert(deleted === true, 'Owner can delete their own drill');

  // Fetch after delete returns 404
  let fetchDeletedFailed = false;
  try {
    await service.getDrillById(createdDrill.id, coachPep);
  } catch (err) {
    if (err instanceof NotFoundError) {
      fetchDeletedFailed = true;
    }
  }
  assert(fetchDeletedFailed, 'Fetching deleted drill throws NotFoundError');

  console.log('\n--- TEST GROUP 9: LOCALSTORAGE MIGRATION ---');
  const legacyDrillBatch = [
    {
      ...validTacticalDrill,
      id: 'local_drill_1',
      title: 'Legacy Offline Drill 1',
    },
    {
      ...validTacticalDrill,
      id: 'local_drill_2',
      title: 'Legacy Offline Drill 2',
    },
    {
      title: 'Corrupted Legacy Drill',
      phases: [], // Invalid
    },
  ];

  const migrationResult = await service.migrateLegacyDrills(legacyDrillBatch, coachPep);
  assert(migrationResult.imported === 2, 'Migration successfully imports 2 valid drills', `Got: ${migrationResult.imported}`);
  assert(migrationResult.failed === 1, 'Migration safely skips 1 corrupted drill without crashing', `Got: ${migrationResult.failed}`);
  assert(
    migrationResult.drills.every((d) => d.createdBy === coachPep.id),
    'Migrated drills are authoritatively bound to the authenticated user ID'
  );

  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
