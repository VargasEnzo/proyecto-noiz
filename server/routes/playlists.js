const express = require('express');
const db = require('../db');
const requireAuthApi = require('../middleware/requireAuthApi');

const router = express.Router();

router.use(requireAuthApi);

function getOwnedPlaylist(playlistId, userId) {
    return db
        .prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?')
        .get(playlistId, userId);
}

router.get('/', (req, res) => {
    const playlists = db
        .prepare('SELECT * FROM playlists WHERE user_id = ?')
        .all(req.session.userId);

    const conCanciones = playlists.map((playlist) => {
        const songIds = db
            .prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ?')
            .all(playlist.id)
            .map((row) => row.song_id);
        return { ...playlist, songIds };
    });

    res.json(conCanciones);
});

router.post('/', (req, res) => {
    const { nombre } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: 'La playlist necesita un nombre.' });
    }

    const info = db
        .prepare('INSERT INTO playlists (user_id, nombre) VALUES (?, ?)')
        .run(req.session.userId, nombre);

    res.json({ id: Number(info.lastInsertRowid), user_id: req.session.userId, nombre, songIds: [] });
});

router.delete('/:id', (req, res) => {
    const playlist = getOwnedPlaylist(req.params.id, req.session.userId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist no encontrada.' });
    }

    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(playlist.id);
    db.prepare('DELETE FROM playlists WHERE id = ?').run(playlist.id);
    res.json({ ok: true });
});

router.post('/:id/songs', (req, res) => {
    const playlist = getOwnedPlaylist(req.params.id, req.session.userId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist no encontrada.' });
    }

    const songId = Number(req.body.songId);
    if (!Number.isInteger(songId)) {
        return res.status(400).json({ error: 'songId inválido.' });
    }

    db.prepare('INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)').run(playlist.id, songId);
    res.json({ ok: true });
});

router.delete('/:id/songs/:songId', (req, res) => {
    const playlist = getOwnedPlaylist(req.params.id, req.session.userId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist no encontrada.' });
    }

    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(
        playlist.id,
        Number(req.params.songId)
    );
    res.json({ ok: true });
});

module.exports = router;
