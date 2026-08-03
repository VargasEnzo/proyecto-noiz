// Fuente única de datos de canciones. La usan tanto el dashboard
// como (si hace falta) el reproductor standalone en index.html.
// El `id` es fijo y estable: es lo que se guarda en las playlists de la base de datos.
// `duration` es la duración real de cada mp3 (calculada una vez con music-metadata).
const songs = [
    {
        id: 1,
        path: '/musica-html/1-Heartless.mp3',
        displayName: 'Heartless',
        cover: '/musica-html/heartless.jpg',
        artist: 'The Weeknd',
        duration: '3:41',
    },
    {
        id: 2,
        path: '/musica-html/2-Blinding Lights.mp3',
        displayName: 'Blinding Lights',
        cover: '/musica-html/blinding.jpg',
        artist: 'The Weeknd',
        duration: '3:21',
    },
    {
        id: 3,
        path: '/musica-html/3-Save Your Tears.mp3',
        displayName: 'Save Your Tears',
        cover: '/musica-html/save_your_tears.jpg',
        artist: 'The Weeknd',
        duration: '3:36',
    },
    {
        id: 4,
        path: '/musica-html/4-After Hours.mp3',
        displayName: 'After Hours',
        cover: '/musica-html/after.jpg',
        artist: 'The Weeknd',
        duration: '6:02',
    },
    {
        id: 5,
        path: '/musica-html/5-Scared To Live.mp3',
        displayName: 'Scared To Live',
        cover: '/musica-html/front.jpg',
        artist: 'The Weeknd',
        duration: '3:10',
    }
];
