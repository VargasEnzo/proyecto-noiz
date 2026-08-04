require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('node:path');

const authRoutes = require('./routes/auth');
const playlistsRoutes = require('./routes/playlists');
const musicRoutes = require('./routes/music');
const adminRoutes = require('./routes/admin');
const requireAuth = require('./middleware/requireAuth');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PROJECT_ROOT = path.join(__dirname, '..');

if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
    throw new Error('Falta la variable de entorno SESSION_SECRET en producción.');
}
const SESSION_SECRET = process.env.SESSION_SECRET || 'noiz-dev-secret';

if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", 'https://www.youtube.com', 'https://s.ytimg.com'],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://fonts.googleapis.com',
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com',
                ],
                imgSrc: ["'self'", 'data:', 'https:'],
                frameSrc: ["'self'", 'https://www.youtube.com'],
                connectSrc: ["'self'"],
            },
        },
    })
);

app.use((req, res, next) => {
    db.ready.then(() => next()).catch(next);
});

app.use(express.json({ limit: '100kb' }));
app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: IS_PRODUCTION, sameSite: 'lax' },
    })
);

app.use('/api', authRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => res.redirect('/html/login.html'));
app.get('/html/dashboard.html', requireAuth, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'html', 'dashboard.html'));
});
app.get('/html/admin.html', requireAuth, async (req, res) => {
    const user = await db.get('SELECT email FROM users WHERE id = ?', req.session.userId);
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
        return res.redirect('/html/dashboard.html');
    }
    res.sendFile(path.join(PROJECT_ROOT, 'html', 'admin.html'));
});

app.use('/css', express.static(path.join(PROJECT_ROOT, 'css')));
app.use('/js', express.static(path.join(PROJECT_ROOT, 'js')));
app.use('/IMAGENES', express.static(path.join(PROJECT_ROOT, 'IMAGENES')));
app.use('/musica-html', express.static(path.join(PROJECT_ROOT, 'MUSICA HTML')));
app.use('/html', express.static(path.join(PROJECT_ROOT, 'html')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(PROJECT_ROOT, 'manifest.json')));
app.get('/service-worker.js', (req, res) => res.sendFile(path.join(PROJECT_ROOT, 'service-worker.js')));

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado.' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
}

module.exports = app;
