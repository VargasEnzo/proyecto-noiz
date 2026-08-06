import { state } from './state.js';
import { fetchPlaylists, fetchPopularTracks, sendHeartbeat } from './api.js';
import { loadCurrentUser } from './profile.js';
import { selectHome } from './playlists.js';
import { loadMusic } from './player.js';
import { loadRecommendations } from './discover.js';
import './songlist.js';
import './browse.js';
import './admin.js';

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

// No se espera esta: arranca en paralelo sin bloquear la carga inicial. Si
// tarda o el usuario no tiene playlists/búsquedas todavía, la sección
// "Recomendado" mientras tanto (y si no hay nada personalizado) se queda
// con el fallback de top artistas que ya renderizó init().
loadRecommendations();

// --- Heartbeat: le avisa al server que este usuario sigue conectado.
// Se usa para mostrar el estado "Conectado"/"Desconectado" en el panel de
// admin (ver admin.js). No se pausa si la pestaña queda en segundo plano:
// la música sigue sonando (iframe oculto de YouTube), así que seguir
// contando como conectado ahí es lo correcto.
sendHeartbeat();
setInterval(sendHeartbeat, 20000);