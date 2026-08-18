const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

function base64urlEncode(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecode(value) {
  const padded = String(value).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - String(value).length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

async function createSession(user, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64urlEncode(JSON.stringify({
    sub: user.id,
    email: user.email,
    nickname: user.nickname,
    name: user.full_name,
    iat: now,
    exp: now + SESSION_LIFETIME_SECONDS
  }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${base64urlEncode(await hmac(unsigned, secret))}`;
}

async function readSession(request, secret) {
  const token = parseCookies(request.headers.get('Cookie')).ultravis_session;
  if (!token || !secret) return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  const expected = await hmac(`${header}.${payload}`, secret);
  let received;
  let claims;
  try {
    received = base64urlDecode(signature);
    claims = JSON.parse(decoder.decode(base64urlDecode(payload)));
  } catch {
    return null;
  }
  if (!safeEqual(expected, received) || !claims.exp || Number(claims.exp) <= Math.floor(Date.now() / 1000)) return null;
  return claims;
}

function parseCookies(header = '') {
  return String(header || '').split(';').reduce((cookies, pair) => {
    const index = pair.indexOf('=');
    if (index < 0) return cookies;
    cookies[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim());
    return cookies;
  }, {});
}

function sessionCookie(token) {
  return `ultravis_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_LIFETIME_SECONDS}`;
}

function expiredSessionCookie() {
  return 'ultravis_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

function redirect(url, status = 302, headers = {}) {
  return new Response(null, { status, headers: { Location: url, ...headers } });
}

function privateApi(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('Vary', 'Cookie');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function assetRequest(request, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  return new Request(assetUrl, request);
}

async function privateAsset(request, pathname, env) {
  const response = await env.ASSETS.fetch(assetRequest(request, pathname));
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('Vary', 'Cookie');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function cleanProfile(profile) {
  const email = String(profile?.email || '').trim().toLowerCase();
  const fullName = String(profile?.full_name || profile?.name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const id = Number(profile?.id);
  if (!Number.isInteger(id) || id < 1 || !email.includes('@') || fullName.length < 2) return null;
  return {
    id,
    email,
    fullName,
    role: profile?.role === 'employer' ? 'employer' : profile?.role === 'student' ? 'student' : 'pupil',
    headline: String(profile?.headline || '').trim().slice(0, 180),
    syncToken: String(profile?.sync_token || '').trim()
  };
}

function nicknameFor(profile) {
  return `sl${profile.id}`;
}

async function exchangeSkillLandTicket(ticket, env) {
  try {
    const response = await fetchWithTimeout(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/ultravis/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ticket })
    }, 14000);
    if (!response.ok) return null;
    const body = await response.json();
    return cleanProfile({ ...(body?.user || {}), sync_token: body?.sync_token });
  } catch {
    return null;
  }
}

function cleanDirectoryMirrorProfile(profile) {
  const directoryId = String(profile?.directory_id || '').trim();
  const fullName = String(profile?.full_name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const skillLandUserId = Number(profile?.skillland_user_id);
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(directoryId) || !Number.isInteger(skillLandUserId) || skillLandUserId < 1 || fullName.length < 2) return null;
  const skills = Array.isArray(profile?.skills)
    ? profile.skills.map(item => String(item || '').trim().slice(0, 60)).filter(Boolean).slice(0, 20)
    : [];
  return {
    directoryId,
    skillLandUserId,
    fullName,
    role: profile?.role === 'employer' ? 'employer' : profile?.role === 'student' ? 'student' : 'pupil',
    headline: String(profile?.headline || '').trim().slice(0, 180),
    bio: String(profile?.bio || '').trim().slice(0, 1200),
    city: String(profile?.city || '').trim().slice(0, 120),
    specialty: String(profile?.specialty || '').trim().slice(0, 160),
    skills,
    company: String(profile?.company || '').trim().slice(0, 160),
    employmentType: String(profile?.employment_type || '').trim().slice(0, 120),
    // Binary avatar files stay on SkillLand storage and are never mirrored.
    avatarUrl: ''
  };
}

async function directoryIdForEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalized));
  return base64urlEncode(new Uint8Array(digest));
}

async function exchangeDirectoryMirrorTicket(ticket, env) {
  if (!/^[a-f0-9]{64}$/i.test(String(ticket || ''))) return null;
  try {
    const response = await fetchWithTimeout(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/directory-mirror/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ticket })
    }, 7000);
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.ok ? payload : null;
  } catch {
    return null;
  }
}

async function upsertDirectoryProfile(profile, env) {
  await env.DB.prepare(`INSERT INTO skillland_directory_profiles
    (directory_id, skillland_user_id, full_name, role, headline, bio, city, specialty, skills_json, company, employment_type, avatar_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(directory_id) DO UPDATE SET
      skillland_user_id=excluded.skillland_user_id,
      full_name=excluded.full_name,
      role=excluded.role,
      headline=excluded.headline,
      bio=excluded.bio,
      city=excluded.city,
      specialty=excluded.specialty,
      skills_json=excluded.skills_json,
      company=excluded.company,
      employment_type=excluded.employment_type,
      avatar_url=excluded.avatar_url,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(profile.directoryId, profile.skillLandUserId, profile.fullName, profile.role, profile.headline, profile.bio, profile.city, profile.specialty, JSON.stringify(profile.skills), profile.company, profile.employmentType, profile.avatarUrl)
    .run();
}

function directoryProfileFromRow(row) {
  let skills = [];
  try { skills = JSON.parse(row?.skills_json || '[]'); } catch {}
  return {
    directory_id: String(row?.directory_id || ''),
    skillland_user_id: Number(row?.skillland_user_id || 0),
    full_name: String(row?.full_name || ''),
    role: row?.role === 'employer' ? 'employer' : row?.role === 'student' ? 'student' : 'pupil',
    headline: String(row?.headline || ''),
    bio: String(row?.bio || ''),
    city: String(row?.city || ''),
    specialty: String(row?.specialty || ''),
    skills: Array.isArray(skills) ? skills : [],
    company: String(row?.company || ''),
    employment_type: String(row?.employment_type || ''),
    avatar_url: ''
  };
}

// Some people had already opened Ultra VIS before the directory mirror was
// introduced. Their safe public summary is already in D1, so seed it once the
// bridge is first used rather than waiting for every person to sign in again.
async function backfillLegacyDirectory(env) {
  const legacy = await env.DB.prepare(`SELECT skillland_user_id, email, full_name, skillland_role, skillland_headline
    FROM users WHERE email <> '' ORDER BY id ASC LIMIT 200`).all();
  await Promise.all((legacy.results || []).map(async row => {
    const fullName = String(row.full_name || '').trim().slice(0, 120);
    const skillLandUserId = Number(row.skillland_user_id);
    if (!fullName || !Number.isInteger(skillLandUserId) || skillLandUserId < 1) return;
    const directoryId = await directoryIdForEmail(row.email);
    await env.DB.prepare(`INSERT OR IGNORE INTO skillland_directory_profiles
      (directory_id, skillland_user_id, full_name, role, headline, bio, city, specialty, skills_json, company, employment_type, avatar_url, updated_at)
      VALUES (?, ?, ?, ?, ?, '', '', '', '[]', '', '', '', CURRENT_TIMESTAMP)`)
      .bind(directoryId, skillLandUserId, fullName, row.skillland_role === 'employer' ? 'employer' : 'pupil', String(row.skillland_headline || '').slice(0, 180))
      .run();
  }));
}

async function directoryMirrorApi(request, path, env) {
  const body = await requestJson(request);
  const grant = await exchangeDirectoryMirrorTicket(String(body?.ticket || ''), env);
  if (!grant) return Response.json({ ok: false, error: 'Directory ticket expired.' }, { status: 401 });
  if (path === '/api/skillland-directory/sync') {
    if (grant.operation !== 'sync') return Response.json({ ok: false, error: 'Wrong directory ticket.' }, { status: 403 });
    const profile = cleanDirectoryMirrorProfile(grant.profile);
    if (!profile) return Response.json({ ok: false, error: 'Profile is invalid.' }, { status: 400 });
    await backfillLegacyDirectory(env);
    await upsertDirectoryProfile(profile, env);
    return Response.json({ ok: true });
  }
  if (path === '/api/skillland-directory/list') {
    const role = grant.operation === 'list' && ['pupil', 'student', 'employer', 'learners'].includes(grant.target_role) ? grant.target_role : '';
    if (!role) return Response.json({ ok: false, error: 'Wrong directory ticket.' }, { status: 403 });
    await backfillLegacyDirectory(env);
    const offset = Math.max(0, Math.min(999999, Math.floor(Number(body?.offset) || 0)));
    const limit = Math.max(1, Math.min(48, Math.floor(Number(body?.limit) || 24)));
    const matchTerms = [...new Set((Array.isArray(body?.match_terms) ? body.match_terms : [])
      .map(term => String(term || '').trim().toLowerCase()).filter(term => /^[\p{L}\p{N}+#.+-]{2,}$/u.test(term)).slice(0, 14))];
    const roleSql = role === 'learners' ? "role IN ('pupil','student')" : 'role = ?';
    const roleParams = role === 'learners' ? [] : [role];
    const searchable = "lower(coalesce(skills_json,'') || ' ' || coalesce(headline,'') || ' ' || coalesce(bio,'') || ' ' || coalesce(specialty,'') || ' ' || coalesce(company,'') || ' ' || coalesce(employment_type,''))";
    const scoreSql = matchTerms.length ? matchTerms.map(() => `CASE WHEN ${searchable} LIKE ? THEN 1 ELSE 0 END`).join(' + ') : '0';
    const scoreParams = matchTerms.map(term => `%${term}%`);
    const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM skillland_directory_profiles WHERE ${roleSql}`).bind(...roleParams).first();
    const rows = await env.DB.prepare(`SELECT directory_id, skillland_user_id, full_name, role, headline, bio, city, specialty, skills_json, company, employment_type, avatar_url
      FROM skillland_directory_profiles WHERE ${roleSql} ORDER BY ${scoreSql} DESC, datetime(updated_at) DESC, directory_id ASC LIMIT ? OFFSET ?`).bind(...roleParams, ...scoreParams, limit, offset).all();
    const profiles = (rows.results || []).map(directoryProfileFromRow);
    return Response.json({ ok: true, total: Number(totalRow?.total || 0), profiles }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
  return Response.json({ ok: false, error: 'Not found.' }, { status: 404 });
}

async function directoryApplicationsApi(request, env) {
  const body = await requestJson(request);
  const grant = await exchangeDirectoryMirrorTicket(String(body?.ticket || ''), env);
  if (!grant) return Response.json({ ok: false, error: 'Directory ticket expired.' }, { status: 401 });
  if (!['application_create', 'application_list', 'application_update'].includes(grant.operation)) {
    return Response.json({ ok: false, error: 'Wrong directory ticket.' }, { status: 403 });
  }
  const profile = cleanDirectoryMirrorProfile(grant.profile);
  if (!profile) return Response.json({ ok: false, error: 'Profile is invalid.' }, { status: 400 });
  await backfillLegacyDirectory(env);
  await upsertDirectoryProfile(profile, env);

  if (grant.operation === 'application_create') {
    const recipientDirectoryId = String(grant.target_directory_id || '');
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(recipientDirectoryId) || recipientDirectoryId === profile.directoryId) {
      return Response.json({ ok: false, error: 'Choose another profile.' }, { status: 400 });
    }
    const recipient = await env.DB.prepare('SELECT directory_id, role FROM skillland_directory_profiles WHERE directory_id = ? LIMIT 1')
      .bind(recipientDirectoryId).first();
    if (!recipient) return Response.json({ ok: false, error: 'Profile is no longer in the directory.' }, { status: 404 });
    const senderLearner = profile.role === 'pupil' || profile.role === 'student';
    const recipientLearner = recipient.role === 'pupil' || recipient.role === 'student';
    if (!(profile.role === 'employer' && recipientLearner) && !(recipient.role === 'employer' && senderLearner)) {
      return Response.json({ ok: false, error: 'Requests are available only between an employer and a learner.' }, { status: 400 });
    }
    await env.DB.prepare(`INSERT INTO skillland_directory_applications
      (sender_directory_id, recipient_directory_id, note, status, updated_at)
      VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      ON CONFLICT(sender_directory_id, recipient_directory_id) DO UPDATE SET
        note=excluded.note, status='pending', updated_at=CURRENT_TIMESTAMP`)
      .bind(profile.directoryId, recipientDirectoryId, String(grant.note || '').trim().slice(0, 500)).run();
    const application = await env.DB.prepare(`SELECT id, status FROM skillland_directory_applications
      WHERE sender_directory_id=? AND recipient_directory_id=? LIMIT 1`).bind(profile.directoryId, recipientDirectoryId).first();
    return Response.json({ ok: true, application_id: Number(application?.id || 0), status: application?.status || 'pending' });
  }

  if (grant.operation === 'application_update') {
    const applicationId = Number(grant.application_id);
    const nextStatus = grant.action === 'accept' ? 'accepted' : grant.action === 'reject' ? 'rejected' : '';
    if (!Number.isInteger(applicationId) || applicationId < 1 || !nextStatus) return Response.json({ ok: false, error: 'Application update is invalid.' }, { status: 400 });
    const existing = await env.DB.prepare(`SELECT id FROM skillland_directory_applications
      WHERE id=? AND recipient_directory_id=? LIMIT 1`).bind(applicationId, profile.directoryId).first();
    if (!existing) return Response.json({ ok: false, error: 'Application not found.' }, { status: 404 });
    await env.DB.prepare(`UPDATE skillland_directory_applications SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(nextStatus, applicationId).run();
    return Response.json({ ok: true, status: nextStatus });
  }

  const inbox = await env.DB.prepare(`SELECT a.id, a.note, a.status, a.created_at,
      p.directory_id, p.full_name, p.role, p.headline, p.bio, p.city, p.specialty, p.skills_json, p.company, p.employment_type
      FROM skillland_directory_applications a JOIN skillland_directory_profiles p ON p.directory_id=a.sender_directory_id
      WHERE a.recipient_directory_id=?
      ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END, datetime(a.updated_at) DESC, a.id DESC`)
    .bind(profile.directoryId).all();
  const sent = await env.DB.prepare(`SELECT a.id, a.note, a.status, a.created_at,
      p.directory_id, p.full_name, p.role, p.headline, p.bio, p.city, p.specialty, p.skills_json, p.company, p.employment_type
      FROM skillland_directory_applications a JOIN skillland_directory_profiles p ON p.directory_id=a.recipient_directory_id
      WHERE a.sender_directory_id=?
      ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END, datetime(a.updated_at) DESC, a.id DESC`)
    .bind(profile.directoryId).all();
  const toApplication = row => ({
    id: Number(row.id), note: String(row.note || ''), status: row.status, created_at: row.created_at || '',
    other_user: directoryProfileFromRow(row)
  });
  return Response.json({ ok: true, inbox: (inbox.results || []).map(toApplication), sent: (sent.results || []).map(toApplication) }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  });
}

async function durableAccountApi(request, env) {
  const body = await requestJson(request);
  const grant = await exchangeDirectoryMirrorTicket(String(body?.ticket || ''), env);
  if (!grant) return Response.json({ ok: false, error: 'Backup ticket expired.' }, { status: 401 });
  if (grant.operation === 'account_backup_save') {
    const key = String(grant.account_key || '');
    const payload = String(grant.encrypted_payload || '');
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(key) || payload.length < 40 || payload.length > 1800000) {
      return Response.json({ ok: false, error: 'Backup payload is invalid.' }, { status: 400 });
    }
    await env.DB.prepare(`INSERT INTO skillland_account_backups(account_key, encrypted_payload, updated_at)
      VALUES(?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(account_key) DO UPDATE SET encrypted_payload=excluded.encrypted_payload, updated_at=CURRENT_TIMESTAMP`)
      .bind(key, payload).run();
    return Response.json({ ok: true });
  }
  if (grant.operation === 'account_backup_read') {
    const key = String(grant.account_key || '');
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(key)) return Response.json({ ok: false, error: 'Backup key is invalid.' }, { status: 400 });
    const row = await env.DB.prepare('SELECT encrypted_payload FROM skillland_account_backups WHERE account_key=? LIMIT 1').bind(key).first();
    return Response.json({ ok: true, encrypted_payload: row?.encrypted_payload || '' });
  }
  return Response.json({ ok: false, error: 'Wrong backup operation.' }, { status: 403 });
}

// A resident passkey lets a new Render process identify an account without an
// email or password. The browser reveals only an opaque credential ID; the
// payload returned from D1 is encrypted by SkillLand before it reaches D1.
async function durablePasskeyApi(request, env) {
  const body = await requestJson(request);
  const credentialId = String(body?.credential_id || '');
  if (credentialId) {
    if (!/^[A-Za-z0-9_-]{16,1024}$/.test(credentialId)) return Response.json({ ok: false, error: 'Passkey is invalid.' }, { status: 400 });
    const row = await env.DB.prepare('SELECT encrypted_payload FROM skillland_passkey_index WHERE credential_id=? LIMIT 1').bind(credentialId).first();
    return Response.json({ ok: true, encrypted_payload: row?.encrypted_payload || '' });
  }
  const grant = await exchangeDirectoryMirrorTicket(String(body?.ticket || ''), env);
  if (!grant || grant.operation !== 'passkey_save') return Response.json({ ok: false, error: 'Passkey ticket expired.' }, { status: 401 });
  const id = String(grant.passkey_credential_id || '');
  const accountKey = String(grant.account_key || '');
  const payload = String(grant.encrypted_payload || '');
  if (!/^[A-Za-z0-9_-]{16,1024}$/.test(id) || !/^[A-Za-z0-9_-]{32,64}$/.test(accountKey) || payload.length < 40 || payload.length > 1800000) {
    return Response.json({ ok: false, error: 'Passkey payload is invalid.' }, { status: 400 });
  }
  await env.DB.prepare(`INSERT INTO skillland_passkey_index(credential_id,account_key,encrypted_payload,updated_at)
    VALUES(?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(credential_id) DO UPDATE SET account_key=excluded.account_key, encrypted_payload=excluded.encrypted_payload, updated_at=CURRENT_TIMESTAMP`)
    .bind(id, accountKey, payload).run();
  return Response.json({ ok: true });
}

async function durableGameReviewsApi(request, env) {
  if (request.method === 'GET') {
    const gameKey = String(new URL(request.url).searchParams.get('game') || '').toLowerCase();
    if (!/^[a-z0-9-]{2,60}$/.test(gameKey)) return Response.json({ ok: false, error: 'Game is invalid.' }, { status: 400 });
    const [rows, totals] = await Promise.all([
      env.DB.prepare(`SELECT full_name, rating, comment, created_at FROM skillland_game_reviews
        WHERE game_key=? ORDER BY datetime(updated_at) DESC, id DESC LIMIT 4`).bind(gameKey).all(),
      env.DB.prepare('SELECT COUNT(*) AS total, AVG(rating) AS average FROM skillland_game_reviews WHERE game_key=?').bind(gameKey).first()
    ]);
    const reviews = (rows.results || []).map(row => ({ full_name: String(row.full_name || 'Участник SkillLand'), rating: Number(row.rating || 0), comment: String(row.comment || ''), created_at: row.created_at || '', avatar_url: '' }));
    return Response.json({ ok: true, reviews, total: Number(totals?.total || 0), average: Number(totals?.average || 0), shown: reviews.length }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
  const body = await requestJson(request);
  const grant = await exchangeDirectoryMirrorTicket(String(body?.ticket || ''), env);
  if (!grant || grant.operation !== 'game_review_upsert') return Response.json({ ok: false, error: 'Review ticket expired.' }, { status: 401 });
  const profile = cleanDirectoryMirrorProfile(grant.profile);
  const gameKey = String(grant.game_key || '').toLowerCase();
  const rating = Math.round(Number(grant.rating));
  const comment = String(grant.comment || '').trim().slice(0, 1000);
  if (!profile || !/^[a-z0-9-]{2,60}$/.test(gameKey) || rating < 1 || rating > 5 || comment.length < 3) {
    return Response.json({ ok: false, error: 'Review is invalid.' }, { status: 400 });
  }
  await env.DB.prepare(`INSERT INTO skillland_game_reviews(game_key, directory_id, full_name, rating, comment, created_at, updated_at)
    VALUES(?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(game_key,directory_id) DO UPDATE SET full_name=excluded.full_name, rating=excluded.rating, comment=excluded.comment, updated_at=CURRENT_TIMESTAMP`)
    .bind(gameKey, profile.directoryId, profile.fullName, rating, comment).run();
  return Response.json({ ok: true });
}

async function upsertUser(profile, env) {
  const existing = await env.DB.prepare('SELECT id, skillland_user_id, email, full_name, nickname FROM users WHERE skillland_user_id = ? OR email = ? LIMIT 1')
    .bind(profile.id, profile.email)
    .first();
  if (existing) {
    await env.DB.prepare('UPDATE users SET skillland_user_id = ?, email = ?, full_name = ?, skillland_role = ?, skillland_headline = ?, skillland_sync_token = ?, last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(profile.id, profile.email, profile.fullName, profile.role, profile.headline, profile.syncToken, existing.id)
      .run();
    return { ...existing, skillland_user_id: profile.id, email: profile.email, full_name: profile.fullName };
  }
  const nickname = nicknameFor(profile);
  const inserted = await env.DB.prepare('INSERT INTO users (skillland_user_id, email, full_name, nickname, skillland_role, skillland_headline, skillland_sync_token) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(profile.id, profile.email, profile.fullName, nickname, profile.role, profile.headline, profile.syncToken)
    .run();
  return { id: inserted.meta.last_row_id, skillland_user_id: profile.id, email: profile.email, full_name: profile.fullName, nickname };
}

function isProtectedPagePath(pathname) {
  return pathname === '/dashboard' || pathname === '/dashboard.html' || pathname === '/index' || pathname === '/index.html' || (pathname.endsWith('.html') && pathname !== '/gate.html');
}

const legacyProductRoutes = {
  '/lectures.html': 'lectures',
  '/orientation.html': 'colleges',
  '/college-detail.html': 'colleges',
  '/notes.html': 'notes',
  '/myday.html': 'day',
  '/games.html': 'games',
  '/profile.html': 'profile',
  '/quotes.html': 'quotes'
};

function apiUnauthorized() {
  return Response.json({ success: false, error: 'Sign in via SkillLand to continue.' }, { status: 401 });
}

async function requestJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function learningSnapshot(userId, env) {
  const [totals, current, quiz] = await Promise.all([
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM lectures) AS total,
      COUNT(lp.lecture_id) AS started,
      SUM(CASE WHEN lp.progress >= 100 THEN 1 ELSE 0 END) AS completed
      FROM lecture_progress lp WHERE lp.user_id = ?`).bind(userId).first(),
    env.DB.prepare(`SELECT l.id, l.title, l.category, COALESCE(s.progress_percent, lp.progress, 0) AS progress,
      COALESCE(s.last_activity_at, lp.last_opened_at) AS last_opened_at
      FROM lectures l
      LEFT JOIN learning_sessions s ON s.lecture_id = l.id AND s.user_id = ?
      LEFT JOIN lecture_progress lp ON lp.lecture_id = l.id AND lp.user_id = ?
      WHERE s.user_id IS NOT NULL OR lp.user_id IS NOT NULL
      ORDER BY COALESCE(s.last_activity_at, lp.last_opened_at) DESC LIMIT 1`).bind(userId, userId).first(),
    env.DB.prepare(`SELECT primary_direction, secondary_direction, summary, created_at
      FROM quiz_results WHERE user_id = ? ORDER BY id DESC LIMIT 1`).bind(userId).first()
  ]);
  const total = Number(totals?.total || 0);
  const started = Number(totals?.started || 0);
  const completed = Number(totals?.completed || 0);
  return {
    total,
    started,
    completed,
    completion_rate: total ? Math.round((completed / total) * 100) : 0,
    current: current ? { id: current.id, title: current.title, category: current.category, progress: Number(current.progress || 0), last_opened_at: current.last_opened_at } : null,
    quiz: quiz || null
  };
}

function parseJson(value, fallback = {}) {
  try { return JSON.parse(String(value || '')); } catch { return fallback; }
}

function safeConceptIds(value) {
  const parsed = parseJson(value, []);
  return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string' && item.length <= 120) : [];
}

async function recordLearningEvent(userId, env, eventType, { lectureId = null, blockKey = null, conceptId = null, metadata = {} } = {}) {
  const allowed = new Set(['lecture_started', 'block_completed', 'note_created', 'ai_question_asked', 'hint_requested', 'question_answered', 'practice_started', 'practice_submitted', 'lecture_completed', 'review_completed']);
  if (!allowed.has(eventType)) return;
  await env.DB.prepare('INSERT INTO learning_events (user_id, event_type, lecture_id, block_key, concept_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(userId, eventType, lectureId, blockKey, conceptId, JSON.stringify(metadata || {})).run();
}

function masteryStatus(mastery, confidence) {
  if (confidence >= 85 && mastery >= 75) return 'strong';
  if (confidence >= 60 && mastery >= 55) return 'verified';
  if (mastery >= 45) return 'practicing';
  if (mastery > 0) return 'learning';
  return 'new';
}

async function refreshConceptMastery(userId, conceptId, env) {
  const rows = await env.DB.prepare('SELECT score, weight, assistance_level, evidence_type, created_at FROM knowledge_evidence WHERE user_id = ? AND concept_id = ? ORDER BY created_at DESC LIMIT 24').bind(userId, conceptId).all();
  const evidence = rows.results || [];
  const weighted = evidence.reduce((sum, item) => sum + Number(item.score) * Number(item.weight) * (1 - Number(item.assistance_level || 0)), 0);
  const totalWeight = evidence.reduce((sum, item) => sum + Number(item.weight), 0);
  const mastery = totalWeight ? Math.round((weighted / totalWeight) * 100) : 0;
  const kinds = new Set(evidence.map(item => item.evidence_type));
  const practiceBonus = kinds.has('practice') ? 18 : 0;
  const reviewBonus = kinds.has('review') ? 14 : 0;
  const confidence = Math.min(100, Math.round(evidence.length * 14 + kinds.size * 9 + practiceBonus + reviewBonus));
  const status = masteryStatus(mastery, confidence);
  const reviewDays = confidence >= 85 ? 14 : confidence >= 60 ? 7 : 2;
  await env.DB.prepare(`INSERT INTO user_concept_mastery (user_id, concept_id, mastery_score, confidence_score, evidence_count, last_practiced_at, last_verified_at, next_review_at, status, updated_at)
    VALUES (?, ?, ?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, datetime('now', ?), ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, concept_id) DO UPDATE SET mastery_score = excluded.mastery_score, confidence_score = excluded.confidence_score, evidence_count = excluded.evidence_count,
    last_practiced_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE user_concept_mastery.last_practiced_at END, last_verified_at = CURRENT_TIMESTAMP,
    next_review_at = excluded.next_review_at, status = excluded.status, updated_at = CURRENT_TIMESTAMP`)
    .bind(userId, conceptId, mastery, confidence, evidence.length, kinds.has('practice') ? 1 : 0, `+${reviewDays} days`, status, kinds.has('practice') ? 1 : 0).run();
  if (evidence.length) {
    const due = await env.DB.prepare("SELECT id FROM reviews WHERE user_id = ? AND concept_id = ? AND status = 'due' LIMIT 1").bind(userId, conceptId).first();
    if (!due) await env.DB.prepare("INSERT INTO reviews (user_id, concept_id, due_at) VALUES (?, ?, datetime('now', ?))").bind(userId, conceptId, `+${reviewDays} days`).run();
  }
  return { mastery, confidence, evidence_count: evidence.length, status };
}

async function addEvidence(userId, env, { conceptIds = [], evidenceType, sourceId = '', score = .7, weight = .25, assistanceLevel = 0 }) {
  const unique = [...new Set(conceptIds)].slice(0, 8);
  if (!unique.length) return [];
  for (const conceptId of unique) {
    await env.DB.prepare('INSERT INTO knowledge_evidence (user_id, concept_id, evidence_type, source_id, score, weight, assistance_level) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, conceptId, evidenceType, sourceId, score, weight, assistanceLevel).run();
  }
  return Promise.all(unique.map(conceptId => refreshConceptMastery(userId, conceptId, env)));
}

async function ensureLearningPath(userId, env) {
  await env.DB.prepare("INSERT OR IGNORE INTO goals (user_id, title, goal_type, target_id, status) VALUES (?, 'Frontend Developer', 'career', 'frontend', 'active')").bind(userId).run();
  const goal = await env.DB.prepare("SELECT * FROM goals WHERE user_id = ? AND status = 'active' ORDER BY id LIMIT 1").bind(userId).first();
  await env.DB.prepare('INSERT OR IGNORE INTO learning_paths (user_id, goal_id, title) VALUES (?, ?, ?)').bind(userId, goal.id, goal.title).run();
  const path = await env.DB.prepare('SELECT * FROM learning_paths WHERE user_id = ? AND goal_id = ?').bind(userId, goal.id).first();
  const pathItems = [
    ['html', 'HTML', 1], ['css', 'CSS', 2], ['javascript', 'JavaScript Fundamentals', 3],
    ['javascript.dom', 'DOM и события', 4], ['javascript.promises', 'Promises', 5],
    ['javascript.async.await', 'Async JavaScript', 6]
  ];
  await env.DB.batch(pathItems.map(([conceptId, title, position]) => env.DB.prepare('INSERT OR IGNORE INTO learning_path_items (path_id, concept_id, title, position) VALUES (?, ?, ?, ?)').bind(path.id, conceptId, title, position)));
  return { goal, path };
}

async function learningHome(userId, env) {
  const [snapshot, pathModel, masteryRows, reviewRows] = await Promise.all([
    learningSnapshot(userId, env),
    ensureLearningPath(userId, env),
    env.DB.prepare('SELECT m.*, c.name FROM user_concept_mastery m JOIN concepts c ON c.id = m.concept_id WHERE m.user_id = ? ORDER BY m.updated_at DESC').bind(userId).all(),
    env.DB.prepare("SELECT r.id, r.concept_id, c.name FROM reviews r JOIN concepts c ON c.id = r.concept_id WHERE r.user_id = ? AND r.status = 'due' AND datetime(r.due_at) <= datetime('now') ORDER BY r.due_at LIMIT 2").bind(userId).all()
  ]);
  const mastery = masteryRows.results || [];
  const reviews = reviewRows.results || [];
  const pathItems = await env.DB.prepare(`SELECT i.concept_id, i.title, i.position, COALESCE(m.mastery_score, 0) AS mastery, COALESCE(m.confidence_score, 0) AS confidence, COALESCE(m.status, 'new') AS status
    FROM learning_path_items i LEFT JOIN user_concept_mastery m ON m.user_id = ? AND m.concept_id = i.concept_id WHERE i.path_id = ? ORDER BY i.position`).bind(userId, pathModel.path.id).all();
  const current = snapshot.current;
  const review = reviews[0] || null;
  const weak = mastery.filter(item => item.mastery_score > 0 && item.mastery_score < 60).sort((a, b) => a.mastery_score - b.mastery_score)[0] || null;
  const nextAction = review
    ? { type: 'review', title: `Повторить ${review.name}`, estimated_minutes: 3, reason: 'Короткая проверка закрепит знание.', review_id: review.id, concept_id: review.concept_id }
    : weak?.concept_id === 'javascript.promises'
      ? { type: 'lecture', title: 'Быстро повторить Promises', estimated_minutes: 4, reason: 'Это поможет продолжить Async/Await.', lecture_id: 11, block_key: 'promise' }
      : current
        ? { type: 'continue', title: current.title, estimated_minutes: Math.max(2, Math.round((100 - current.progress) / 10)), reason: 'Продолжи с того смыслового блока, где остановился.', lecture_id: current.id }
        : { type: 'lecture', title: 'Начать Async/Await', estimated_minutes: 18, reason: 'Один короткий материал с примером и практикой.', lecture_id: 11, block_key: 'intro' };
  const strong = mastery.filter(item => item.mastery_score >= 75 && item.confidence_score >= 60).slice(0, 3).map(item => item.name);
  const attention = weak ? weak.name : 'Promises';
  const development = snapshot.current?.title || 'Async JavaScript';
  const goalProgress = pathItems.results.length ? Math.round(pathItems.results.reduce((sum, item) => sum + item.mastery, 0) / pathItems.results.length) : 0;
  await env.DB.prepare('UPDATE goals SET progress = ? WHERE id = ?').bind(goalProgress, pathModel.goal.id).run();
  return {
    continue_learning: current,
    next_action: nextAction,
    today: reviews.map(item => ({ type: 'review', title: `Повторить ${item.name}`, estimated_minutes: 3, review_id: item.id })),
    goal: { title: pathModel.goal.title, progress: goalProgress, items: pathItems.results || [] },
    knowledge: { strong, developing: development, attention },
    metrics: { progress: snapshot.completion_rate, completed: snapshot.completed, active: snapshot.started }
  };
}

async function startLearningSession(userId, lectureId, env) {
  const firstBlock = await env.DB.prepare('SELECT block_key, position FROM lecture_blocks WHERE lecture_id = ? ORDER BY position LIMIT 1').bind(lectureId).first();
  await env.DB.prepare(`INSERT INTO learning_sessions (user_id, lecture_id, current_block_key, current_position, status)
    VALUES (?, ?, ?, ?, 'active') ON CONFLICT(user_id, lecture_id) DO UPDATE SET status = CASE WHEN learning_sessions.status = 'completed' THEN 'active' ELSE learning_sessions.status END, last_activity_at = CURRENT_TIMESTAMP`)
    .bind(userId, lectureId, firstBlock?.block_key || null, firstBlock?.position || 1).run();
  const session = await env.DB.prepare('SELECT * FROM learning_sessions WHERE user_id = ? AND lecture_id = ?').bind(userId, lectureId).first();
  const started = await env.DB.prepare("SELECT id FROM learning_events WHERE user_id = ? AND lecture_id = ? AND event_type = 'lecture_started' LIMIT 1").bind(userId, lectureId).first();
  if (!started) await recordLearningEvent(userId, env, 'lecture_started', { lectureId });
  return session;
}

async function completeLearningBlock(userId, lectureId, blockKey, env) {
  const block = await env.DB.prepare('SELECT * FROM lecture_blocks WHERE lecture_id = ? AND block_key = ?').bind(lectureId, blockKey).first();
  if (!block) return null;
  const prior = await env.DB.prepare("SELECT id FROM learning_events WHERE user_id = ? AND lecture_id = ? AND block_key = ? AND event_type = 'block_completed' LIMIT 1").bind(userId, lectureId, blockKey).first();
  if (!prior) await recordLearningEvent(userId, env, 'block_completed', { lectureId, blockKey });
  const totals = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM lecture_blocks WHERE lecture_id = ?) AS total, COUNT(DISTINCT block_key) AS completed FROM learning_events WHERE user_id = ? AND lecture_id = ? AND event_type = 'block_completed'").bind(lectureId, userId, lectureId).first();
  const progress = totals?.total ? Math.round((Number(totals.completed || 0) / Number(totals.total)) * 100) : 0;
  const next = await env.DB.prepare('SELECT block_key, position FROM lecture_blocks WHERE lecture_id = ? AND position > ? ORDER BY position LIMIT 1').bind(lectureId, block.position).first();
  const completed = progress >= 100;
  await env.DB.prepare(`UPDATE learning_sessions SET current_block_key = ?, current_position = ?, progress_percent = ?, interaction_count = interaction_count + 1, status = ?, last_activity_at = CURRENT_TIMESTAMP, finished_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END WHERE user_id = ? AND lecture_id = ?`)
    .bind(next?.block_key || blockKey, next?.position || block.position, progress, completed ? 'completed' : 'active', completed ? 1 : 0, userId, lectureId).run();
  await env.DB.prepare(`INSERT INTO lecture_progress (user_id, lecture_id, progress, completed_at, last_opened_at, updated_at) VALUES (?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, lecture_id) DO UPDATE SET progress = MAX(lecture_progress.progress, excluded.progress), completed_at = CASE WHEN excluded.progress >= 100 THEN CURRENT_TIMESTAMP ELSE lecture_progress.completed_at END, last_opened_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`)
    .bind(userId, lectureId, progress, completed ? 1 : 0).run();
  if (completed) await recordLearningEvent(userId, env, 'lecture_completed', { lectureId });
  return { block, next, progress, completed };
}

async function mirrorLearningToSkillLand(userId, env) {
  const user = await env.DB.prepare('SELECT skillland_sync_token FROM users WHERE id = ?').bind(userId).first();
  if (!user?.skillland_sync_token) return;
  const snapshot = await learningSnapshot(userId, env);
  try {
    await fetchWithTimeout(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/ultravis/progress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user.skillland_sync_token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ summary: snapshot })
    }, 8000);
  } catch {
    // Study data is still safely stored in D1. The next meaningful action retries the mirror.
  }
}

function deferLearningMirror(userId, env, executionContext) {
  const work = mirrorLearningToSkillLand(userId, env).catch(() => {});
  if (executionContext?.waitUntil) executionContext.waitUntil(work);
}

function quizAnalysis(answers) {
  const score = { technology: 0, science: 0, people: 0 };
  for (const value of Object.values(answers || {})) if (Object.hasOwn(score, value)) score[value] += 1;
  const ordered = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const primary = ordered[0]?.[0] || 'technology';
  const secondary = ordered[1]?.[0] || '';
  const copy = {
    technology: 'Тебе близко создание цифровых продуктов: начни с JavaScript или Python и добавляй работу в портфолио SkillLand.',
    science: 'Тебя заряжает исследование закономерностей: попробуй физику, биологию или химию и фиксируй наблюдения в заметках.',
    people: 'Твоя сильная сторона — идеи, коммуникация и осмысленный выбор: начни с английского, экономики или этики.'
  };
  return { primary, secondary, summary: copy[primary] };
}

function assistantTopic(message) {
  const value = String(message || '').toLowerCase();
  if (/(python|javascript|код|сайт|программ)/.test(value)) return 'Программирование';
  if (/(вектор|матриц|алгебр|математ)/.test(value)) return 'Математика';
  if (/(физик|квант|оптик)/.test(value)) return 'Физика';
  if (/(биолог|клетк)/.test(value)) return 'Биология';
  if (/(хими|молекул|органическ)/.test(value)) return 'Химия';
  if (/(эконом|рынок|цен|деньг)/.test(value)) return 'Экономика';
  if (/(истори|архив)/.test(value)) return 'История';
  if (/(англий|язык|презентац)/.test(value)) return 'Языки';
  if (/(этик|философ|выбор|ценност)/.test(value)) return 'Философия';
  return '';
}

function assistantShortText(value, limit = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function ultraVisAssistant(request, session, env) {
  if (!session) return apiUnauthorized();
  const body = await requestJson(request);
  const message = String(body.message || '').trim().slice(0, 1600);
  if (!message) return Response.json({ success: false, error: 'Напиши запрос для Ultra VIS AI.' }, { status: 400 });
  const userId = Number(session.sub);
  const lower = message.toLowerCase();
  if (/^(пр|привет|ку|салам|hi|hello)(?:\s|[!,.?]|$)/.test(lower) && lower.length < 24) {
    return Response.json({ success: true, reply: 'Привет. Я на месте: могу открыть нужный раздел, найти лекции, собрать план дня или создать заметку.' });
  }
  const context = body.context && typeof body.context === 'object' ? body.context : {};
  const lectureId = Number(context.lecture_id || 0);
  const blockKey = String(context.block_key || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 72);
  if (lectureId && blockKey) await recordLearningEvent(userId, env, 'ai_question_asked', { lectureId, blockKey, metadata: { messageLength: message.length } });
  const contextualPrompt = lectureId && blockKey
    ? `Контекст Ultra VIS: пользователь читает лекцию ${lectureId}, блок ${blockKey}. Объясняй коротко, не выдавай готовый ответ за него и предложи следующий самостоятельный шаг.\n\n`
    : '';

  const directView = [
    [/(открой|покажи|перейди).{0,35}(заметк|конспект)/, 'notes', 'Открываю личную библиотеку заметок.'],
    [/(открой|покажи|перейди).{0,35}(мой день|задач|план)/, 'day', 'Открываю «Мой день».'],
    [/(открой|покажи|перейди).{0,35}(профил|skillland)/, 'profile', 'Открываю профиль SkillLand с твоим учебным прогрессом.'],
    [/(открой|покажи|перейди).{0,35}(тест|ориентир)/, 'quiz', 'Открываю интерактивный ориентир.'],
    [/(открой|покажи|перейди).{0,35}(лекци|библиотек)/, 'lectures', 'Открываю библиотеку лекций.'],
    [/(открой|покажи|перейди).{0,35}(направлен|университет|колледж|вуз)/, 'colleges', 'Открываю подбор направлений и учебных сред.']
  ].find(([pattern]) => pattern.test(lower));
  if (directView) {
    return Response.json({ success: true, reply: directView[2], action: { view: directView[1], label: 'Открыть' } });
  }

  if (lectureId && blockKey && /(объясн|не понял|проще|подсказ|почему|как работает)/.test(lower)) {
    const contextBlock = await env.DB.prepare('SELECT title, body FROM lecture_blocks WHERE lecture_id = ? AND block_key = ?').bind(lectureId, blockKey).first();
    if (contextBlock) {
      return Response.json({
        success: true,
        reply: `В блоке «${contextBlock.title}» держи одну опору: ${assistantShortText(contextBlock.body, 280)}\n\nСвоими словами ответь на два вопроса: что здесь появляется первым и что должно произойти после этого? Так ты поймёшь идею, а не просто запомнишь фразу.`
      });
    }
  }

  if (/(всё.*связан|все.*связан|всё.*профил|все.*профил|что.*есть)/.test(lower)) {
    return Response.json({
      success: true,
      reply: 'Вот ключевые части твоего пространства. Выбери, с чего продолжить.',
      suggestions: [
        { title: 'Лекции', meta: 'Продолжить или выбрать тему', view: 'lectures' },
        { title: 'Мой день', meta: 'Собрать следующий шаг', view: 'day' },
        { title: 'Профиль SkillLand', meta: 'Прогресс и ориентир', view: 'profile' }
      ]
    });
  }

  if (/(созда|добав|запиш|сделай).{0,40}(заметк|конспект)|^(заметк|конспект)/.test(lower)) {
    const title = `Заметка: ${assistantShortText(message.replace(/.*?(заметк[ауи]?|конспект)[\s:—-]*/i, ''), 72) || 'Новая мысль'}`;
    const noteBody = `Создано по запросу Ultra VIS AI.\n\n${message}`;
    const result = await env.DB.prepare('INSERT INTO notes (user_id, title, body, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').bind(userId, title, noteBody).run();
    return Response.json({ success: true, reply: 'Готово. Я создал заметку в твоей личной библиотеке Ultra VIS.', action: { type: 'note', id: result.meta.last_row_id, label: 'Открыть заметки', view: 'notes' } });
  }

  if (/(задач|план.*день|список.*дел|распиши.*день)/.test(lower)) {
    const focus = assistantShortText(message.replace(/.*?(задач[ауи]?|план.*?день|список.*?дел)[\s:—-]*/i, ''), 90) || 'следующий учебный шаг';
    const isPlan = /(план|список|распиши)/.test(lower);
    const tasks = isPlan
      ? [`Определить цель: ${focus}`, 'Открыть одну подходящую лекцию Ultra VIS', 'Зафиксировать вывод в заметке']
      : [`${focus.charAt(0).toUpperCase()}${focus.slice(1)}`];
    for (const title of tasks) await env.DB.prepare('INSERT INTO daily_tasks (user_id, title) VALUES (?, ?)').bind(userId, title.slice(0, 160)).run();
    return Response.json({ success: true, reply: isPlan ? 'Готово. Я добавил три спокойных шага в «Мой день».' : 'Готово. Задача добавлена в «Мой день».', action: { type: 'tasks', label: 'Открыть мой день', view: 'day' } });
  }

  const wantsCollege = /(сред[ауе]|университет|вуз|колледж|поступить|учебн.*завед)/.test(lower);
  if (wantsCollege) {
    const cityMatch = lower.match(/(москв[аеы]|санкт[-\s]?петербург[еа]?|казан[ьи]|новосибирск[еа]?)/);
    const city = cityMatch ? cityMatch[1].replace(/^москв[аеы]$/, 'Москва').replace(/^санкт[-\s]?петербург[еа]?$/, 'Санкт-Петербург').replace(/^казан[ьи]$/, 'Казань').replace(/^новосибирск[еа]?$/, 'Новосибирск') : '';
    const rows = await env.DB.prepare(`SELECT id, name, city, specialties, rating FROM colleges ${city ? 'WHERE city = ?' : ''} ORDER BY rating DESC, id LIMIT 3`).bind(...(city ? [city] : [])).all();
    const choices = rows.results || [];
    const answer = choices.length ? `Я подобрал ${choices.length} варианта. Смотри на направления, город и рейтинг — затем открой карточку и сравни их.` : 'В текущем каталоге пока нет точного совпадения. Открой направление и сравни доступные варианты.';
    return Response.json({ success: true, reply: answer, suggestions: choices.map(item => ({ id: item.id, title: item.name, meta: `${item.city} · ${item.specialties} · рейтинг ${item.rating}`, view: 'college' })) });
  }

  const topic = assistantTopic(message);
  if (topic || /(лекци|учить|изуч|посовет|рекоменд)/.test(lower)) {
    const rows = await env.DB.prepare(`SELECT id, title, category, description, duration FROM lectures ${topic ? 'WHERE category = ?' : ''} ORDER BY views DESC, id LIMIT 3`).bind(...(topic ? [topic] : [])).all();
    const choices = rows.results || [];
    const answer = topic ? `Для темы «${topic}» я выбрал материалы, с которых проще начать.` : 'Вот материалы, которые чаще всего становятся хорошей первой точкой. Скажи тему точнее — и я сузлю выбор.';
    return Response.json({ success: true, reply: answer, suggestions: choices.map(item => ({ id: item.id, title: item.title, meta: `${item.category} · ${item.duration} минут`, view: 'lecture' })) });
  }

  // Free-form questions use the existing SkillLand AI when it is available.
  try {
    const response = await fetchWithTimeout(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/ai/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message: `${contextualPrompt}${message}`, conversation_key: `ultravis-${userId}` })
    }, 8000);
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.reply) return Response.json({ success: true, reply: String(result.reply).slice(0, 2400) });
  } catch {
    // A useful local response below keeps Ultra VIS functional if the model is busy.
  }
  return Response.json({ success: true, reply: 'Я помогу превратить запрос в действие. Напиши, например: «создай заметку по лекции», «составь задачи на день», «посоветуй лекцию по Python» или «подбери учебную среду в Москве».' });
}

async function contentApi(request, path, session, env, executionContext) {
  if (!session) return apiUnauthorized();
  const userId = Number(session.sub);
  const accountForUser = () => env.DB.prepare('SELECT is_admin, skillland_role, skillland_headline FROM users WHERE id = ?').bind(userId).first();
  const lectureMatch = path.match(/^\/api\/content\/lectures\/(\d+)(?:\/(save))?$/);
  const lectureProgressMatch = path.match(/^\/api\/content\/lectures\/(\d+)\/progress$/);
  const learningBlockMatch = path.match(/^\/api\/content\/lectures\/(\d+)\/blocks\/([a-z0-9_-]+)\/(complete|answer|practice)$/i);
  const reviewActionMatch = path.match(/^\/api\/content\/reviews\/(\d+)\/answer$/);
  const collegeMatch = path.match(/^\/api\/content\/colleges\/(\d+)(?:\/(favorite))?$/);

  if (path === '/api/content/admin/status' && request.method === 'GET') {
    const account = await accountForUser();
    return Response.json({ success: true, isAdmin: Boolean(account?.is_admin) });
  }
  if (path === '/api/content/achievements' && request.method === 'GET') {
    await env.DB.prepare("INSERT OR IGNORE INTO user_achievements (user_id, code, title, description) VALUES (?, 'welcome', 'Первый шаг', 'Ты открыл личное пространство Ultra VIS')").bind(userId).run();
    const rows = await env.DB.prepare('SELECT code, title, description, unlocked_at FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at').bind(userId).all();
    return Response.json({ success: true, data: rows.results });
  }
  if (path === '/api/content/learning-profile' && request.method === 'GET') {
    const [snapshot, account] = await Promise.all([learningSnapshot(userId, env), accountForUser()]);
    return Response.json({ success: true, data: { ...snapshot, role: account?.skillland_role || 'student', headline: account?.skillland_headline || '' } });
  }
  if (path === '/api/content/home' && request.method === 'GET') {
    return Response.json({ success: true, data: await learningHome(userId, env) });
  }
  if (path === '/api/content/skills' && request.method === 'GET') {
    const { goal, path } = await ensureLearningPath(userId, env);
    const [items, knowledge] = await Promise.all([
      env.DB.prepare(`SELECT i.title, i.concept_id, i.position, COALESCE(m.mastery_score, 0) AS mastery, COALESCE(m.confidence_score, 0) AS confidence, COALESCE(m.status, 'new') AS status
        FROM learning_path_items i LEFT JOIN user_concept_mastery m ON m.user_id = ? AND m.concept_id = i.concept_id WHERE i.path_id = ? ORDER BY i.position`).bind(userId, path.id).all(),
      env.DB.prepare('SELECT m.*, c.name FROM user_concept_mastery m JOIN concepts c ON c.id = m.concept_id WHERE m.user_id = ? ORDER BY m.mastery_score DESC').bind(userId).all()
    ]);
    return Response.json({ success: true, data: { goal, path: items.results || [], knowledge: knowledge.results || [] } });
  }
  if (path === '/api/content/reviews/today' && request.method === 'GET') {
    const rows = await env.DB.prepare("SELECT r.id, r.concept_id, r.due_at, c.name FROM reviews r JOIN concepts c ON c.id = r.concept_id WHERE r.user_id = ? AND r.status = 'due' AND datetime(r.due_at) <= datetime('now') ORDER BY r.due_at LIMIT 4").bind(userId).all();
    return Response.json({ success: true, data: rows.results || [] });
  }
  if (reviewActionMatch && request.method === 'POST') {
    const review = await env.DB.prepare("SELECT * FROM reviews WHERE id = ? AND user_id = ? AND status = 'due'").bind(Number(reviewActionMatch[1]), userId).first();
    if (!review) return Response.json({ success: false, error: 'Повторение уже завершено.' }, { status: 404 });
    const body = await requestJson(request);
    const score = body.remembered === false ? .25 : .9;
    await addEvidence(userId, env, { conceptIds: [review.concept_id], evidenceType: 'review', sourceId: `review-${review.id}`, score, weight: .6 });
    await env.DB.prepare("UPDATE reviews SET status = 'completed', last_score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").bind(score, review.id, userId).run();
    await recordLearningEvent(userId, env, 'review_completed', { conceptId: review.concept_id, metadata: { score } });
    return Response.json({ success: true, data: await refreshConceptMastery(userId, review.concept_id, env) });
  }
  if (path === '/api/content/goals' && request.method === 'POST') {
    const body = await requestJson(request);
    const title = String(body.title || '').trim().slice(0, 120);
    if (!title) return Response.json({ success: false, error: 'Напиши цель.' }, { status: 400 });
    const current = await env.DB.prepare("SELECT * FROM goals WHERE user_id = ? AND status = 'active' ORDER BY id LIMIT 1").bind(userId).first();
    if (current) {
      await env.DB.prepare('UPDATE goals SET title = ? WHERE id = ? AND user_id = ?').bind(title, current.id, userId).run();
      await env.DB.prepare('UPDATE learning_paths SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND goal_id = ?').bind(title, userId, current.id).run();
      return Response.json({ success: true, data: { id: current.id, title } });
    }
    const result = await env.DB.prepare("INSERT INTO goals (user_id, title, goal_type, target_id, status) VALUES (?, ?, 'career', 'frontend', 'active')").bind(userId, title).run();
    return Response.json({ success: true, data: { id: result.meta.last_row_id, title } }, { status: 201 });
  }

  if (path === '/api/content/lectures' && request.method === 'GET') {
    const [rows, saved] = await Promise.all([
      env.DB.prepare(`SELECT l.id, l.title, l.description, l.category, l.level, l.duration, l.author, l.image, l.views,
      COALESCE(lp.progress, 0) AS progress, lp.last_opened_at
      FROM lectures l LEFT JOIN lecture_progress lp ON lp.lecture_id = l.id AND lp.user_id = ? ORDER BY l.id`).bind(userId).all(),
      env.DB.prepare('SELECT lecture_id FROM saved_lectures WHERE user_id = ?').bind(userId).all()
    ]);
    const savedIds = new Set(saved.results.map(row => row.lecture_id));
    return Response.json({ success: true, data: rows.results.map(row => ({ ...row, progress: Number(row.progress || 0), completed: Number(row.progress || 0) >= 100, saved: savedIds.has(row.id) })) });
  }
  if (learningBlockMatch && request.method === 'POST') {
    const lectureId = Number(learningBlockMatch[1]);
    const blockKey = learningBlockMatch[2];
    const action = learningBlockMatch[3];
    const block = await env.DB.prepare('SELECT * FROM lecture_blocks WHERE lecture_id = ? AND block_key = ?').bind(lectureId, blockKey).first();
    if (!block) return Response.json({ success: false, error: 'Блок не найден.' }, { status: 404 });
    const concepts = safeConceptIds(block.concept_ids_json);
    const body = await requestJson(request);
    let result = { correct: null, mastery: [] };
    if (action === 'answer') {
      const payload = parseJson(block.payload_json, {});
      const correct = Number(body.answer) === Number(payload.correct);
      result = { correct, mastery: await addEvidence(userId, env, { conceptIds: concepts, evidenceType: 'question', sourceId: `${lectureId}:${blockKey}`, score: correct ? 1 : .2, weight: .25, assistanceLevel: Number(body.assistance_level || 0) }) };
      await recordLearningEvent(userId, env, 'question_answered', { lectureId, blockKey, metadata: { correct } });
    }
    if (action === 'practice') {
      const answer = String(body.answer || '').trim().slice(0, 4000);
      if (!answer) return Response.json({ success: false, error: 'Добавь свой вариант.' }, { status: 400 });
      const assistance = Math.max(0, Math.min(1, Number(body.assistance_level || 0)));
      result = { correct: true, mastery: await addEvidence(userId, env, { conceptIds: concepts, evidenceType: 'practice', sourceId: `${lectureId}:${blockKey}`, score: .78, weight: .85, assistanceLevel: assistance }) };
      await recordLearningEvent(userId, env, 'practice_submitted', { lectureId, blockKey, metadata: { assistance } });
    }
    const completion = await completeLearningBlock(userId, lectureId, blockKey, env);
    deferLearningMirror(userId, env, executionContext);
    return Response.json({ success: true, data: { ...result, completion } });
  }
  if (lectureMatch && !lectureMatch[2] && request.method === 'GET') {
    const lecture = await env.DB.prepare('SELECT * FROM lectures WHERE id = ?').bind(Number(lectureMatch[1])).first();
    if (!lecture) return Response.json({ success: false, error: 'Lecture not found.' }, { status: 404 });
    const session = await startLearningSession(userId, lecture.id, env);
    const [saved, progress, blocks] = await Promise.all([
      env.DB.prepare('SELECT 1 FROM saved_lectures WHERE user_id = ? AND lecture_id = ?').bind(userId, lecture.id).first(),
      env.DB.prepare('SELECT progress, completed_at FROM lecture_progress WHERE user_id = ? AND lecture_id = ?').bind(userId, lecture.id).first(),
      env.DB.prepare('SELECT block_key, position, type, title, body, payload_json, concept_ids_json, estimated_minutes FROM lecture_blocks WHERE lecture_id = ? ORDER BY position').bind(lecture.id).all()
    ]);
    deferLearningMirror(userId, env, executionContext);
    return Response.json({ success: true, data: {
      ...lecture,
      saved: Boolean(saved),
      progress: Number(session?.progress_percent ?? progress?.progress ?? 0),
      completed: session?.status === 'completed' || Number(progress?.progress || 0) >= 100,
      session: session ? { current_block_key: session.current_block_key, current_position: session.current_position, status: session.status } : null,
      blocks: (blocks.results || []).map(block => ({ ...block, payload: parseJson(block.payload_json, {}), concept_ids: safeConceptIds(block.concept_ids_json) }))
    } });
  }
  if (lectureMatch && lectureMatch[2] === 'save' && request.method === 'POST') {
    const lectureId = Number(lectureMatch[1]);
    const exists = await env.DB.prepare('SELECT 1 FROM saved_lectures WHERE user_id = ? AND lecture_id = ?').bind(userId, lectureId).first();
    if (exists) await env.DB.prepare('DELETE FROM saved_lectures WHERE user_id = ? AND lecture_id = ?').bind(userId, lectureId).run();
    else await env.DB.prepare('INSERT OR IGNORE INTO saved_lectures (user_id, lecture_id) VALUES (?, ?)').bind(userId, lectureId).run();
    return Response.json({ success: true, saved: !exists });
  }
  if (lectureProgressMatch && request.method === 'POST') {
    const lectureId = Number(lectureProgressMatch[1]);
    const exists = await env.DB.prepare('SELECT id FROM lectures WHERE id = ?').bind(lectureId).first();
    if (!exists) return Response.json({ success: false, error: 'Лекция не найдена.' }, { status: 404 });
    const body = await requestJson(request);
    const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress) || 0)));
    const completed = progress >= 100;
    await env.DB.prepare(`INSERT INTO lecture_progress (user_id, lecture_id, progress, completed_at, last_opened_at, updated_at)
      VALUES (?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, lecture_id) DO UPDATE SET progress = excluded.progress,
        completed_at = CASE WHEN excluded.progress >= 100 THEN COALESCE(lecture_progress.completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
        last_opened_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`).bind(userId, lectureId, progress, completed ? 1 : 0).run();
    if (completed) await env.DB.prepare("INSERT OR IGNORE INTO user_achievements (user_id, code, title, description) VALUES (?, ?, 'Лекция завершена', 'Ты завершил учебный материал и закрепил следующий шаг')").bind(userId, `lecture-${lectureId}-complete`).run();
    deferLearningMirror(userId, env, executionContext);
    return Response.json({ success: true, progress, completed });
  }

  if (path === '/api/content/quiz' && request.method === 'GET') {
    const item = await env.DB.prepare('SELECT primary_direction, secondary_direction, summary, created_at FROM quiz_results WHERE user_id = ? ORDER BY id DESC LIMIT 1').bind(userId).first();
    return Response.json({ success: true, data: item || null });
  }
  if (path === '/api/content/quiz' && request.method === 'POST') {
    const body = await requestJson(request);
    const result = quizAnalysis(body.answers);
    await env.DB.prepare('INSERT INTO quiz_results (user_id, primary_direction, secondary_direction, summary) VALUES (?, ?, ?, ?)').bind(userId, result.primary, result.secondary, result.summary).run();
    await env.DB.prepare("INSERT OR IGNORE INTO user_achievements (user_id, code, title, description) VALUES (?, 'direction-test', 'Своя траектория', 'Ты сформулировал первый ориентир для дальнейшего обучения')").bind(userId).run();
    deferLearningMirror(userId, env, executionContext);
    return Response.json({ success: true, data: result });
  }

  if (path === '/api/content/colleges' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM colleges ORDER BY rating DESC, id').all();
    const favorites = await env.DB.prepare('SELECT college_id FROM favorite_colleges WHERE user_id = ?').bind(userId).all();
    const favoriteIds = new Set(favorites.results.map(row => row.college_id));
    return Response.json({ success: true, data: rows.results.map(row => ({ ...row, favorite: favoriteIds.has(row.id) })) });
  }
  if (collegeMatch && !collegeMatch[2] && request.method === 'GET') {
    const college = await env.DB.prepare('SELECT * FROM colleges WHERE id = ?').bind(Number(collegeMatch[1])).first();
    if (!college) return Response.json({ success: false, error: 'College not found.' }, { status: 404 });
    return Response.json({ success: true, data: college });
  }
  if (collegeMatch && collegeMatch[2] === 'favorite' && request.method === 'POST') {
    const collegeId = Number(collegeMatch[1]);
    const exists = await env.DB.prepare('SELECT 1 FROM favorite_colleges WHERE user_id = ? AND college_id = ?').bind(userId, collegeId).first();
    if (exists) await env.DB.prepare('DELETE FROM favorite_colleges WHERE user_id = ? AND college_id = ?').bind(userId, collegeId).run();
    else await env.DB.prepare('INSERT OR IGNORE INTO favorite_colleges (user_id, college_id) VALUES (?, ?)').bind(userId, collegeId).run();
    return Response.json({ success: true, favorite: !exists });
  }
  const reviewMatch = path.match(/^\/api\/content\/colleges\/(\d+)\/reviews$/);
  if (reviewMatch && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT rating, body, created_at FROM college_reviews WHERE college_id = ? ORDER BY id DESC').bind(Number(reviewMatch[1])).all();
    return Response.json({ success: true, data: rows.results });
  }
  if (reviewMatch && request.method === 'POST') {
    const body = await requestJson(request);
    const review = String(body.body || '').trim().slice(0, 1000);
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 0));
    if (!review || !rating) return Response.json({ success: false, error: 'Добавь текст и оценку.' }, { status: 400 });
    await env.DB.prepare('INSERT INTO college_reviews (user_id, college_id, body, rating) VALUES (?, ?, ?, ?)').bind(userId, Number(reviewMatch[1]), review, rating).run();
    return Response.json({ success: true }, { status: 201 });
  }

  if (path === '/api/content/notes' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id, title, body, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC, id DESC').bind(userId).all();
    return Response.json({ success: true, data: rows.results });
  }
  if (path === '/api/content/notes' && request.method === 'POST') {
    const body = await requestJson(request);
    const title = String(body.title || 'Untitled note').trim().slice(0, 120) || 'Untitled note';
    const content = String(body.body || '').trim().slice(0, 12000);
    const result = await env.DB.prepare('INSERT INTO notes (user_id, title, body, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').bind(userId, title, content).run();
    return Response.json({ success: true, data: { id: result.meta.last_row_id, title, body: content } }, { status: 201 });
  }
  const noteMatch = path.match(/^\/api\/content\/notes\/(\d+)$/);
  if (noteMatch && request.method === 'PATCH') {
    const body = await requestJson(request);
    const title = String(body.title || 'Untitled note').trim().slice(0, 120) || 'Untitled note';
    const content = String(body.body || '').trim().slice(0, 12000);
    await env.DB.prepare('UPDATE notes SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').bind(title, content, Number(noteMatch[1]), userId).run();
    return Response.json({ success: true });
  }
  if (noteMatch && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').bind(Number(noteMatch[1]), userId).run();
    return Response.json({ success: true });
  }

  if (path === '/api/content/tasks' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id, title, completed FROM daily_tasks WHERE user_id = ? ORDER BY completed, id DESC').bind(userId).all();
    return Response.json({ success: true, data: rows.results });
  }
  if (path === '/api/content/tasks' && request.method === 'POST') {
    const body = await requestJson(request);
    const title = String(body.title || '').trim().slice(0, 160);
    if (!title) return Response.json({ success: false, error: 'Task title is required.' }, { status: 400 });
    const result = await env.DB.prepare('INSERT INTO daily_tasks (user_id, title) VALUES (?, ?)').bind(userId, title).run();
    return Response.json({ success: true, data: { id: result.meta.last_row_id, title, completed: 0 } }, { status: 201 });
  }
  const taskMatch = path.match(/^\/api\/content\/tasks\/(\d+)$/);
  if (taskMatch && request.method === 'PATCH') {
    const body = await requestJson(request);
    await env.DB.prepare('UPDATE daily_tasks SET completed = ? WHERE id = ? AND user_id = ?').bind(body.completed ? 1 : 0, Number(taskMatch[1]), userId).run();
    return Response.json({ success: true });
  }
  if (taskMatch && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM daily_tasks WHERE id = ? AND user_id = ?').bind(Number(taskMatch[1]), userId).run();
    return Response.json({ success: true });
  }
  const adminMatch = path.match(/^\/api\/content\/admin\/(lectures|colleges)(?:\/(\d+))?$/);
  if (adminMatch) {
    const account = await accountForUser();
    if (!account?.is_admin) return Response.json({ success: false, error: 'Админ-доступ нужен для этого действия.' }, { status: 403 });
    const table = adminMatch[1]; const id = Number(adminMatch[2]);
    if (request.method === 'DELETE' && id) { await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run(); return Response.json({ success:true }); }
    if ((request.method === 'POST' || request.method === 'PUT')) {
      const body = await requestJson(request);
      if (table === 'lectures') {
        const title = String(body.title || '').trim().slice(0,160); const category = String(body.category || 'Other').trim().slice(0,60);
        if (!title) return Response.json({ success:false,error:'Укажи название.' },{status:400});
        if (request.method === 'POST') await env.DB.prepare('INSERT INTO lectures (title,description,category,level,duration,author,content,image) VALUES (?,?,?,?,?,?,?,?)').bind(title,String(body.description||'').slice(0,700),category,'Beginner',Number(body.duration)||30,'Ultra VIS',String(body.content||'').slice(0,5000),'/assets/images/lectures/lecture-programming-v1.png').run();
        else await env.DB.prepare('UPDATE lectures SET title=?, description=?, category=? WHERE id=?').bind(title,String(body.description||'').slice(0,700),category,id).run();
      } else {
        const name = String(body.name || '').trim().slice(0,160); if (!name) return Response.json({success:false,error:'Укажи название.'},{status:400});
        if (request.method === 'POST') await env.DB.prepare('INSERT INTO colleges (name,city,type,description,specialties,rating,image) VALUES (?,?,?,?,?,?,?)').bind(name,String(body.city||'').slice(0,80),'University',String(body.description||'').slice(0,700),String(body.specialties||'').slice(0,500),4,'/assets/images/ultravis-hero-v2.png').run();
        else await env.DB.prepare('UPDATE colleges SET name=?, city=?, description=?, specialties=? WHERE id=?').bind(name,String(body.city||'').slice(0,80),String(body.description||'').slice(0,700),String(body.specialties||'').slice(0,500),id).run();
      }
      return Response.json({ success:true });
    }
  }
  return Response.json({ success: false, error: 'Not found.' }, { status: 404 });
}

export default {
  async fetch(request, env, executionContext) {
    const url = new URL(request.url);
    const path = url.pathname;
    const session = await readSession(request, env.JWT_SECRET);

    if (path === '/api/health') return Response.json({ ok: true, service: 'ultravis', database: 'cloudflare-d1' });
    if ((path === '/api/skillland-directory/sync' || path === '/api/skillland-directory/list') && request.method === 'POST') {
      return directoryMirrorApi(request, path, env);
    }
    if (path === '/api/skillland-directory/application' && request.method === 'POST') {
      return directoryApplicationsApi(request, env);
    }
    if (path === '/api/skillland-durable/account' && request.method === 'POST') {
      return durableAccountApi(request, env);
    }
    if (path === '/api/skillland-durable/passkeys' && request.method === 'POST') {
      return durablePasskeyApi(request, env);
    }
    if (path === '/api/skillland-durable/game-reviews' && (request.method === 'GET' || request.method === 'POST')) {
      return durableGameReviewsApi(request, env);
    }
    if (path === '/api/auth/session') return privateApi(session ? Response.json({ authenticated: true, user: session }) : Response.json({ authenticated: false }, { status: 401 }));
    if (path === '/api/auth/logout' && request.method === 'POST') return Response.json({ success: true }, { headers: { 'Set-Cookie': expiredSessionCookie() } });
    if (path === '/api/assistant' && request.method === 'POST') return privateApi(await ultraVisAssistant(request, session, env));
    if (path.startsWith('/api/content/')) return privateApi(await contentApi(request, path, session, env, executionContext));

    if (path === '/auth/skillland' && request.method === 'GET') {
      const language = ['en', 'ru', 'kk'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : '';
      const callback = `${url.origin}/auth/skillland/callback${language ? `?lang=${encodeURIComponent(language)}` : ''}`;
      return redirect(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/ultravis/continue?return_to=${encodeURIComponent(callback)}`);
    }

    if (path === '/auth/skillland/callback' && request.method === 'POST') {
      const form = await request.formData();
      const profile = await exchangeSkillLandTicket(String(form.get('ticket') || ''), env);
      const language = ['en', 'ru', 'kk'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : '';
      if (!profile) return redirect(`/?error=skillland-session-expired${language ? `&lang=${encodeURIComponent(language)}` : ''}`);
      const user = await upsertUser(profile, env);
      const token = await createSession(user, env.JWT_SECRET);
      return redirect(`/${language ? `?lang=${encodeURIComponent(language)}` : ''}`, 302, { 'Set-Cookie': sessionCookie(token) });
    }

    // Sessions created before the private SkillLand progress bridge existed are
    // refreshed once through the same SSO flow. No password is requested or
    // exposed; this simply gives the Worker its server-only mirror token.
    if (session && (path === '/' || isProtectedPagePath(path))) {
      const linkedUser = await env.DB.prepare('SELECT skillland_sync_token FROM users WHERE id = ?').bind(Number(session.sub)).first();
      if (!linkedUser?.skillland_sync_token) return redirect('/auth/skillland');
    }

    // Cloudflare Assets reserves index.html for /. The private page therefore
    // has its own canonical URL, avoiding a redirect loop for signed-in users.
    if (path === '/' && request.method === 'GET') return session ? privateAsset(request, '/dashboard', env) : env.ASSETS.fetch(assetRequest(request, '/gate'));
    if (path === '/gate' && session) return redirect('/');
    if (legacyProductRoutes[path] && session) return redirect(`/dashboard?view=${legacyProductRoutes[path]}`);
    if (isProtectedPagePath(path) && !session) return redirect('/');
    if (isProtectedPagePath(path) && session) return privateAsset(request, '/dashboard', env);
    if (path.startsWith('/api/')) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
