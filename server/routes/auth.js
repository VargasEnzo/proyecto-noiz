const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const requireAuthApi = require('../middleware/requireAuthApi');

const router = express.Router();

router.post('/register', (req, res) => {
    const { nombre, apellido, email, password, repetirPassword } = req.body;

    if (!nombre || !apellido || !email || !password) {
        return res.status(400).json({ error: 'Completá todos los campos.' });
    }
    if (password !== repetirPassword) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    const existente = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existente) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const info = db
        .prepare('INSERT INTO users (nombre, apellido, email, password_hash) VALUES (?, ?, ?, ?)')
        .run(nombre, apellido, email, passwordHash);

    req.session.userId = Number(info.lastInsertRowid);
    res.json({ ok: true });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    req.session.userId = user.id;
    res.json({ ok: true });
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

router.get('/me', requireAuthApi, (req, res) => {
    const user = db
        .prepare('SELECT id, nombre, apellido, email, avatar, plan, created_at FROM users WHERE id = ?')
        .get(req.session.userId);

    res.json({ ...user, isAdmin: user.email === process.env.ADMIN_EMAIL });
});

router.put('/me', requireAuthApi, (req, res) => {
    const { nombre, apellido, avatar } = req.body;

    if (!nombre || !apellido) {
        return res.status(400).json({ error: 'Nombre y apellido son obligatorios.' });
    }

    if (avatar) {
        db.prepare('UPDATE users SET nombre = ?, apellido = ?, avatar = ? WHERE id = ?').run(
            nombre,
            apellido,
            avatar,
            req.session.userId
        );
    } else {
        db.prepare('UPDATE users SET nombre = ?, apellido = ? WHERE id = ?').run(
            nombre,
            apellido,
            req.session.userId
        );
    }

    const user = db
        .prepare('SELECT id, nombre, apellido, email, avatar, plan, created_at FROM users WHERE id = ?')
        .get(req.session.userId);

    res.json({ ...user, isAdmin: user.email === process.env.ADMIN_EMAIL });
});

module.exports = router;
