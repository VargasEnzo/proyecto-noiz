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
        .prepare('SELECT id, nombre, apellido, email FROM users WHERE id = ?')
        .get(req.session.userId);

    res.json(user);
});

module.exports = router;
