import { state, music } from './state.js';
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
    mpVolumeSlider = document.getElementById('mp-volume-slider');

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
    music.play();
    highlightActiveSong();
}

export function pauseMusic() {
    state.isPlaying = false;
    mpPlayBtn.classList.replace('bi-pause-fill', 'bi-play-fill');
    music.pause();
}

export function loadMusic(song) {
    state.currentSong = song;
    music.src = song.path;
    mpTitle.textContent = song.displayName;
    mpArtist.textContent = song.artist;
    mpCover.src = song.cover;

    heroCover.src = song.cover;
    heroTitle.textContent = song.displayName;
    heroArtist.textContent = song.artist;

    renderDiscoverSide();
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
}

function toggleShuffle() {
    setShuffle(!state.isShuffle);
}

function toggleMute() {
    music.muted = !music.muted;
    mpVolumeIcon.classList.toggle('bi-volume-up-fill', !music.muted);
    mpVolumeIcon.classList.toggle('bi-volume-mute-fill', music.muted);
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
mpShuffleBtn.addEventListener('click', toggleShuffle);
mpVolumeIcon.addEventListener('click', toggleMute);
mpVolumeSlider.addEventListener('input', () => {
    music.volume = Number(mpVolumeSlider.value);
    if (music.muted) toggleMute();
});
music.addEventListener('ended', () => changeMusic(1));
music.addEventListener('timeupdate', updateProgressBar);
mpProgressBar.addEventListener('click', setProgressBar);