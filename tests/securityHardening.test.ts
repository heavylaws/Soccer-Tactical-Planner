/**
 * CoachTactics v2.1.0 — security & robustness regression tests.
 * Exercises the real Express app over HTTP (no frontend) plus the pure modules.
 */
import fs from 'fs';
import path from 'path';
import type { AddressInfo } from 'net';

// Configure BEFORE importing app modules (config is read at import time).
process.env.NODE_ENV = 'test';
process.env.STORAGE_DRIVER = 'memory';
process.env.ADMIN_USERNAME = 'rootadmin';
process.env.ADMIN_PASSWORD = 'Test-Admin-Password-2026';
process.env.GEMINI_API_KEY = '';
process.env.MAX_CACHED_DRILLS = '20';

let passed = 0;
let failed = 0;
function assert(cond: unknown, name: string, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
  }
}

async function main() {
  const { createApp, drillCache, prewarmCache, saveToDrillCache, findInDrillCache } = await import('../server.ts');
  const { validateTacticalDrill } = await import('../server/tactical/tacticalValidator.ts');
  const { repairAiDrill } = await import('../server/tactical/aiDrillRepair.ts');
  const { applyFastChange } = await import('../server/tactical/fastChanges.ts');
  const { synthesizeTacticalDrill } = await import('../server/tactical/tacticalSynthesizer.ts');

  const app = await createApp({ withFrontend: false });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function api(method: string, url: string, body?: unknown, token?: string, rawBody?: string) {
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body !== undefined || rawBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON */
    }
    return { status: res.status, json, headers: res.headers };
  }

  async function login(username: string, password: string) {
    return api('POST', '/api/auth/login', { username, password });
  }

  try {
    console.log('\n--- 1. No credentials in source ---');
    const roots = ['server', 'src', 'server.ts'];
    const offenders: string[] = [];
    const walk = (p: string) => {
      const full = path.resolve(p);
      if (fs.statSync(full).isDirectory()) fs.readdirSync(full).forEach((f) => walk(path.join(p, f)));
      else if (/\.(ts|tsx)$/.test(p)) {
        const text = fs.readFileSync(full, 'utf8');
        if (/plainPassword:\s*['"][^'"]+['"]/.test(text) || /handleQuickFill/.test(text) || /\|\|\s*['"]123456['"]/.test(text)) {
          offenders.push(p);
        }
      }
    };
    roots.forEach(walk);
    assert(offenders.length === 0, 'No hardcoded passwords, quick-fill logins or default passwords', offenders);

    console.log('\n--- 2. Bootstrap admin & login ---');
    const bad = await login('rootadmin', 'wrong-password-xx');
    assert(bad.status === 401, 'Wrong password → 401');
    assert(bad.json?.error === 'Invalid username or password.', 'Generic error message (no enumeration)');
    const unknown = await login('nobody-here', 'whatever-password');
    assert(unknown.status === 401 && unknown.json?.error === bad.json?.error, 'Unknown user gets identical response');
    const ok = await login('rootadmin', 'Test-Admin-Password-2026');
    assert(ok.status === 200 && ok.json?.token, 'Admin from ADMIN_PASSWORD can log in');
    assert(ok.json?.user?.passwordHash === undefined, 'Login response has no password hash');
    const adminToken: string = ok.json.token;
    const me = await api('GET', '/api/auth/me', undefined, adminToken);
    assert(me.status === 200 && me.json?.user?.role === 'SUPER_ADMIN', 'Bearer token authenticates /me');

    console.log('\n--- 3. Password policy ---');
    const noPw = await api('POST', '/api/users', { username: 'coach_nopw', role: 'HEAD_COACH' }, adminToken);
    assert(noPw.status === 400, 'Create user without password → 400 (no default password)');
    const shortPw = await api('POST', '/api/users', { username: 'coach_short', password: 'abc123', role: 'HEAD_COACH' }, adminToken);
    assert(shortPw.status === 400, 'Password shorter than 10 chars → 400');
    const badRole = await api('POST', '/api/users', { username: 'coach_role', password: 'Long-Enough-Pass-1', role: 'GOD_MODE' }, adminToken);
    assert(badRole.status === 400, 'Unknown role → 400');
    const badName = await api('POST', '/api/users', { username: '../etc', password: 'Long-Enough-Pass-1' }, adminToken);
    assert(badName.status === 400, 'Invalid username characters → 400');

    console.log('\n--- 4. Session revocation ---');
    const coach = await api('POST', '/api/users', { username: 'coach_a', password: 'Coach-A-Password-1', role: 'HEAD_COACH' }, adminToken);
    assert(coach.status === 201, 'Admin creates coach');
    const coachLogin = await login('coach_a', 'Coach-A-Password-1');
    const coachToken: string = coachLogin.json?.token;
    assert((await api('GET', '/api/auth/me', undefined, coachToken)).status === 200, 'Coach token valid before reset');
    const reset = await api('PUT', `/api/users/${coach.json.user.id}`, { password: 'Coach-A-Password-2' }, adminToken);
    assert(reset.status === 200 && reset.json?.sessionsRevoked === true, 'Admin resets coach password');
    assert((await api('GET', '/api/auth/me', undefined, coachToken)).status === 401, 'Old coach token rejected after password reset');
    const coachLogin2 = await login('coach_a', 'Coach-A-Password-2');
    const coachToken2: string = coachLogin2.json?.token;
    assert(coachLogin2.status === 200, 'Coach logs in with new password');

    console.log('\n--- 5. Admin safety rails ---');
    const adminId = ok.json.user.id;
    assert((await api('DELETE', `/api/users/${adminId}`, undefined, adminToken)).status === 403, 'Admin cannot delete own account');
    assert((await api('PUT', `/api/users/${adminId}`, { role: 'CLIENT' }, adminToken)).status === 403, 'Admin cannot demote self');
    assert((await api('GET', '/api/users', undefined, coachToken2)).status === 403, 'Coach cannot list users');
    const selfReset = await api('PUT', `/api/users/${adminId}`, { password: 'Test-Admin-Password-2027' }, adminToken);
    assert(selfReset.status === 200 && typeof selfReset.json?.token === 'string', 'Admin changing own password gets a fresh token');
    const adminToken2: string = selfReset.json.token;
    assert((await api('GET', '/api/auth/me', undefined, adminToken2)).status === 200, 'Fresh admin token works');

    console.log('\n--- 6. PLAYER is read-only on the server ---');
    await api('POST', '/api/users', { username: 'player_a', password: 'Player-A-Password-1', role: 'PLAYER' }, adminToken2);
    const playerToken: string = (await login('player_a', 'Player-A-Password-1')).json?.token;
    const sample = synthesizeTacticalDrill('counter attack', '4-3-3', 'Attacking Transition', 'FULL');
    assert((await api('GET', '/api/drills', undefined, playerToken)).status === 200, 'Player can list drills');
    assert((await api('POST', '/api/drills', sample, playerToken)).status === 403, 'Player cannot create drills');
    assert((await api('POST', '/api/generate-drill', { prompt: 'rondo' }, playerToken)).status === 403, 'Player cannot spend AI quota');
    assert(
      (await api('POST', '/api/fast-change', { drill: sample, changeType: 'Add 2 Mini-Goals' }, playerToken)).status === 403,
      'Player cannot use fast changes'
    );

    console.log('\n--- 7. Cache endpoints ---');
    assert((await api('GET', '/api/cache-stats')).status === 401, 'cache-stats requires login');
    assert((await api('POST', '/api/clear-cache', {}, coachToken2)).status === 403, 'Coach cannot clear global cache');
    assert((await api('POST', '/api/clear-cache', {}, adminToken2)).status === 200, 'Super admin can clear cache');
    const health = await api('GET', '/api/health');
    assert(health.status === 200 && health.json?.geminiKeyConfigured === undefined, 'Health endpoint reveals no configuration');

    console.log('\n--- 8. Generation without a Gemini key ---');
    const gen = await api('POST', '/api/generate-drill', { prompt: 'unique overload drill xyz', ecoMode: false }, coachToken2);
    assert(gen.status === 200 && gen.json?.isTacticalFallback === true, 'Falls back to offline engine');
    assert(gen.json?.fallbackReason === 'NO_API_KEY', 'Fallback reason is reported to the client');
    const gen2 = await api('POST', '/api/generate-drill', { prompt: 'unique overload drill xyz', ecoMode: false }, coachToken2);
    assert(gen2.json?.cached === true && gen2.json?.isTacticalFallback === true, 'Cached fallback is still labelled as fallback');
    const longPrompt = await api('POST', '/api/generate-drill', { prompt: 'x'.repeat(1001) }, coachToken2);
    assert(longPrompt.status === 400, 'Prompt over 1000 chars → 400');

    console.log('\n--- 9. HTTP hardening ---');
    assert(!health.headers.get('x-powered-by'), 'X-Powered-By removed');
    assert(health.headers.get('x-content-type-options') === 'nosniff', 'nosniff header set');
    assert(health.headers.get('cache-control') === 'no-store', 'API responses are no-store');
    const badJson = await api('POST', '/api/auth/login', undefined, undefined, '{not json');
    assert(badJson.status === 400 && badJson.json?.error, 'Malformed JSON → 400 JSON error');
    const unknownApi = await api('GET', '/api/does-not-exist');
    assert(unknownApi.status === 404 && unknownApi.json?.error, 'Unknown API route → JSON 404');

    console.log('\n--- 10. Login rate limiting ---');
    await api('POST', '/api/users', { username: 'victim_a', password: 'Victim-A-Password-1', role: 'CLIENT' }, adminToken2);
    let lastStatus = 0;
    for (let i = 0; i < 9; i++) lastStatus = (await login('victim_a', `wrong-${i}-password`)).status;
    assert(lastStatus === 429, '9th consecutive failure for one username → 429', lastStatus);
    const blockedCorrect = await login('victim_a', 'Victim-A-Password-1');
    assert(blockedCorrect.status === 429, 'Correct password is also blocked during lockout');

    console.log('\n--- 11. Validator limits ---');
    const base = synthesizeTacticalDrill('limits', '4-3-3', 'Test', 'FULL');
    const manyPhases = { ...base, phases: Array.from({ length: 13 }, (_, i) => ({ ...base.phases[0], step: i + 1 })) };
    assert(validateTacticalDrill(manyPhases).errors?.some((e) => e.code === 'TOO_MANY_PHASES'), '13 phases rejected');
    const manyPlayers = {
      ...base,
      phases: [{ ...base.phases[0], players: Array.from({ length: 31 }, (_, i) => ({ ...base.phases[0].players[0], id: `p${i}` })) }],
    };
    assert(validateTacticalDrill(manyPlayers).errors?.some((e) => e.code === 'TOO_MANY_PLAYERS'), '31 players rejected');
    const longTitle = validateTacticalDrill({ ...base, title: 'T'.repeat(500) });
    assert(longTitle.errors?.some((e) => e.code === 'VALUE_TOO_LONG'), 'Oversized title rejected');
    const echoed = validateTacticalDrill({ ...base, phases: 'x'.repeat(5000) });
    assert(JSON.stringify(echoed.errors).length < 1000, 'Error payloads do not echo large input');

    console.log('\n--- 12. AI output repair ---');
    const messy = {
      title: 'Messy AI drill',
      category: 'Test',
      focusArea: 'Test',
      durationMinutes: '15',
      pitchView: 'full',
      description: 'desc',
      coachingCues: ['cue'],
      phases: [
        {
          step: 0,
          title: 'P1',
          instruction: 'go',
          durationSec: 3,
          players: [
            { id: 'a', number: 8, role: 'Attacker', x: 1.02, y: 50, targetX: 0.5, targetY: -0.1, label: 'CM #8', hasBall: true },
            { id: 'a', number: 4, role: 'DEFENDER', x: 0.4, y: 0.4, targetX: 0.4, targetY: 0.4, label: 'CB #4' },
            { id: 'z', number: 1, role: 'ALIEN', x: 0.5, y: 0.1, targetX: 0.5, targetY: 0.1, label: '??' },
          ],
          ball: { x: 0.5, y: 0.5, targetX: 0.6, targetY: 0.4, trajectory: 'cross' },
          equipment: [{ id: 'c', type: 'marker', x: 0.3, y: 0.3 }],
        },
      ],
    };
    const repaired = validateTacticalDrill(repairAiDrill(messy));
    assert(repaired.success, 'Repaired AI output passes strict validation', repaired.errors);
    const ph = repaired.drill?.phases[0];
    assert(ph?.players.length === 2, 'Player with unknown role is dropped');
    assert(ph?.players[0].x === 0.98 && ph?.players[0].y === 0.5, 'Out-of-range and percent coordinates normalized');
    assert(ph?.players[0].id !== ph?.players[1].id, 'Duplicate player ids made unique');
    assert(ph?.ball.trajectory === 'AERIAL_PASS' && ph?.equipment?.[0].type === 'CONE', 'Synonyms mapped to enums');
    assert(ph?.step === 1, 'Phase steps renumbered from 1');

    console.log('\n--- 13. Fast changes ---');
    const withNo20 = JSON.parse(JSON.stringify(base));
    withNo20.phases.forEach((p: any) => p.players.push({ id: 'w20', number: 20, role: 'ATTACK', x: 0.3, y: 0.5, targetX: 0.3, targetY: 0.5, label: 'LW #20' }));
    const overlap = applyFastChange(withNo20, 'Fullback Overlap');
    const w20 = overlap.drill.phases[0].players.find((p: any) => p.id === 'w20');
    assert(w20.targetX === 0.3, 'Fullback Overlap no longer moves #20–#29');
    const once = applyFastChange(base, 'Add 2 Mini-Goals').drill;
    const twice = applyFastChange(once, 'Add 2 Mini-Goals');
    assert(twice.changed === false && twice.drill.phases[0].equipment.length === once.phases[0].equipment.length, 'Mini-goals are idempotent');
    assert(validateTacticalDrill(applyFastChange(base, '+1 Defender Press').drill).success, '+1 Defender Press output is valid');

    console.log('\n--- 14. Generation cache bounds ---');
    prewarmCache();
    const ctx = { prompt: 'ttl test', formation: '4-3-3', focusArea: 'X', pitchView: 'FULL', ecoMode: false };
    saveToDrillCache(ctx, base, 'coachtactics-fallback', 1);
    await new Promise((r) => setTimeout(r, 10));
    assert(findInDrillCache(ctx) === null, 'Expired fallback entry is not served');
    for (let i = 0; i < 40; i++) saveToDrillCache({ ...ctx, prompt: `fill ${i}` }, base, 'gemini-cached');
    assert(drillCache.size <= 20, 'Cache size capped (MAX_CACHED_DRILLS=20)', drillCache.size);
    const prewarmedLeft = [...drillCache.values()].filter((e) => e.source === 'coachtactics-prewarmed').length;
    assert(prewarmedLeft === 8, 'Prewarmed seeds survive eviction', prewarmedLeft);
  } finally {
    server.close();
  }

  console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
