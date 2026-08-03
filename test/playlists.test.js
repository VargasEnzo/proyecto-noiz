process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.JAMENDO_CLIENT_ID = 'test-client-id';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server/index');

async function registerAndLogin(agent, email) {
    await agent.post('/api/register').send({
        nombre: 'Test',
        apellido: 'User',
        email,
        password: 'password123',
        repetirPassword: 'password123',
    });
}

test('playlists requieren sesión activa', async () => {
    const res = await request(app).get('/api/playlists');
    assert.equal(res.status, 401);
});

test('crear, agregar canción, y borrar playlist', async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, 'dueno@test.com');

    const crear = await agent.post('/api/playlists').send({ nombre: 'Mis favoritas' });
    assert.equal(crear.status, 200);
    assert.equal(crear.body.nombre, 'Mis favoritas');
    const playlistId = crear.body.id;

    const agregar = await agent.post(`/api/playlists/${playlistId}/songs`).send({
        id: 1,
        displayName: 'Cancion Test',
        artist: 'Artista Test',
        cover: 'cover.jpg',
        path: 'audio.mp3',
        duration: '3:00',
    });
    assert.equal(agregar.status, 200);

    const listado = await agent.get('/api/playlists');
    assert.equal(listado.status, 200);
    assert.equal(listado.body.length, 1);
    assert.equal(listado.body[0].songs.length, 1);
    assert.equal(listado.body[0].songs[0].displayName, 'Cancion Test');

    const borrarCancion = await agent.delete(`/api/playlists/${playlistId}/songs/1`);
    assert.equal(borrarCancion.status, 200);

    const borrarPlaylist = await agent.delete(`/api/playlists/${playlistId}`);
    assert.equal(borrarPlaylist.status, 200);

    const listadoFinal = await agent.get('/api/playlists');
    assert.equal(listadoFinal.body.length, 0);
});

test('un usuario no puede borrar la playlist de otro', async () => {
    const dueno = request.agent(app);
    await registerAndLogin(dueno, 'dueno2@test.com');
    const crear = await dueno.post('/api/playlists').send({ nombre: 'Privada' });
    const playlistId = crear.body.id;

    const intruso = request.agent(app);
    await registerAndLogin(intruso, 'intruso@test.com');
    const intento = await intruso.delete(`/api/playlists/${playlistId}`);
    assert.equal(intento.status, 404);
});

test('crear playlist sin nombre devuelve 400', async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, 'sinnombre@test.com');
    const res = await agent.post('/api/playlists').send({});
    assert.equal(res.status, 400);
});