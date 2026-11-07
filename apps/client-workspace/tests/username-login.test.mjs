import assert from 'node:assert/strict';
import test from 'node:test';
import { parseClientLoginCredentials, resolveUsernameLogin, matchesUsernameLoginIdentity } from '../src/lib/username-login.ts';
import { handleClientLogin } from '../src/lib/client-login.ts';
import { isAllowedPasswordLoginOrigin } from '../src/lib/password-login.ts';
import { dashboardDestination } from '../src/lib/login-destination.ts';

const ownerId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const owner = { id: ownerId, email: 'owner@example.com', email_confirmed_at: '2026-10-28' };
const request = (body, origin = 'https://emberweb.co.za') => new Request('https://emberweb.co.za/api/account/login', { method: 'POST', headers: { origin, 'x-real-ip': '203.0.113.8' }, body: JSON.stringify(body) });
const deps = (overrides = {}) => ({
  nodeEnv: 'production', isAllowedOrigin: isAllowedPasswordLoginOrigin,
  parseCredentials: parseClientLoginCredentials, readBody: req => req.text(),
  checkRateLimits: async () => true, checkCanonicalEmailRateLimit: async () => true,
  resolveUsername: async () => ({ userId: ownerId, email: owner.email }),
  dummyAuthenticate: async () => {}, authenticate: async () => '/account',
  ...overrides,
});

test('email and username identities normalize independently and preserve the password', () => {
  assert.deepEqual(parseClientLoginCredentials(JSON.stringify({ identifier: ' Josh ', password: ' spaced password ' })), { kind: 'username', identifier: 'josh', password: ' spaced password ' });
  for (const field of ['email', 'identifier']) {
    assert.deepEqual(parseClientLoginCredentials(JSON.stringify({ [field]: ' JOSH@example.com ', password: 'secret' })), { kind: 'email', identifier: 'josh@example.com', password: 'secret' });
  }
  assert.equal(parseClientLoginCredentials(JSON.stringify({ email: 'Josh', password: 'secret' })), null);
});

test('ambiguous, unsafe or role-bearing inputs are rejected before directory or auth work', async () => {
  const invalid = [
    { identifier: 'josh', email: 'owner@example.com', password: 'secret' },
    { identifier: 'josh', password: 'secret', role: 'admin' },
    { identifier: 'josh', password: 'secret', userId: ownerId },
    { identifier: 'josh', password: 'secret', next: '/admin' },
    ...['ab', '.josh', 'josh smith', 'josh@example', 'josh@example.com@evil.test', 'josh/../../admin', 'Kosh', 'jósh', 'j'.repeat(33)].map(identifier => ({ identifier, password: 'secret' })),
    { identifier: 'josh', password: '' }, { identifier: 'josh', password: 'x'.repeat(1025) },
  ];
  for (const body of invalid) {
    let calls = 0;
    const result = await handleClientLogin(request(body), deps({ checkRateLimits: async () => { calls++; return true; }, resolveUsername: async () => { calls++; return null; }, authenticate: async () => { calls++; return '/admin'; } }));
    assert.equal(result.status, 400, JSON.stringify(body).slice(0, 90));
    assert.equal(calls, 0);
  }
});

test('username resolution requires the mapped confirmed Auth UUID and derives its current canonical email', async () => {
  const calls = [];
  const resolved = await resolveUsernameLogin('josh', {
    findUserId: async name => { calls.push(['lookup', name]); return ownerId; },
    getUserById: async id => { calls.push(['auth-user', id]); return { ...owner, email: ' OWNER@example.com ' }; },
  });
  assert.deepEqual(resolved, { userId: ownerId, email: owner.email });
  assert.deepEqual(calls, [['lookup', 'josh'], ['auth-user', ownerId]]);
  for (const user of [null, { ...owner, id: clientId }, { ...owner, email_confirmed_at: null }, { ...owner, email: null }, { ...owner, email: 'invalid' }]) {
    assert.equal(await resolveUsernameLogin('josh', { findUserId: async () => ownerId, getUserById: async () => user }), null);
  }
  let queried = false;
  assert.equal(await resolveUsernameLogin('Josh', { findUserId: async () => { queried = true; return ownerId; }, getUserById: async () => owner }), null);
  assert.equal(queried, false);
});

