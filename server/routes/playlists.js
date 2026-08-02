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

function rowToSong(row) {
    return {
        id: row.track_id,
        displayName: row.title,
        artist: row.artist,
        cover: row.cover_url,
        path: row.audio_url,
        duration: row.duration,
    };
}

router.get('/', (req, res) => {
    const playlists = db
        .prepare('SELECT * FROM playlists WHERE user_id = ?')
        .all(req.session.userId);

    const conCanciones = playlists.map((playlist) => {
        const songs = db
            .prepare('SELECT * FROM playlist_songs WHERE playlist_id = ?')
            .all(playlist.id)
            .map(rowToSong);
        return { ...playlist, songs };
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

    res.json({ id: Number(info.lastInsertRowid), user_id: req.session.userId, nombre, songs: [] });
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

    const { id, displayName, artist, cover, path, duration } = req.body;
    if (!id || !displayName || !artist || !cover || !path || !duration) {
        return res.status(400).json({ error: 'Faltan datos de la canción.' });
    }

    db.prepare(
        'INSERT INTO playlist_songs (playlist_id, track_id, title, artist, cover_url, audio_url, duration) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(playlist.id, Number(id), displayName, artist, cover, path, duration);

    res.json({ ok: true });
});

router.delete('/:id/songs/:trackId', (req, res) => {
    const playlist = getOwnedPlaylist(req.params.id, req.session.userId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist no encontrada.' });
    }

    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND track_id = ?').run(
        playlist.id,
        Number(req.params.trackId)
    );
    res.json({ ok: true });
});

module.exports = router;
