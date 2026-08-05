import { state } from './state.js';
import { renderDiscoverSide } from './discover.js';
import { highlightActiveSong } from './songlist.js';

const heroCover = document.getElementById('hero-cover'),
    heroTitle = document.getElementById('hero-title'),
    heroArtist = document.getElementById('hero-artist'),
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
    mpShuffleBtn = document.getElementById('mp-shuffle'),
    mpVolumeIcon = document.getElementById('mp-volume-icon'),
    mpVolumeSlider = document.getElementById('mp-volume-slider'),
    nowPlayingOpenBtn = document.getElementById('now-playing-open-btn'),
    nowPlayingFullscreen = document.getElementById('nowplaying-fullscreen'),
    nowPlayingBg = document.getElementById('nowplaying-bg'),
    nowPlayingCollapseBtn = document.getElementById('nowplaying-collapse-btn'),
    fsCover = document.getElementById('fs-cover'),
    fsTitle = document.getElementById('fs-title'),
    fsArtist = document.getElementById('fs-artist'),
    fsCurrentTime = document.getElementById('fs-current-time'),
    fsDuration = document.getElementById('fs-duration'),
    fsProgress = document.getElementById('fs-progress'),
    fsProgressBar = document.getElementById('fs-progress-bar'),
    fsPrevBtn = document.getElementById('fs-prev'),
    fsNextBtn = document.getElementById('fs-next'),
    fsPlayBtn = document.getElementById('fs-play'),
    fsShuffleBtn = document.getElementById('fs-shuffle'),
    fsVolumeIcon = document.getElementById('fs-volume-icon'),
    fsVolumeSlider = document.getElementById('fs-volume-slider');

// --- Reproductor de YouTube, cargado oculto (ver #youtube-player en dashboard.html) ---

let ytPlayer = null;
let isPlayerReady = false;
let pendingSong = null;
let pendingAutoplay = false;
let isMuted = false;
let progressInterval = null;

function loadYouTubeApi() {
    return new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = resolve;
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
    });
}

async function initPlayer() {
    await loadYouTubeApi();

    ytPlayer = new YT.Player('youtube-player', {
        height: '200',
        width: '200',
        playerVars: { playsinline: 1, controls: 0 },
        events: {
            onReady: () => {
                isPlayerReady = true;
                ytPlayer.setVolume(Number(mpVolumeSlider.value) * 100);

                if (pendingAutoplay) {
                    pendingAutoplay = false;
                    if (pendingSong) {
                        ytPlayer.loadVideoById(pendingSong.id);
                        pendingSong = null;
                    } else {
                        ytPlayer.playVideo();
                    }
                    startProgressLoop();
                }
            },
            onStateChange: (event) => {
                if (event.data === YT.PlayerState.ENDED) {
                    changeMusic(1);
                }
            },
            // 101/150 = el dueño del video desactivó la reproducción embebida (muy común
            // en videos oficiales/VEVO); 100 = video privado o borrado.
            onError: (event) => {
                console.error('No se pudo reproducir este video de YouTube (código de error:', event.data, ')');
                changeMusic(1);
            },
        },
    });
}

initPlayer();

function startProgressLoop() {
    stopProgressLoop();
    progressInterval = setInterval(updateProgressBar, 500);
}

function stopProgressLoop() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
}

export function togglePlay() {
    if (state.isPlaying) {
        pauseMusic();
    } else {
        playMusic();
    }
}

export function playMusic() {
    state.isPlaying = true;
    mpPlayBtn.classList.replace('bi-play-fill', 'bi-pause-fill');
    fsPlayBtn.classList.replace('bi-play-fill', 'bi-pause-fill');
    highlightActiveSong();

    if (!isPlayerReady) {
        pendingAutoplay = true;
        return;
    }

    if (pendingSong) {
        ytPlayer.loadVideoById(pendingSong.id);
        pendingSong = null;
    } else {
        ytPlayer.playVideo();
    }
    startProgressLoop();
}

export function pauseMusic() {
    state.isPlaying = false;
    mpPlayBtn.classList.replace('bi-pause-fill', 'bi-play-fill');
    fsPlayBtn.classList.replace('bi-pause-fill', 'bi-play-fill');
    pendingAutoplay = false;
    stopProgressLoop();
    if (isPlayerReady) ytPlayer.pauseVideo();
}

export function loadMusic(song) {
    state.currentSong = song;
    mpTitle.textContent = song.displayName;
    mpArtist.textContent = song.artist;
    mpCover.src = song.cover;

    heroCover.src = song.cover;
    heroTitle.textContent = song.displayName;
    heroArtist.textContent = song.artist;

    fsTitle.textContent = song.displayName;
    fsArtist.textContent = song.artist;
    fsCover.src = song.cover;
    nowPlayingBg.style.backgroundImage = `url("${song.cover}")`;

    renderDiscoverSide();

    mpCurrentTime.textContent = '0:00';
    mpDuration.textContent = '0:00';
    mpProgress.style.width = '0%';
    fsCurrentTime.textContent = '0:00';
    fsDuration.textContent = '0:00';
    fsProgress.style.width = '0%';

    // No se carga en YouTube todavia: se guarda como pendiente y playMusic()
    // la carga y reproduce en un solo paso (loadVideoById), sin la carrera
    // de "cuear ahora, reproducir un instante despues".
    pendingSong = song;
}

