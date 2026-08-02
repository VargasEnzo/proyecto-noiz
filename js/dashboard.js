// Depende de que js/songs.js ya haya sido cargado antes en el HTML
// (define la variable global `songs`).

const songList = document.getElementById('song-list'),
    playlistList = document.getElementById('playlist-list'),
    newPlaylistBtn = document.getElementById('new-playlist-btn'),
    songSideTitle = document.getElementById('song-side-title'),
    searchInput = document.getElementById('search-input'),
    navHome = document.getElementById('nav-home'),
    navExplorar = document.getElementById('nav-explorar'),
    heroCover = document.getElementById('hero-cover'),
    heroTitle = document.getElementById('hero-title'),
    heroArtist = document.getElementById('hero-artist'),
    recommendedCardEl = document.getElementById('recommended-card'),
    topArtistsListEl = document.getElementById('top-artists-list'),
    mpCover = document.getElementById('mp-cover'),
    mpTitle = document.getElementById('mp-title'),
    mpArtist = document.getElementById('mp-artist'),
    mpCurrentTime = document.getElementById('mp-current-time'),
    mpDuration = document.getElementById('mp-duration'),
    mpProgress = document.getElementById('mp-progress'),
    mpProgressBar = document.getElementById('mp-progress-bar'),
    mpPrevBtn = document.getElementById('mp-prev'),
    mpNextBtn = document.getElementById('mp-next'),
    mpPlayBtn = document.getElementById('mp-play'),
    greeting = document.getElementById('greeting'),
    logoutBtn = document.getElementById('logout-btn');

const music = new Audio();

let playlists = [];
let currentView = 'home'; // 'home' | 'search' | 'playlist'
let activePlaylistId = null; // null salvo que currentView sea 'playlist'
let displayedSongs = songs; // lo que se ve ahora mismo en song_side
let playbackQueue = songs; // la lista dentro de la cual se mueven next/prev
let musicIndex = 0;
let currentSong = null;
let isPlaying = false;

// --- Llamadas a la API ---

async function loadCurrentUser() {
    const response = await fetch('/api/me');
    if (!response.ok) return;
    const user = await response.json();
    greeting.textContent = user.nombre;
}

async function fetchPlaylists() {
    const response = await fetch('/api/playlists');
    if (!response.ok) return [];
    return response.json();
}

async function createPlaylist(nombre) {
    const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
    });
    return response.json();
}

async function deletePlaylistRequest(id) {
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
}

async function addSongToPlaylistRequest(playlistId, songId) {
    await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
    });
}

