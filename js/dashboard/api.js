// --- Llamadas a la API ---

export async function fetchCurrentUser() {
    const response = await fetch('/api/me');
    if (!response.ok) return null;
    return response.json();
}

export async function updateProfileRequest(datos) {
    const response = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return response.json();
}

export async function fetchPopularTracks() {
    const response = await fetch('/api/music/popular');
    if (!response.ok) return [];
    return response.json();
}

export async function fetchRecommendations() {
    const response = await fetch('/api/music/recommendations');
    if (!response.ok) return [];
    return response.json();
}

export async function searchTracksRequest(query) {
    const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    return response.json();
}

export async function tracksByGenreRequest(tag) {
    const response = await fetch(`/api/music/genre?tag=${encodeURIComponent(tag)}`);
    if (!response.ok) return [];
    return response.json();
}

export async function fetchPlaylists() {
    const response = await fetch('/api/playlists');
    if (!response.ok) return [];
    return response.json();
}

export async function createPlaylist(nombre) {
    const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
    });
    return response.json();
}

export async function deletePlaylistRequest(id) {
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
}

export async function addSongToPlaylistRequest(playlistId, song) {
    await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(song),
    });
}

export async function removeSongFromPlaylistRequest(playlistId, songId) {
    await fetch(`/api/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
}

export function sendHeartbeat() {
    fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
}

// --- Admin ---

export async function fetchAdminStats() {
    const response = await fetch('/api/admin/stats');
    if (!response.ok) return { totalUsuarios: 0, totalPlaylists: 0 };
    return response.json();
}

export async function fetchAdminYoutubeQuota() {
    const response = await fetch('/api/admin/youtube-quota');
    if (!response.ok) return { unitsUsed: 0, dailyLimit: 0 };
    return response.json();
}

export async function fetchAdminUsers() {
    const response = await fetch('/api/admin/users');
    if (!response.ok) return [];
    return response.json();
}

export async function fetchAdminUserPlaylists(id) {
    const response = await fetch(`/api/admin/users/${id}/playlists`);
    if (!response.ok) return [];
    return response.json();
}

export async function updateAdminUserPlan(id, plan) {
    await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
    });
}

export async function deleteAdminUserRequest(id) {
    return fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
}