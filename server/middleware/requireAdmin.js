const db = require('../db');

function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'No hay sesión activa.' });
    }

    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.userId);
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: 'No tenés permisos de administrador.' });
    }

    next();
}

module.exports = requireAdmin;
