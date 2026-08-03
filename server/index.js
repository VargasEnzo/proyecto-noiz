require('dotenv').config();

const express = require('express');
const session = require('express-session');
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

if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'noiz-dev-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: IS_PRODUCTION },
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
app.get('/html/admin.html', requireAuth, (req, res) => {
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.userId);
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
        return res.redirect('/html/dashboard.html');
    }
    res.sendFile(path.join(PROJECT_ROOT, 'html', 'admin.html'));
});

app.use(express.static(PROJECT_ROOT));

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
