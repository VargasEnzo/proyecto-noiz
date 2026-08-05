process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.YOUTUBE_API_KEY = 'test-api-key';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { getLastEmail, extractToken, registerAndVerify } = require('./helpers');
const app = require('../server/index');

test('registro rechaza campos incompletos', async () => {
    const res = await request(app).post('/api/register').send({ nombre: 'Ana' });
    assert.equal(res.status, 400);
});

test('registro rechaza email inválido', async () => {
    const res = await request(app).post('/api/register').send({
        nombre: 'Ana',
        apellido: 'Gomez',
        email: 'no-es-un-email',
        password: 'password123',
        repetirPassword: 'password123',
    });
    assert.equal(res.status, 400);
});

test('registro rechaza contraseña corta', async () => {
    const res = await request(app).post('/api/register').send({
        nombre: 'Ana',
        apellido: 'Gomez',
        email: 'ana@test.com',
        password: '123',
        repetirPassword: '123',
    });
    assert.equal(res.status, 400);
});

test('registro exitoso NO crea sesión (hay que confirmar el mail primero)', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/register').send({
        nombre: 'Ana',
        apellido: 'Gomez',
        email: 'ana@test.com',
        password: 'password123',
        repetirPassword: 'password123',
    });
    assert.equal(res.status, 200);

    const me = await agent.get('/api/me');
    assert.equal(me.status, 401);
});

test('login rechaza una cuenta sin verificar, aunque la contraseña sea correcta', async () => {
    const email = 'sinverificar@test.com';
    await request(app).post('/api/register').send({
        nombre: 'Sin',
        apellido: 'Verificar',
        email,
        password: 'password123',
        repetirPassword: 'password123',
    });

    const res = await request(app).post('/api/login').send({ email, password: 'password123' });
    assert.equal(res.status, 403);
    assert.equal(res.body.unverified, true);
});

test('verificar el email con el token del mail permite loguearse', async () => {
    const email = 'verificar@test.com';
    await registerAndVerify(app, { nombre: 'Ver', apellido: 'Ificar', email });

    const res = await request(app).post('/api/login').send({ email, password: 'password123' });
    assert.equal(res.status, 200);
});

test('verify-email con un token inválido no rompe, solo redirige', async () => {
    const res = await request(app).get('/api/verify-email?token=token-que-no-existe');
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /verified=0/);
});

test('resend-verification no filtra si el email existe o no (responde igual en ambos casos)', async () => {
    const conCuenta = await request(app)
        .post('/api/resend-verification')
        .send({ email: 'noexiste-resend@test.com' });
    assert.equal(conCuenta.status, 200);

    const email = 'reenviar@test.com';
    await request(app).post('/api/register').send({
        nombre: 'Re',
        apellido: 'Enviar',
        email,
        password: 'password123',
        repetirPassword: 'password123',
    });

    const primerToken = extractToken(getLastEmail().html);

    const sinCuenta = await request(app).post('/api/resend-verification').send({ email: 'otro-inexistente@test.com' });
    assert.equal(sinCuenta.status, 200);

    const conCuentaSinVerificar = await request(app).post('/api/resend-verification').send({ email });
    assert.equal(conCuentaSinVerificar.status, 200);

    const nuevoToken = extractToken(getLastEmail().html);
    assert.notEqual(primerToken, nuevoToken);
});

test('login falla con contraseña incorrecta', async () => {
    const agent = request.agent(app);
    await agent.post('/api/register').send({
        nombre: 'Beto',
        apellido: 'Lopez',
        email: 'beto@test.com',
        password: 'password123',
        repetirPassword: 'password123',
    });

    const res = await agent.post('/api/login').send({ email: 'beto@test.com', password: 'incorrecta' });
    assert.equal(res.status, 401);
});

test('login exitoso reestablece la sesión', async () => {
    const agent = request.agent(app);
    await registerAndVerify(app, { nombre: 'Caro', apellido: 'Diaz', email: 'caro@test.com' });

    const res = await agent.post('/api/login').send({ email: 'caro@test.com', password: 'password123' });
    assert.equal(res.status, 200);

    const me = await agent.get('/api/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'caro@test.com');
});

test('/api/me sin sesión devuelve 401', async () => {
    const res = await request(app).get('/api/me');
    assert.equal(res.status, 401);
});