export function changeMusic(direction) {
    if (state.playbackQueue.length === 0) return;

    if (state.isShuffle && direction === 1 && state.playbackQueue.length > 1) {
        let nuevoIndex;
        do {
            nuevoIndex = Math.floor(Math.random() * state.playbackQueue.length);
        } while (nuevoIndex === state.musicIndex);
        state.musicIndex = nuevoIndex;
    } else {
        state.musicIndex = (state.musicIndex + direction + state.playbackQueue.length) % state.playbackQueue.length;
    }

    loadMusic(state.playbackQueue[state.musicIndex]);
    playMusic();
}

export function setShuffle(enabled) {
    state.isShuffle = enabled;
    mpShuffleBtn.classList.toggle('active', enabled);
    fsShuffleBtn.classList.toggle('active', enabled);
}

function toggleShuffle() {
    setShuffle(!state.isShuffle);
}

function toggleMute() {
    if (!isPlayerReady) return;
    isMuted = !isMuted;
    if (isMuted) {
        ytPlayer.mute();
    } else {
        ytPlayer.unMute();
    }
    mpVolumeIcon.classList.toggle('bi-volume-up-fill', !isMuted);
    mpVolumeIcon.classList.toggle('bi-volume-mute-fill', isMuted);
    fsVolumeIcon.classList.toggle('bi-volume-up-fill', !isMuted);
    fsVolumeIcon.classList.toggle('bi-volume-mute-fill', isMuted);
}

function updateProgressBar() {
    if (!isPlayerReady) return;
    const duration = ytPlayer.getDuration();
    const currentTime = ytPlayer.getCurrentTime();
    const progressPercent = (currentTime / duration) * 100;
    mpProgress.style.width = `${progressPercent || 0}%`;
    fsProgress.style.width = `${progressPercent || 0}%`;

    const formatTime = (time) => String(Math.floor(time)).padStart(2, '0');
    const durationText = `${formatTime(duration / 60) || 0}:${formatTime(duration % 60) || '00'}`;
    const currentTimeText = `${formatTime(currentTime / 60)}:${formatTime(currentTime % 60)}`;
    mpDuration.textContent = durationText;
    mpCurrentTime.textContent = currentTimeText;
    fsDuration.textContent = durationText;
    fsCurrentTime.textContent = currentTimeText;
}

function setProgressBar(e) {
    if (!isPlayerReady) return;
    const width = e.currentTarget.clientWidth;
    const clickX = e.offsetX;
    ytPlayer.seekTo((clickX / width) * ytPlayer.getDuration(), true);
}

function setVolume(value) {
    mpVolumeSlider.value = value;
    fsVolumeSlider.value = value;
    if (!isPlayerReady) return;
    ytPlayer.setVolume(Number(value) * 100);
    if (isMuted) {
        isMuted = false;
        ytPlayer.unMute();
        mpVolumeIcon.classList.replace('bi-volume-mute-fill', 'bi-volume-up-fill');
        fsVolumeIcon.classList.replace('bi-volume-mute-fill', 'bi-volume-up-fill');
    }
}

function openNowPlaying() {
    nowPlayingFullscreen.classList.remove('hidden');
}

function closeNowPlaying() {
    nowPlayingFullscreen.classList.add('hidden');
}

mpPlayBtn.addEventListener('click', togglePlay);
mpPrevBtn.addEventListener('click', () => changeMusic(-1));
mpNextBtn.addEventListener('click', () => changeMusic(1));
mpShuffleBtn.addEventListener('click', toggleShuffle);
mpVolumeIcon.addEventListener('click', toggleMute);
mpVolumeSlider.addEventListener('input', () => setVolume(mpVolumeSlider.value));
mpProgressBar.addEventListener('click', setProgressBar);

fsPlayBtn.addEventListener('click', togglePlay);
fsPrevBtn.addEventListener('click', () => changeMusic(-1));
fsNextBtn.addEventListener('click', () => changeMusic(1));
fsShuffleBtn.addEventListener('click', toggleShuffle);
fsVolumeIcon.addEventListener('click', toggleMute);
fsVolumeSlider.addEventListener('input', () => setVolume(fsVolumeSlider.value));
fsProgressBar.addEventListener('click', setProgressBar);

nowPlayingOpenBtn.addEventListener('click', openNowPlaying);
nowPlayingCollapseBtn.addEventListener('click', closeNowPlaying);