async function removeSongFromPlaylistRequest(playlistId, songId) {
    await fetch(`/api/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
}

// --- Sidebar: navegación (Inicio/Explorar) ---

function setActiveNav(view) {
    currentView = view;
    navHome.classList.toggle('active', view === 'home');
}

function selectHome() {
    activePlaylistId = null;
    setActiveNav('home');
    renderPlaylistsSidebar();
    songSideTitle.textContent = 'Inicio';
    renderSongList(songs);
}

navHome.addEventListener('click', selectHome);
navExplorar.addEventListener('click', () => searchInput.focus());

searchInput.addEventListener('input', () => {
    const raw = searchInput.value.trim();
    if (!raw) {
        selectHome();
        return;
    }

    activePlaylistId = null;
    setActiveNav('search');
    renderPlaylistsSidebar();
    songSideTitle.textContent = `Resultados para "${raw}"`;

    const query = raw.toLowerCase();
    const filtered = songs.filter(
        (s) => s.displayName.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query)
    );
    renderSongList(filtered);
});

// --- Sidebar: playlists ---

function songsForPlaylist(playlist) {
    return playlist.songIds.map((id) => songs.find((s) => s.id === id)).filter(Boolean);
}

function renderPlaylistsSidebar() {
    playlistList.innerHTML = playlists
        .map(
            (p) => `
        <div class="playlist-item ${p.id === activePlaylistId ? 'active' : ''}" data-playlist-id="${p.id}">
            <span class="playlist-item-name">${p.nombre}</span>
            <i class="bi bi-trash playlist-delete-btn" data-playlist-id="${p.id}" title="Borrar playlist"></i>
        </div>
    `
        )
        .join('');

    playlistList.querySelectorAll('.playlist-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('playlist-delete-btn')) return;
            selectPlaylist(Number(item.dataset.playlistId));
        });
    });

    playlistList.querySelectorAll('.playlist-delete-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.playlistId);
            await deletePlaylistRequest(id);
            playlists = playlists.filter((p) => p.id !== id);
            if (activePlaylistId === id) {
                selectHome();
            } else {
                renderPlaylistsSidebar();
            }
        });
    });
}

function selectPlaylist(id) {
    activePlaylistId = id;
    setActiveNav('playlist');
    renderPlaylistsSidebar();
    songSideTitle.textContent = playlists.find((p) => p.id === id).nombre;
    renderSongList(songsForPlaylist(playlists.find((p) => p.id === id)));
}

// --- Modal "Nueva playlist" ---

const newPlaylistModal = document.createElement('div');
newPlaylistModal.id = 'new-playlist-modal-overlay';
newPlaylistModal.style.display = 'none';
newPlaylistModal.innerHTML = `
    <div class="modal-card">
        <h3>Nueva playlist</h3>
        <input type="text" id="new-playlist-name-input" placeholder="Nombre de la playlist">
        <div class="modal-actions">
            <button type="button" class="modal-cancel-btn" id="new-playlist-cancel-btn">Cancelar</button>
            <button type="button" class="modal-create-btn" id="new-playlist-create-btn">Crear</button>
        </div>
    </div>
`;
document.body.appendChild(newPlaylistModal);

const newPlaylistNameInput = document.getElementById('new-playlist-name-input');

function openNewPlaylistModal() {
    newPlaylistNameInput.value = '';
    newPlaylistModal.style.display = 'flex';
    newPlaylistNameInput.focus();
}

function closeNewPlaylistModal() {
    newPlaylistModal.style.display = 'none';
}

newPlaylistBtn.addEventListener('click', openNewPlaylistModal);
document.getElementById('new-playlist-cancel-btn').addEventListener('click', closeNewPlaylistModal);

document.getElementById('new-playlist-create-btn').addEventListener('click', async () => {
    const nombre = newPlaylistNameInput.value.trim();
    if (!nombre) return;
    const nueva = await createPlaylist(nombre);
    playlists.push(nueva);
    renderPlaylistsSidebar();
    closeNewPlaylistModal();
});

newPlaylistNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('new-playlist-create-btn').click();
});

// --- Menú flotante "agregar a playlist" ---

const addMenu = document.createElement('div');
addMenu.id = 'add-to-playlist-menu';
addMenu.classList.add('hidden');
document.body.appendChild(addMenu);

function openAddMenu(anchorEl, songId) {
    addMenu.innerHTML =
        playlists.length === 0
            ? '<p class="add-menu-empty">Creá una playlist primero</p>'
            : playlists.map((p) => `<button data-playlist-id="${p.id}">${p.nombre}</button>`).join('');

    const rect = anchorEl.getBoundingClientRect();
    addMenu.style.top = `${rect.bottom + window.scrollY}px`;
    addMenu.style.left = `${rect.left + window.scrollX}px`;
    addMenu.classList.remove('hidden');

    addMenu.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', async () => {
            await addSongToPlaylistRequest(Number(btn.dataset.playlistId), songId);
            const playlist = playlists.find((p) => p.id === Number(btn.dataset.playlistId));
            playlist.songIds.push(songId);
            closeAddMenu();
        });
    });
}

function closeAddMenu() {
    addMenu.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    if (!addMenu.contains(e.target) && !e.target.classList.contains('add-to-playlist-btn')) {
        closeAddMenu();
    }
});

// --- Lista de canciones (song_side) ---

function renderSongList(list) {
    displayedSongs = list;

    songList.innerHTML = list
        .map((song, index) => {
            const actionIcon = activePlaylistId
                ? `<i class="bi bi-dash-circle-fill remove-from-playlist-btn" data-song-id="${song.id}" title="Quitar de la playlist"></i>`
                : `<i class="bi bi-plus-circle-fill add-to-playlist-btn" data-song-id="${song.id}" title="Agregar a playlist"></i>`;

            return `
        <li class="song-item" data-index="${index}" data-song-id="${song.id}">
            <span class="song-item-index">${index + 1}</span>
            <img src="${song.cover}" alt="${song.displayName}">
            <div class="song-item-info">
                <span class="song-item-title">${song.displayName}</span>
                <span class="song-item-artist">${song.artist}</span>
            </div>
            <span class="song-item-duration">${song.duration}</span>
            ${actionIcon}
        </li>
    `;
        })
        .join('');

    songList.querySelectorAll('.song-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-playlist-btn')) {
                e.stopPropagation();
                openAddMenu(e.target, Number(e.target.dataset.songId));
                return;
            }
            if (e.target.classList.contains('remove-from-playlist-btn')) {
                e.stopPropagation();
                removeFromCurrentPlaylist(Number(e.target.dataset.songId));
                return;
            }

            playbackQueue = displayedSongs;
            musicIndex = Number(item.dataset.index);
            loadMusic(playbackQueue[musicIndex]);
            playMusic();
        });
    });

    highlightActiveSong();
}

async function removeFromCurrentPlaylist(songId) {
    await removeSongFromPlaylistRequest(activePlaylistId, songId);
    const playlist = playlists.find((p) => p.id === activePlaylistId);
    playlist.songIds = playlist.songIds.filter((id) => id !== songId);
    renderSongList(songsForPlaylist(playlist));
}

function highlightActiveSong() {
    songList.querySelectorAll('.song-item').forEach((item) => {
        item.classList.toggle('active', !!currentSong && Number(item.dataset.songId) === currentSong.id);
    });
}

// --- Columna "Descubrir" ---

function getRecomendado() {
    if (!currentSong) return songs[0];
    const otras = songs.filter((s) => s.id !== currentSong.id);
    return otras.length > 0 ? otras[Math.floor(Math.random() * otras.length)] : null;
}

function getTopArtistas() {
    const counts = {};
    songs.forEach((s) => {
        counts[s.artist] = (counts[s.artist] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

function renderDiscoverSide() {
    const recomendado = getRecomendado();

    recommendedCardEl.innerHTML = recomendado
        ? `
        <div class="recommended-card" data-song-id="${recomendado.id}">
            <img src="${recomendado.cover}" alt="${recomendado.displayName}">
            <div class="recommended-card-info">
                <span class="recommended-card-title">${recomendado.displayName}</span>
                <span class="recommended-card-artist">${recomendado.artist}</span>
            </div>
            <i class="bi bi-play-circle-fill"></i>
        </div>
    `
        : '';

    if (recomendado) {
        recommendedCardEl.querySelector('.recommended-card').addEventListener('click', () => {
            playbackQueue = songs;
            musicIndex = songs.findIndex((s) => s.id === recomendado.id);
            loadMusic(playbackQueue[musicIndex]);
            playMusic();
        });
    }

    topArtistsListEl.innerHTML = getTopArtistas()
        .map(
            (a) => `
        <div class="top-artist-row">
            <i class="bi bi-person-circle"></i>
            <div class="top-artist-info">
                <span class="top-artist-name">${a.nombre}</span>
                <span class="top-artist-count">${a.cantidad} canción${a.cantidad === 1 ? '' : 'es'}</span>
            </div>
        </div>
    `
        )
        .join('');
}

// --- Mini-player ---

function togglePlay() {
    if (isPlaying) {
        pauseMusic();
    } else {
        playMusic();
    }
}

function playMusic() {
    isPlaying = true;
    mpPlayBtn.classList.replace('bi-play-fill', 'bi-pause-fill');
    music.play();
    highlightActiveSong();
}

function pauseMusic() {
    isPlaying = false;
    mpPlayBtn.classList.replace('bi-pause-fill', 'bi-play-fill');
    music.pause();
}

function loadMusic(song) {
    currentSong = song;
    music.src = song.path;
    mpTitle.textContent = song.displayName;
    mpArtist.textContent = song.artist;
    mpCover.src = song.cover;

    heroCover.src = song.cover;
    heroTitle.textContent = song.displayName;
    heroArtist.textContent = song.artist;

    renderDiscoverSide();
}

function changeMusic(direction) {
    musicIndex = (musicIndex + direction + playbackQueue.length) % playbackQueue.length;
    loadMusic(playbackQueue[musicIndex]);
    playMusic();
}

function updateProgressBar() {
    const { duration, currentTime } = music;
    const progressPercent = (currentTime / duration) * 100;
    mpProgress.style.width = `${progressPercent || 0}%`;

    const formatTime = (time) => String(Math.floor(time)).padStart(2, '0');
    mpDuration.textContent = `${formatTime(duration / 60) || 0}:${formatTime(duration % 60) || '00'}`;
    mpCurrentTime.textContent = `${formatTime(currentTime / 60)}:${formatTime(currentTime % 60)}`;
}

function setProgressBar(e) {
    const width = mpProgressBar.clientWidth;
    const clickX = e.offsetX;
    music.currentTime = (clickX / width) * music.duration;
}

mpPlayBtn.addEventListener('click', togglePlay);
mpPrevBtn.addEventListener('click', () => changeMusic(-1));
mpNextBtn.addEventListener('click', () => changeMusic(1));
music.addEventListener('ended', () => changeMusic(1));
music.addEventListener('timeupdate', updateProgressBar);
mpProgressBar.addEventListener('click', setProgressBar);

logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = 'login.html';
});

// --- Arranque ---

async function init() {
    await loadCurrentUser();
    playlists = await fetchPlaylists();
    selectHome();
    loadMusic(songs[0]);
}

init();