test('the normalized input and IP gate precede lookup, then the canonical email gate precedes password auth', async () => {
  const calls = [];
  const result = await handleClientLogin(request({ identifier: ' Josh ', password: 'password' }), deps({
    checkRateLimits: async (identifier, incoming) => { calls.push(['input+ip', identifier, incoming.headers.get('x-real-ip')]); return true; },
    resolveUsername: async name => { calls.push(['lookup', name]); return { userId: ownerId, email: owner.email }; },
    checkCanonicalEmailRateLimit: async email => { calls.push(['canonical', email]); return true; },
    authenticate: async (credentials, expectedId) => { calls.push(['password', credentials, expectedId]); return '/admin'; },
  }));
  assert.deepEqual(result, { status: 200, body: { next: '/admin' } });
  assert.deepEqual(calls, [
    ['input+ip', 'josh', '203.0.113.8'], ['lookup', 'josh'], ['canonical', owner.email],
    ['password', { email: owner.email, password: 'password' }, ownerId],
  ]);
});

test('direct email never queries aliases or charges the canonical bucket a second time', async () => {
  const calls = [];
  const result = await handleClientLogin(request({ identifier: ' JOSH@example.com ', password: 'password' }), deps({
    checkRateLimits: async identifier => { calls.push(['limit', identifier]); return true; },
    resolveUsername: async () => { throw new Error('Email must not query aliases'); },
    checkCanonicalEmailRateLimit: async () => { throw new Error('Double charged'); },
    authenticate: async (credentials, expectedId) => { calls.push(['auth', credentials.email, expectedId]); return '/account'; },
  }));
  assert.equal(result.status, 200);
  assert.deepEqual(calls, [['limit', 'josh@example.com'], ['auth', 'josh@example.com', null]]);
});

test('prelookup and canonical rate limits both stop auth and outages fail closed', async () => {
  let lookups = 0;
  let auth = 0;
  const shared = { resolveUsername: async () => { lookups++; return { userId: ownerId, email: owner.email }; }, authenticate: async () => { auth++; return '/admin'; } };
  assert.equal((await handleClientLogin(request({ identifier: 'josh', password: 'secret' }), deps({ ...shared, checkRateLimits: async () => false }))).status, 429);
  assert.equal(lookups, 0);
  assert.equal((await handleClientLogin(request({ identifier: 'josh', password: 'secret' }), deps({ ...shared, checkCanonicalEmailRateLimit: async () => false }))).status, 429);
  assert.equal(lookups, 1);
  assert.equal((await handleClientLogin(request({ identifier: 'josh', password: 'secret' }), deps({ ...shared, checkRateLimits: async () => { throw new Error('offline'); } }))).status, 503);
  assert.equal(auth, 0);
});

test('unknown aliases execute only dummy auth and share the invalid-password response even if dummy auth returns a destination', async () => {
  let dummy = 0;
  let real = 0;
  const body = { identifier: 'unknown-person', password: 'secret' };
  const unknown = await handleClientLogin(request(body), deps({ resolveUsername: async () => null, dummyAuthenticate: async () => { dummy++; return '/admin'; }, authenticate: async () => { real++; return '/admin'; } }));
  const invalid = await handleClientLogin(request({ identifier: 'known-person', password: 'bad' }), deps({ authenticate: async () => null }));
  assert.deepEqual(unknown, invalid);
  assert.equal(dummy, 1);
  assert.equal(real, 0);
  assert.deepEqual(await handleClientLogin(request(body), deps({ resolveUsername: async () => null, dummyAuthenticate: async () => { throw new Error('private auth detail'); } })), unknown);
});

test('an alias cannot authenticate a different UUID or infer a staff role from its name/metadata', async () => {
  const client = { id: clientId, email: 'client@example.com', email_confirmed_at: '2026-10-28', user_metadata: { role: 'admin' } };
  assert.equal(matchesUsernameLoginIdentity(client, ownerId), false);
  assert.equal(matchesUsernameLoginIdentity(null, ownerId), false);
  assert.equal(matchesUsernameLoginIdentity(client, clientId), true);
  const result = await handleClientLogin(request({ identifier: 'super-admin', password: 'secret' }), deps({
    resolveUsername: async () => ({ userId: clientId, email: client.email }),
    authenticate: async (_credentials, expectedId) => matchesUsernameLoginIdentity(client, expectedId) ? dashboardDestination(client, [owner.email]) : null,
  }));
  assert.deepEqual(result, { status: 200, body: { next: '/account' } });
});
