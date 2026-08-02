function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/html/login.html');
    }
    next();
}

module.exports = requireAuth;
