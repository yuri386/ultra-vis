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
  return {
    id,
    email,
    fullName,
    role: profile?.role === 'employer' ? 'employer' : 'student',
    headline: String(profile?.headline || '').trim().slice(0, 180),
    syncToken: String(profile?.sync_token || '').trim()
  };
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
  const profile = cleanProfile({ ...(body?.user || {}), sync_token: body?.sync_token });
  return profile;
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
    env.DB.prepare(`SELECT l.id, l.title, l.category, lp.progress, lp.last_opened_at
      FROM lecture_progress lp JOIN lectures l ON l.id = lp.lecture_id
      WHERE lp.user_id = ? ORDER BY lp.last_opened_at DESC LIMIT 1`).bind(userId).first(),
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

async function mirrorLearningToSkillLand(userId, env) {
  const user = await env.DB.prepare('SELECT skillland_sync_token FROM users WHERE id = ?').bind(userId).first();
  if (!user?.skillland_sync_token) return;
  const snapshot = await learningSnapshot(userId, env);
  try {
    await fetch(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/ultravis/progress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user.skillland_sync_token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ summary: snapshot })
    });
  } catch {
    // Study data is still safely stored in D1. The next meaningful action retries the mirror.
  }
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
    const response = await fetch(`${env.SKILLLAND_URL.replace(/\/$/, '')}/api/ai/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message, conversation_key: `ultravis-${userId}` })
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.reply) return Response.json({ success: true, reply: String(result.reply).slice(0, 2400) });
  } catch {
    // A useful local response below keeps Ultra VIS functional if the model is busy.
  }
  return Response.json({ success: true, reply: 'Я помогу превратить запрос в действие. Напиши, например: «создай заметку по лекции», «составь задачи на день», «посоветуй лекцию по Python» или «подбери учебную среду в Москве».' });
}

async function contentApi(request, path, session, env) {
  if (!session) return apiUnauthorized();
  const userId = Number(session.sub);
  const account = await env.DB.prepare('SELECT is_admin, skillland_role, skillland_headline FROM users WHERE id = ?').bind(userId).first();
  const isAdmin = Boolean(account?.is_admin);
  const lectureMatch = path.match(/^\/api\/content\/lectures\/(\d+)(?:\/(save))?$/);
  const lectureProgressMatch = path.match(/^\/api\/content\/lectures\/(\d+)\/progress$/);
  const collegeMatch = path.match(/^\/api\/content\/colleges\/(\d+)(?:\/(favorite))?$/);

  if (path === '/api/content/admin/status' && request.method === 'GET') return Response.json({ success: true, isAdmin });
  if (path === '/api/content/achievements' && request.method === 'GET') {
    await env.DB.prepare("INSERT OR IGNORE INTO user_achievements (user_id, code, title, description) VALUES (?, 'welcome', 'Первый шаг', 'Ты открыл личное пространство Ultra VIS')").bind(userId).run();
    const rows = await env.DB.prepare('SELECT code, title, description, unlocked_at FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at').bind(userId).all();
    return Response.json({ success: true, data: rows.results });
  }
  if (path === '/api/content/learning-profile' && request.method === 'GET') {
    const snapshot = await learningSnapshot(userId, env);
    return Response.json({ success: true, data: { ...snapshot, role: account?.skillland_role || 'student', headline: account?.skillland_headline || '' } });
  }

  if (path === '/api/content/lectures' && request.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT l.id, l.title, l.description, l.category, l.level, l.duration, l.author, l.image, l.views,
      COALESCE(lp.progress, 0) AS progress, lp.last_opened_at
      FROM lectures l LEFT JOIN lecture_progress lp ON lp.lecture_id = l.id AND lp.user_id = ? ORDER BY l.id`).bind(userId).all();
    const saved = await env.DB.prepare('SELECT lecture_id FROM saved_lectures WHERE user_id = ?').bind(userId).all();
    const savedIds = new Set(saved.results.map(row => row.lecture_id));
    return Response.json({ success: true, data: rows.results.map(row => ({ ...row, progress: Number(row.progress || 0), completed: Number(row.progress || 0) >= 100, saved: savedIds.has(row.id) })) });
  }
  if (lectureMatch && !lectureMatch[2] && request.method === 'GET') {
    const lecture = await env.DB.prepare('SELECT * FROM lectures WHERE id = ?').bind(Number(lectureMatch[1])).first();
    if (!lecture) return Response.json({ success: false, error: 'Lecture not found.' }, { status: 404 });
    await env.DB.prepare(`INSERT INTO lecture_progress (user_id, lecture_id, progress, last_opened_at, updated_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, lecture_id) DO UPDATE SET last_opened_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`).bind(userId, lecture.id).run();
    const saved = await env.DB.prepare('SELECT 1 FROM saved_lectures WHERE user_id = ? AND lecture_id = ?').bind(userId, lecture.id).first();
    const progress = await env.DB.prepare('SELECT progress, completed_at FROM lecture_progress WHERE user_id = ? AND lecture_id = ?').bind(userId, lecture.id).first();
    await mirrorLearningToSkillLand(userId, env);
    return Response.json({ success: true, data: { ...lecture, saved: Boolean(saved), progress: Number(progress?.progress || 0), completed: Number(progress?.progress || 0) >= 100 } });
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
    await mirrorLearningToSkillLand(userId, env);
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
    await mirrorLearningToSkillLand(userId, env);
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
    if (path === '/api/assistant' && request.method === 'POST') return ultraVisAssistant(request, session, env);
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

    // Sessions created before the private SkillLand progress bridge existed are
    // refreshed once through the same SSO flow. No password is requested or
    // exposed; this simply gives the Worker its server-only mirror token.
    if (session && (path === '/' || isProtectedPagePath(path))) {
      const linkedUser = await env.DB.prepare('SELECT skillland_sync_token FROM users WHERE id = ?').bind(Number(session.sub)).first();
      if (!linkedUser?.skillland_sync_token) return redirect('/auth/skillland');
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
