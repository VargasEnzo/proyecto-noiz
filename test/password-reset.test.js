process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.YOUTUBE_API_KEY = 'test-api-key';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
process.env.SENDGRID_FROM_EMAIL = 'test@gmail.com';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { getLastEmail, extractToken, registerAndVerify } = require('./helpers');

const app = require('../server/index');

test('forgot-password responde ok incluso si el email no existe (no enumerar usuarios)', async () => {
    await request(app).post('/api/forgot-password').send({ email: 'noexiste@test.com' });
    const before = getLastEmail();

    const res = await request(app).post('/api/forgot-password').send({ email: 'noexiste@test.com' });
    assert.equal(res.status, 200);
    assert.equal(getLastEmail(), before);
});

test('forgot-password envía el email y reset-password cambia la contraseña', async () => {
    await registerAndVerify(app, { nombre: 'Reset', apellido: 'User', email: 'reset@test.com' });

    const forgot = await request(app).post('/api/forgot-password').send({ email: 'reset@test.com' });
    assert.equal(forgot.status, 200);
    const lastEmailSent = getLastEmail();
    assert.equal(lastEmailSent.to, 'reset@test.com');

    const token = extractToken(lastEmailSent.html);
    assert.ok(token, 'el email debería incluir un link con token');

    const passwordCorta = await request(app)
        .post('/api/reset-password')
        .send({ token, password: '123', repetirPassword: '123' });
    assert.equal(passwordCorta.status, 400);

    const reset = await request(app)
        .post('/api/reset-password')
        .send({ token, password: 'nuevaPassword123', repetirPassword: 'nuevaPassword123' });
    assert.equal(reset.status, 200);

    const loginViejo = await request(app)
        .post('/api/login')
        .send({ email: 'reset@test.com', password: 'password123' });
    assert.equal(loginViejo.status, 401);

    const loginNuevo = await request(app)
        .post('/api/login')
        .send({ email: 'reset@test.com', password: 'nuevaPassword123' });
    assert.equal(loginNuevo.status, 200);

    const reusarToken = await request(app)
        .post('/api/reset-password')
        .send({ token, password: 'otraPassword123', repetirPassword: 'otraPassword123' });
    assert.equal(reusarToken.status, 400);
});

test('reset-password rechaza token inválido', async () => {
    const res = await request(app)
        .post('/api/reset-password')
        .send({ token: 'token-invalido', password: 'password123', repetirPassword: 'password123' });
    assert.equal(res.status, 400);
});
