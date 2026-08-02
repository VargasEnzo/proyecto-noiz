function requireAuthApi(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'No hay sesión activa.' });
    }
    next();
}

module.exports = requireAuthApi;
