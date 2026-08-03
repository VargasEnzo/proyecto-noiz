import { state } from './state.js';
import { fetchPlaylists, fetchPopularTracks } from './api.js';
import { loadCurrentUser } from './profile.js';
import { selectHome } from './playlists.js';
import { loadMusic } from './player.js';
import './discover.js';
import './songlist.js';
import './browse.js';

const logoutBtn = document.getElementById('logout-btn');

logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = 'login.html';
});

// --- Arranque ---

async function init() {
    await loadCurrentUser();
    const [fetchedPlaylists, popular] = await Promise.all([fetchPlaylists(), fetchPopularTracks()]);
    state.playlists = fetchedPlaylists;
    state.homeSongs = popular;
    selectHome();
    if (state.homeSongs.length > 0) {
        loadMusic(state.homeSongs[0]);
    }
}

init();