// Fuente única de datos de canciones. La usan tanto el dashboard
// como (si hace falta) el reproductor standalone en index.html.
// El `id` es fijo y estable: es lo que se guarda en las playlists de la base de datos.
// `duration` es la duración real de cada mp3 (calculada una vez con music-metadata).
const songs = [
    {
        id: 1,
        path: '../MUSICA HTML/1-Heartless.mp3',
        displayName: 'Heartless',
        cover: '../MUSICA HTML/heartless.jpg',
        artist: 'The Weeknd',
        duration: '3:41',
    },
    {
        id: 2,
        path: '../MUSICA HTML/2-Blinding Lights.mp3',
        displayName: 'Blinding Lights',
        cover: '../MUSICA HTML/blinding.jpg',
        artist: 'The Weeknd',
        duration: '3:21',
    },
    {
        id: 3,
        path: '../MUSICA HTML/3-Save Your Tears.mp3',
        displayName: 'Save Your Tears',
        cover: '../MUSICA HTML/save_your_tears.jpg',
        artist: 'The Weeknd',
        duration: '3:36',
    },
    {
        id: 4,
        path: '../MUSICA HTML/4-After Hours.mp3',
        displayName: 'After Hours',
        cover: '../MUSICA HTML/after.jpg',
        artist: 'The Weeknd',
        duration: '6:02',
    },
    {
        id: 5,
        path: '../MUSICA HTML/5-Scared To Live.mp3',
        displayName: 'Scared To Live',
        cover: '../MUSICA HTML/front.jpg',
        artist: 'The Weeknd',
        duration: '3:10',
    }
];
