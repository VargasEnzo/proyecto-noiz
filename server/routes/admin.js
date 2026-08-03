const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAdmin);

router.get('/stats', (req, res) => {
    const { totalUsuarios } = db.prepare('SELECT COUNT(*) AS totalUsuarios FROM users').get();
    const { totalPlaylists } = db.prepare('SELECT COUNT(*) AS totalPlaylists FROM playlists').get();
    res.json({ totalUsuarios, totalPlaylists });
});

router.get('/users', (req, res) => {
    const users = db
        .prepare(
            `SELECT u.id, u.nombre, u.apellido, u.email, u.plan, u.created_at,
                    COUNT(p.id) AS cantidadPlaylists
             FROM users u
             LEFT JOIN playlists p ON p.user_id = u.id
             GROUP BY u.id
             ORDER BY u.id`
        )
        .all();

    res.json(users);
});

router.get('/users/:id/playlists', (req, res) => {
    const playlists = db
        .prepare(
            `SELECT pl.id, pl.nombre, COUNT(ps.id) AS cantidadCanciones
             FROM playlists pl
             LEFT JOIN playlist_songs ps ON ps.playlist_id = pl.id
             WHERE pl.user_id = ?
             GROUP BY pl.id`
        )
        .all(req.params.id);

    res.json(playlists);
});

router.patch('/users/:id', (req, res) => {
    const { plan } = req.body;
    if (!plan) {
        return res.status(400).json({ error: 'Falta el plan.' });
    }

    db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, req.params.id);
    res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
    if (Number(req.params.id) === req.session.userId) {
        return res.status(400).json({ error: 'No podés eliminar tu propia cuenta de administrador.' });
    }

    const playlistIds = db
        .prepare('SELECT id FROM playlists WHERE user_id = ?')
        .all(req.params.id)
        .map((p) => p.id);

    playlistIds.forEach((id) => db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(id));
    db.prepare('DELETE FROM playlists WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    res.json({ ok: true });
});

module.exports = router;
