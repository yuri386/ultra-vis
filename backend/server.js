/**
 * Ultra VIS application server.
 *
 * Access to the product is intentionally granted only after a SkillLand SSO
 * hand-off. Ultra VIS keeps its own local account record and session cookie;
 * it never receives or stores a SkillLand password.
 */
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = Number(process.env.PORT || 8000);
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? '' : 'ultravis-local-jwt-secret');
const SSO_SECRET = process.env.ULTRAVIS_SSO_SECRET || (isProduction ? '' : 'ultravis-local-sso-secret');
const SKILLLAND_URL = (process.env.SKILLLAND_URL || 'https://skillland-platform-yuri386.onrender.com').replace(/\/$/, '');
const APP_URL = (process.env.APP_URL || (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : `http://localhost:${PORT}`)).replace(/\/$/, '');
const frontendDir = path.join(__dirname, '../frontend');

if (isProduction && (!JWT_SECRET || !SSO_SECRET)) {
    throw new Error('JWT_SECRET and ULTRAVIS_SSO_SECRET must be configured in production.');
}

const { authLimiter } = require('./middleware/auth');
const { db } = require('./database');

app.set('trust proxy', 1);
app.use(cors({
    origin: SKILLLAND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function parseCookies(header = '') {
    return header.split(';').reduce((cookies, pair) => {
        const index = pair.indexOf('=');
        if (index < 0) return cookies;
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        if (key) cookies[key] = decodeURIComponent(value);
        return cookies;
    }, {});
}

function readToken(req) {
    const bearer = req.headers.authorization?.split(' ')[1];
    return bearer || req.cookies?.ultravis_session || '';
}

function setSession(res, user) {
    const token = jwt.sign({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        isAdmin: Boolean(user.isAdmin),
        provider: 'skillland'
    }, JWT_SECRET, { expiresIn: '30d' });
    const secure = isProduction ? '; Secure' : '';
    res.setHeader('Set-Cookie', `ultravis_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}${secure}`);
    return token;
}

function clearSession(res) {
    const secure = isProduction ? '; Secure' : '';
    res.setHeader('Set-Cookie', `ultravis_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

app.use((req, res, next) => {
    req.cookies = parseCookies(req.headers.cookie || '');
    req.user = null;
    const token = readToken(req);
    if (token) {
        try { req.user = jwt.verify(token, JWT_SECRET); } catch (_) { /* expired or invalid session */ }
    }
    next();
});

function requireSession(req, res, next) {
    if (!req.user) return res.redirect('/');
    next();
}

function base64url(value) {
    return Buffer.from(value).toString('base64url');
}

function verifySkillLandTicket(ticket) {
    const [encodedPayload, signature] = String(ticket || '').split('.');
    if (!encodedPayload || !signature || !SSO_SECRET) return null;
    const expected = crypto.createHmac('sha256', SSO_SECRET).update(encodedPayload).digest('base64url');
    const actual = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) return null;
    try {
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (payload.aud !== 'ultravis' || !payload.exp || Number(payload.exp) < Date.now()) return null;
        if (!payload.user?.id || !payload.user?.email) return null;
        return payload.user;
    } catch (_) {
        return null;
    }
}

function nameParts(fullName, email) {
    const pieces = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    const fallback = String(email).split('@')[0].replace(/[^a-z0-9]/ig, '').slice(0, 40) || 'SkillLand';
    return { firstName: (pieces[0] || fallback).slice(0, 50), lastName: (pieces.slice(1).join(' ') || 'Member').slice(0, 50) };
}

function uniqueNickname(email, skilllandId, callback) {
    const stem = `sl${String(skilllandId).replace(/\D/g, '').slice(0, 18) || crypto.randomBytes(4).toString('hex')}`;
    db.get('SELECT id FROM users WHERE nickname = ?', [stem], (error, row) => {
        if (error) return callback(error);
        callback(null, row ? `${stem}${crypto.randomBytes(3).toString('hex')}` : stem);
    });
}

function upsertSkillLandUser(profile, callback) {
    const email = String(profile.email).trim().toLowerCase();
    const { firstName, lastName } = nameParts(profile.full_name || profile.name, email);
    db.get('SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1', [email], (error, existing) => {
        if (error) return callback(error);
        if (existing) {
            if (existing.isBlocked) return callback(new Error('This Ultra VIS account is blocked.'));
            db.run('UPDATE users SET firstName = ?, lastName = ?, lastLoginAt = CURRENT_TIMESTAMP, isVerified = 1 WHERE id = ?', [firstName, lastName, existing.id], updateError => {
                if (updateError) return callback(updateError);
                callback(null, { ...existing, firstName, lastName, isVerified: 1 });
            });
            return;
        }
        uniqueNickname(email, profile.id, (nicknameError, nickname) => {
            if (nicknameError) return callback(nicknameError);
            const generatedPassword = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);
            db.run(
                `INSERT INTO users (firstName, lastName, email, nickname, password, userType, isVerified, lastLoginAt)
                 VALUES (?, ?, ?, ?, ?, 'schoolkid', 1, CURRENT_TIMESTAMP)`,
                [firstName, lastName, email, nickname, generatedPassword],
                function insertUser(insertError) {
                    if (insertError) return callback(insertError);
                    callback(null, { id: this.lastID, firstName, lastName, email, nickname, isAdmin: 0 });
                }
            );
        });
    });
}

// SkillLand SSO journey: Ultra VIS → SkillLand session check → one-time signed ticket → Ultra VIS.
app.get('/auth/skillland', (req, res) => {
    const callbackUrl = `${APP_URL}/auth/skillland/callback`;
    res.redirect(`${SKILLLAND_URL}/api/ultravis/continue?return_to=${encodeURIComponent(callbackUrl)}`);
});

app.get('/auth/skillland/callback', (req, res) => {
    const profile = verifySkillLandTicket(req.query.ticket);
    if (!profile) return res.redirect('/?error=skillland-session-expired');
    upsertSkillLandUser(profile, (error, user) => {
        if (error) {
            console.error('SkillLand SSO account error:', error.message);
            return res.redirect('/?error=skillland-account-error');
        }
        setSession(res, user);
        res.redirect('/');
    });
});

app.get('/api/auth/session', (req, res) => {
    if (!req.user) return res.status(401).json({ authenticated: false });
    res.json({ authenticated: true, user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
    clearSession(res);
    res.json({ success: true });
});

const registerRoute = (endpoint, filePath) => {
    const fullPath = path.join(__dirname, filePath + '.js');
    if (fs.existsSync(fullPath)) app.use(endpoint, require(filePath));
};

// Legacy endpoints are kept for existing content, while new visitors only enter through SkillLand.
registerRoute('/api/auth', './routes/auth');
registerRoute('/api/colleges', './routes/colleges');
registerRoute('/api/lectures', './routes/lectures');
registerRoute('/api/admin', './routes/admin');

app.get('/api', (req, res) => res.json({ success: true, message: 'Ultra VIS API ready' }));
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ultravis' }));

// The first screen is public solely as a sign-in gate; every product page requires a session.
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDir, req.user ? 'index.html' : 'gate.html'));
});
app.get(/.*\.html$/, requireSession, (req, res) => {
    const requested = path.basename(req.path);
    if (!requested || requested === 'gate.html') return res.redirect('/');
    res.sendFile(path.join(frontendDir, requested));
});

app.use(express.static(frontendDir, { index: false }));
app.get('/*splat', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ success: false });
    res.redirect(req.user ? '/' : '/');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ultra VIS: ${APP_URL}`);
});
