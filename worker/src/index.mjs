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

function assetRequest(request, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  return new Request(assetUrl, request);
}

function cleanProfile(profile) {
  const email = String(profile?.email || '').trim().toLowerCase();
  const fullName = String(profile?.full_name || profile?.name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const id = Number(profile?.id);
  if (!Number.isInteger(id) || id < 1 || !email.includes('@') || fullName.length < 2) return null;
  return { id, email, fullName };
}

function nicknameFor(profile) {
  return `sl${profile.id}`;
}

async function exchangeSkillLandTicket(ticket, env) {
  const response = await fetch(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/ultravis/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ticket })
  });
  if (!response.ok) return null;
  const body = await response.json();
  return cleanProfile(body?.user);
}

async function upsertUser(profile, env) {
  const existing = await env.DB.prepare('SELECT id, skillland_user_id, email, full_name, nickname FROM users WHERE skillland_user_id = ? OR email = ? LIMIT 1')
    .bind(profile.id, profile.email)
    .first();
  if (existing) {
    await env.DB.prepare('UPDATE users SET skillland_user_id = ?, email = ?, full_name = ?, last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(profile.id, profile.email, profile.fullName, existing.id)
      .run();
    return { ...existing, skillland_user_id: profile.id, email: profile.email, full_name: profile.fullName };
  }
  const nickname = nicknameFor(profile);
  const inserted = await env.DB.prepare('INSERT INTO users (skillland_user_id, email, full_name, nickname) VALUES (?, ?, ?, ?)')
    .bind(profile.id, profile.email, profile.fullName, nickname)
    .run();
  return { id: inserted.meta.last_row_id, skillland_user_id: profile.id, email: profile.email, full_name: profile.fullName, nickname };
}

function isProtectedPagePath(pathname) {
  return pathname === '/dashboard' || pathname === '/dashboard.html' || pathname === '/index' || pathname === '/index.html' || (pathname.endsWith('.html') && pathname !== '/gate.html');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const session = await readSession(request, env.JWT_SECRET);

    if (path === '/api/health') return Response.json({ ok: true, service: 'ultravis', database: 'cloudflare-d1' });
    if (path === '/api/auth/session') return session ? Response.json({ authenticated: true, user: session }) : Response.json({ authenticated: false }, { status: 401 });
    if (path === '/api/auth/logout' && request.method === 'POST') return Response.json({ success: true }, { headers: { 'Set-Cookie': expiredSessionCookie() } });

    if (path === '/auth/skillland' && request.method === 'GET') {
      const callback = `${url.origin}/auth/skillland/callback`;
      return redirect(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/ultravis/continue?return_to=${encodeURIComponent(callback)}`);
    }

    if (path === '/auth/skillland/callback' && request.method === 'POST') {
      const form = await request.formData();
      const profile = await exchangeSkillLandTicket(String(form.get('ticket') || ''), env);
      if (!profile) return redirect('/?error=skillland-session-expired');
      const user = await upsertUser(profile, env);
      const token = await createSession(user, env.JWT_SECRET);
      return redirect('/', 302, { 'Set-Cookie': sessionCookie(token) });
    }

    // Cloudflare Assets reserves index.html for /. The private page therefore
    // has its own canonical URL, avoiding a redirect loop for signed-in users.
    if (path === '/' && request.method === 'GET') return env.ASSETS.fetch(assetRequest(request, session ? '/dashboard' : '/gate'));
    if (path === '/gate' && session) return redirect('/');
    if (isProtectedPagePath(path) && !session) return redirect('/');
    if (isProtectedPagePath(path) && session) return env.ASSETS.fetch(assetRequest(request, '/dashboard'));
    if (path.startsWith('/api/')) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
