const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAdmin);

router.get('/stats', async (req, res) => {
    const { totalUsuarios } = await db.get('SELECT COUNT(*) AS totalUsuarios FROM users');
    const { totalPlaylists } = await db.get('SELECT COUNT(*) AS totalPlaylists FROM playlists');
    res.json({ totalUsuarios, totalPlaylists });
});

router.get('/users', async (req, res) => {
    const users = await db.all(
        `SELECT u.id, u.nombre, u.apellido, u.email, u.plan, u.created_at,
                COUNT(p.id) AS cantidadPlaylists
         FROM users u
         LEFT JOIN playlists p ON p.user_id = u.id
         GROUP BY u.id
         ORDER BY u.id`
    );

    res.json(users);
});

router.get('/users/:id/playlists', async (req, res) => {
    const playlists = await db.all(
        `SELECT pl.id, pl.nombre, COUNT(ps.id) AS cantidadCanciones
         FROM playlists pl
         LEFT JOIN playlist_songs ps ON ps.playlist_id = pl.id
         WHERE pl.user_id = ?
         GROUP BY pl.id`,
        req.params.id
    );

    res.json(playlists);
});

router.patch('/users/:id', async (req, res) => {
    const { plan } = req.body;
    if (!plan) {
        return res.status(400).json({ error: 'Falta el plan.' });
    }

    await db.run('UPDATE users SET plan = ? WHERE id = ?', plan, req.params.id);
    res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
    if (Number(req.params.id) === req.session.userId) {
        return res.status(400).json({ error: 'No podés eliminar tu propia cuenta de administrador.' });
    }

    const playlistIds = (await db.all('SELECT id FROM playlists WHERE user_id = ?', req.params.id)).map(
        (p) => p.id
    );

    await Promise.all(playlistIds.map((id) => db.run('DELETE FROM playlist_songs WHERE playlist_id = ?', id)));
    await db.run('DELETE FROM playlists WHERE user_id = ?', req.params.id);
    await db.run('DELETE FROM users WHERE id = ?', req.params.id);

    res.json({ ok: true });
});

module.exports = router;
