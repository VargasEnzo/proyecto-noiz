import { state } from './state.js';
import { fetchPlaylists, fetchPopularTracks, fetchRecommendations, sendHeartbeat } from './api.js';
import { loadCurrentUser } from './profile.js';
import { selectHome } from './playlists.js';
import { loadMusic, setHero } from './player.js';
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
        setHero(state.homeSongs[0]);
        loadMusic(state.homeSongs[0]);
    }
}

init();

// No se espera esta: arranca en paralelo sin bloquear la carga inicial. Si el
// usuario tiene playlists/búsquedas (recomendaciones personalizadas, ver
// server/services/recommendations.js), esas canciones pasan a encabezar
// "Inicio" y el hero "Top del momento" en cuanto llegan, sin interrumpir lo
// que ya esté sonando. Si no hay nada personalizado todavía (cuenta nueva),
// el server devuelve [] y "Inicio" se queda con el catálogo popular de
// siempre.
async function loadPersonalizedHome() {
    const recommended = await fetchRecommendations();
    if (recommended.length === 0) return;

    const recommendedIds = new Set(recommended.map((t) => t.id));
    state.homeSongs = [...recommended, ...state.homeSongs.filter((t) => !recommendedIds.has(t.id))];
    setHero(state.homeSongs[0]);
    if (state.currentView === 'home') selectHome();
}

loadPersonalizedHome();

// --- Heartbeat: le avisa al server que este usuario sigue conectado.
// Se usa para mostrar el estado "Conectado"/"Desconectado" en el panel de
// admin (ver admin.js). No se pausa si la pestaña queda en segundo plano:
// la música sigue sonando (iframe oculto de YouTube), así que seguir
// contando como conectado ahí es lo correcto.
sendHeartbeat();
setInterval(sendHeartbeat, 20000);