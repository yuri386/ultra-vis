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

const legacyProductRoutes = {
  '/lectures.html': 'lectures',
  '/orientation.html': 'colleges',
  '/college-detail.html': 'colleges',
  '/notes.html': 'notes',
  '/myday.html': 'day',
  '/games.html': 'games',
  '/profile.html': 'profile',
  '/quotes.html': 'home'
};

function apiUnauthorized() {
  return Response.json({ success: false, error: 'Sign in via SkillLand to continue.' }, { status: 401 });
}

async function requestJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function contentApi(request, path, session, env) {
  if (!session) return apiUnauthorized();
  const userId = Number(session.sub);
  const account = await env.DB.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first();
  const isAdmin = Boolean(account?.is_admin);
  const lectureMatch = path.match(/^\/api\/content\/lectures\/(\d+)(?:\/(save))?$/);
  const collegeMatch = path.match(/^\/api\/content\/colleges\/(\d+)(?:\/(favorite))?$/);

  if (path === '/api/content/admin/status' && request.method === 'GET') return Response.json({ success: true, isAdmin });
  if (path === '/api/content/achievements' && request.method === 'GET') {
    await env.DB.prepare("INSERT OR IGNORE INTO user_achievements (user_id, code, title, description) VALUES (?, 'welcome', 'Первый шаг', 'Ты открыл личное пространство Ultra VIS')").bind(userId).run();
    const rows = await env.DB.prepare('SELECT code, title, description, unlocked_at FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at').bind(userId).all();
    return Response.json({ success: true, data: rows.results });
  }

  if (path === '/api/content/lectures' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id, title, description, category, level, duration, author, image, views FROM lectures ORDER BY id').all();
    const saved = await env.DB.prepare('SELECT lecture_id FROM saved_lectures WHERE user_id = ?').bind(userId).all();
    const savedIds = new Set(saved.results.map(row => row.lecture_id));
    return Response.json({ success: true, data: rows.results.map(row => ({ ...row, saved: savedIds.has(row.id) })) });
  }
  if (lectureMatch && !lectureMatch[2] && request.method === 'GET') {
    const lecture = await env.DB.prepare('SELECT * FROM lectures WHERE id = ?').bind(Number(lectureMatch[1])).first();
    if (!lecture) return Response.json({ success: false, error: 'Lecture not found.' }, { status: 404 });
    const saved = await env.DB.prepare('SELECT 1 FROM saved_lectures WHERE user_id = ? AND lecture_id = ?').bind(userId, lecture.id).first();
    return Response.json({ success: true, data: { ...lecture, saved: Boolean(saved) } });
  }
  if (lectureMatch && lectureMatch[2] === 'save' && request.method === 'POST') {
    const lectureId = Number(lectureMatch[1]);
    const exists = await env.DB.prepare('SELECT 1 FROM saved_lectures WHERE user_id = ? AND lecture_id = ?').bind(userId, lectureId).first();
    if (exists) await env.DB.prepare('DELETE FROM saved_lectures WHERE user_id = ? AND lecture_id = ?').bind(userId, lectureId).run();
    else await env.DB.prepare('INSERT OR IGNORE INTO saved_lectures (user_id, lecture_id) VALUES (?, ?)').bind(userId, lectureId).run();
    return Response.json({ success: true, saved: !exists });
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
    if (!isAdmin) return Response.json({ success: false, error: 'Админ-доступ нужен для этого действия.' }, { status: 403 });
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
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const session = await readSession(request, env.JWT_SECRET);

    if (path === '/api/health') return Response.json({ ok: true, service: 'ultravis', database: 'cloudflare-d1' });
    if (path === '/api/auth/session') return session ? Response.json({ authenticated: true, user: session }) : Response.json({ authenticated: false }, { status: 401 });
    if (path === '/api/auth/logout' && request.method === 'POST') return Response.json({ success: true }, { headers: { 'Set-Cookie': expiredSessionCookie() } });
    if (path.startsWith('/api/content/')) return contentApi(request, path, session, env);

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
    if (legacyProductRoutes[path] && session) return redirect(`/dashboard?view=${legacyProductRoutes[path]}`);
    if (isProtectedPagePath(path) && !session) return redirect('/');
    if (isProtectedPagePath(path) && session) return env.ASSETS.fetch(assetRequest(request, '/dashboard'));
    if (path.startsWith('/api/')) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
