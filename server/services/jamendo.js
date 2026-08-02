const JAMENDO_BASE_URL = 'https://api.jamendo.com/v3.0/tracks/';

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function normalizeTrack(track) {
    return {
        id: Number(track.id),
        displayName: track.name,
        artist: track.artist_name,
        cover: track.image,
        path: track.audio,
        duration: formatDuration(track.duration),
    };
}

async function fetchTracks(params) {
    const url = new URL(JAMENDO_BASE_URL);
    url.searchParams.set('client_id', process.env.JAMENDO_CLIENT_ID);
    url.searchParams.set('format', 'json');
    url.searchParams.set('audioformat', 'mp31');
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const response = await fetch(url);
    const body = await response.json();
    return body.results.map(normalizeTrack);
}

function getPopularTracks() {
    return fetchTracks({ order: 'popularity_total', limit: 20 });
}

function searchTracks(query) {
    return fetchTracks({ search: query, limit: 20 });
}

module.exports = { getPopularTracks, searchTracks };
