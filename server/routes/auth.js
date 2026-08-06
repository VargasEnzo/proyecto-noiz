const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const db = require('../db');
const requireAuthApi = require('../middleware/requireAuthApi');
const createLimiter = require('../middleware/apiLimiter');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/mailer');
const { markOnline } = require('../services/presence');

const router = express.Router();

const authLimiter = createLimiter({
    limit: 10,
    message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});

function createToken(hoursValid) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000).toISOString();
    return { rawToken, tokenHash, expiresAt };
}

async function sendVerificationFor(user, req) {
    const { rawToken, tokenHash, expiresAt } = createToken(24);

    await db.run(
        'INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        user.id,
        tokenHash,
        expiresAt
    );

    const verifyUrl = `${req.protocol}://${req.get('host')}/api/verify-email?token=${rawToken}`;

    try {
        await sendVerificationEmail(user.email, verifyUrl);
    } catch (err) {
        console.error(err);
    }
}

router.post('/register', authLimiter, async (req, res) => {
    const { nombre, apellido, email, password, repetirPassword } = req.body;

    if (!nombre || !apellido || !email || !password) {
        return res.status(400).json({ error: 'Completá todos los campos.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'El email no es válido.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (password !== repetirPassword) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    const existente = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existente) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const info = await db.run(
        'INSERT INTO users (nombre, apellido, email, password_hash, email_verified) VALUES (?, ?, ?, ?, 0)',
        nombre,
        apellido,
        email,
        passwordHash
    );

    await sendVerificationFor({ id: Number(info.lastInsertRowid), email }, req);

    res.json({ ok: true, message: 'Te enviamos un mail para confirmar tu cuenta. Revisá tu bandeja de entrada.' });
});

router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;

    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    if (!user.email_verified) {
        return res.status(403).json({ error: 'Confirmá tu email antes de iniciar sesión.', unverified: true });
    }

    req.session.userId = user.id;
    res.json({ ok: true });
});

router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.redirect('/html/login.html?verified=0');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const verification = await db.get(
        'SELECT * FROM email_verifications WHERE token_hash = ? AND used = 0',
        tokenHash
    );

    if (!verification || new Date(verification.expires_at) < new Date()) {
        return res.redirect('/html/login.html?verified=0');
    }

    await db.run('UPDATE users SET email_verified = 1 WHERE id = ?', verification.user_id);
    await db.run('UPDATE email_verifications SET used = 1 WHERE id = ?', verification.id);

    res.redirect('/html/login.html?verified=1');
});

router.post('/resend-verification', authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Falta el email.' });
    }

    const user = await db.get('SELECT id, email FROM users WHERE email = ? AND email_verified = 0', email);
    if (user) {
        await sendVerificationFor(user, req);
    }

    res.json({ ok: true, message: 'Si la cuenta existe y no está verificada, te reenviamos el mail.' });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Falta el email.' });
    }

    const user = await db.get('SELECT id FROM users WHERE email = ?', email);

    if (user) {
        const { rawToken, tokenHash, expiresAt } = createToken(1);

        await db.run(
            'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            user.id,
            tokenHash,
            expiresAt
        );

        const resetUrl = `${req.protocol}://${req.get('host')}/html/reset-password.html?token=${rawToken}`;

        try {
            await sendPasswordResetEmail(email, resetUrl);
        } catch (err) {
            console.error(err);
        }
    }

    res.json({ ok: true, message: 'Si el email existe, te enviamos un link para restablecer tu contraseña.' });
});

router.post('/reset-password', authLimiter, async (req, res) => {
    const { token, password, repetirPassword } = req.body;

    if (!token || !password) {
        return res.status(400).json({ error: 'Faltan datos.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (password !== repetirPassword) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await db.get('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0', tokenHash);

    if (!reset || new Date(reset.expires_at) < new Date()) {
        return res.status(400).json({ error: 'El link no es válido o venció. Pedí uno nuevo.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', passwordHash, reset.user_id);
    await db.run('UPDATE password_resets SET used = 1 WHERE id = ?', reset.id);

    res.json({ ok: true });
});

router.post('/heartbeat', requireAuthApi, (req, res) => {
    markOnline(req.session.userId);
    res.json({ ok: true });
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

router.get('/me', requireAuthApi, async (req, res) => {
    const user = await db.get(
        'SELECT id, nombre, apellido, email, avatar, plan, created_at FROM users WHERE id = ?',
        req.session.userId
    );

    res.json({ ...user, isAdmin: user.email === process.env.ADMIN_EMAIL });
});

router.put('/me', requireAuthApi, async (req, res) => {
    const { nombre, apellido, avatar } = req.body;

    if (!nombre || !apellido) {
        return res.status(400).json({ error: 'Nombre y apellido son obligatorios.' });
    }

    if (avatar) {
        await db.run(
            'UPDATE users SET nombre = ?, apellido = ?, avatar = ? WHERE id = ?',
            nombre,
            apellido,
            avatar,
            req.session.userId
        );
    } else {
        await db.run('UPDATE users SET nombre = ?, apellido = ? WHERE id = ?', nombre, apellido, req.session.userId);
    }

    const user = await db.get(
        'SELECT id, nombre, apellido, email, avatar, plan, created_at FROM users WHERE id = ?',
        req.session.userId
    );

    res.json({ ...user, isAdmin: user.email === process.env.ADMIN_EMAIL });
});

module.exports = router;
