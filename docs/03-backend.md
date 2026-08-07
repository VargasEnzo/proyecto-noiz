# El backend

El servidor está escrito en **Node.js** con **Express** (el framework más usado para armar servidores HTTP en Node). Su trabajo es triple: servir los archivos del frontend, exponer una API en `/api/...` que el frontend consume, y hablar con servicios externos (YouTube, SendGrid, la base de datos).

## El punto de entrada: `server/index.js`

[server/index.js](../server/index.js) arma la aplicación Express completa, en este orden (el orden importa: Express procesa cada request pasándolo por los `middlewares` en el orden en que se registran con `app.use`):

1. **Espera a que la base de datos esté lista** (`db.ready`) antes de procesar cualquier request — evita una condición de carrera donde un request llega antes de que existan las tablas.
2. **`helmet`**: agrega headers HTTP de seguridad a toda respuesta (ver [04-seguridad.md](04-seguridad.md)).
3. **`express.json()`**: parsea el body de los requests que llegan como JSON (necesario para leer `req.body` en las rutas POST/PUT).
4. **`express-session`**: maneja las sesiones de usuario con una cookie (ver [04-seguridad.md](04-seguridad.md)).
5. Las rutas de la API (`authRoutes`, `playlistsRoutes`, `musicRoutes`, `adminRoutes`), cada una montada bajo su propio prefijo (`/api`, `/api/playlists`, `/api/music`, `/api/admin`).
6. La ruta que sirve el HTML protegido (`/html/dashboard.html`), pasando primero por `requireAuth`. (`/html/admin.html` ya no sirve un archivo — el panel de admin es una vista dentro de `dashboard.html` ahora, ver [02-frontend.md](02-frontend.md); esa ruta vieja solo redirige a `/html/dashboard.html` por compatibilidad con links/bookmarks.)
7. Los archivos estáticos (`css/`, `js/`, `IMAGENES/`, `MUSICA HTML/`, `html/`) servidos directo con `express.static`.
8. Un `catch-all` para `/api/*` que no matcheó ninguna ruta → responde 404 en JSON.
9. Un **error handler global** al final — si cualquier ruta async tira una excepción (por ejemplo, la base de datos falla), termina acá y responde un 500 genérico en vez de tirar el servidor abajo. Express 5 (la versión que usa este proyecto) reenvía automáticamente los errores de funciones `async` a este handler, sin necesitar `try/catch` en cada ruta.

## ¿Qué es un middleware?

Aparece un montón en este proyecto, vale la pena explicarlo una vez: un middleware es simplemente una función que recibe `(req, res, next)` y decide si dejar pasar el request (llamando a `next()`) o cortarlo ahí (respondiendo directamente con `res.json(...)`, `res.redirect(...)`, etc.). Express los ejecuta en cadena, uno detrás de otro. Todos los `requireAlgo` de [server/middleware/](../server/middleware/) son eso: un chequeo que corta el request si no se cumple una condición.

- **[requireAuth.js](../server/middleware/requireAuth.js)**: para páginas HTML — si no hay sesión, redirige a `/html/login.html`.
- **[requireAuthApi.js](../server/middleware/requireAuthApi.js)**: para rutas de API — si no hay sesión, responde `401` en JSON (una API no puede "redirigir" a una página, tiene que devolver un código de error para que el JS del cliente lo maneje).
- **[requireAdmin.js](../server/middleware/requireAdmin.js)**: además de pedir sesión, busca al usuario en la base y chequea que su email coincida con la variable de entorno `ADMIN_EMAIL`. No hay un campo "es admin" en la tabla de usuarios — ser admin es, literalmente, ser dueño de esa una dirección de email en particular.
- **[apiLimiter.js](../server/middleware/apiLimiter.js)**: rate limiting (ver [04-seguridad.md](04-seguridad.md)).

## Las rutas (`server/routes/`)

| Archivo | Prefijo | Qué expone |
|---|---|---|
| [auth.js](../server/routes/auth.js) | `/api` | Registro (no autentica hasta confirmar el mail), login, logout, verificación de email y su reenvío, "olvidé mi contraseña", "cambiar contraseña", `GET/PUT /api/me` (perfil del usuario logueado), y `POST /api/heartbeat` (le avisa al server que el usuario sigue conectado — ver la sección de presencia más abajo). |
| [music.js](../server/routes/music.js) | `/api/music` | `/popular`, `/genre`, `/search` (piden datos al servicio de YouTube), `/recommendations` (recomendaciones personalizadas — ver más abajo) y `/artist-tracks` (hasta 10 canciones de un artista, excluyendo una por id — alimenta el panel "Más de este artista", ver [02-frontend.md](02-frontend.md)). |
| [playlists.js](../server/routes/playlists.js) | `/api/playlists` | CRUD de playlists del usuario logueado y de las canciones dentro de cada una. |
| [admin.js](../server/routes/admin.js) | `/api/admin` | Estadísticas, listado de usuarios (con su estado online/offline), cambiar el plan de un usuario, borrar una cuenta, y la cuota de YouTube usada hoy. Todo detrás de `requireAdmin`. |

Un detalle que se repite en `playlists.js`: cada ruta que toca una playlist específica primero busca `SELECT * FROM playlists WHERE id = ? AND user_id = ?` — es decir, no alcanza con que la playlist exista, tiene que ser **del usuario que hizo el request**. Así un usuario no puede borrar ni ver las playlists de otro con solo adivinar un ID.

## Los servicios (`server/services/`)

Un "servicio" acá es simplemente un módulo que sabe hablar con algo externo, para que las rutas no tengan ese detalle mezclado con la lógica HTTP.

- **[youtube.js](../server/services/youtube.js)**: le pide canciones a la YouTube Data API v3 (búsqueda, populares, por género, y `getArtistTracks()` para "más de este artista" — cacheado 30 min por artista, mismo motivo de costo que el caché de `recommendations.js`). También es donde se registra cuánta "cuota" (quota) se gasta en cada llamada — ver la sección de cuota más abajo.
- **[mailer.js](../server/services/mailer.js)**: manda el mail de recuperación de contraseña usando la API de SendGrid.
- **[quota.js](../server/services/quota.js)**: lleva la cuenta de cuánta cuota de YouTube se gastó hoy (guardada en la base de datos, para que sobreviva a un reinicio del servidor).
- **[presence.js](../server/services/presence.js)**: quién está conectado ahora mismo. Un `Map<userId, timestamp>` **en memoria**, no en la base — es un estado efímero (ver la sección siguiente).
- **[lastfm.js](../server/services/lastfm.js)**: le pide a la API de Last.fm artistas parecidos a uno dado, y resuelve una búsqueda de texto libre al artista más parecido que conozca. Lo usa `recommendations.js`.
- **[recommendations.js](../server/services/recommendations.js)**: arma la sección "Recomendado" del dashboard — ver la sección dedicada más abajo.
- **[jamendo.js](../server/services/jamendo.js)**: **código muerto**. Era el servicio equivalente a `youtube.js` cuando el catálogo era Jamendo (ver [01-historia.md](01-historia.md)). `music.js` ya no lo importa. Queda como candidato a borrar.

### Quién está conectado: heartbeat, no WebSockets

El dashboard (`js/dashboard/main.js`) manda un `POST /api/heartbeat` cada 20 segundos mientras está abierto — eso es todo lo que hace falta para que `presence.js` sepa que ese usuario sigue ahí. El panel de admin considera a alguien "conectado" si su último heartbeat fue hace menos de 45 segundos (`isOnline()` en `presence.js`), y hace polling propio cada 15 segundos mientras se está mirando esa vista para que el estado se sienta en vivo.

Se descartó WebSockets a propósito: darían un estado más instantáneo de verdad, pero Render (plan gratis) duerme el server por inactividad, y sostener conexiones persistentes abiertas choca justo con eso — además de sumar el problema de manejar reconexión del lado del cliente. El heartbeat cada 20s es "tiempo real" con margen suficiente para este caso de uso, sin esa complejidad.

### Recomendaciones personalizadas: por playlists y búsquedas, no un pool genérico

Esto alimenta "Inicio" ([02-frontend.md](02-frontend.md); antes tenía su propio widget aparte, "Recomendado", pero ese lugar en la pantalla pasó a ser un panel de "reproduciendo ahora" — ver la nota de layout más abajo). `recommendations.js` arma algo personalizado en vez de mostrarle a todos el mismo pool de "populares":

1. Reúne artistas "semilla": los de las playlists del usuario (más recientes primero) + los que resuelve `lastfm.resolveArtistFromQuery()` a partir de sus últimas búsquedas en `search_history` (una tabla que guarda cada `GET /api/music/search`, podada a las últimas 30 filas por usuario). Si no hay ninguna semilla (cuenta nueva, sin playlists ni búsquedas todavía), devuelve `[]` — "Inicio" se queda con el catálogo popular de siempre, no se rompe nada.
2. Para cada semilla, `lastfm.getSimilarArtists()` trae artistas parecidos; se juntan, se rankean por cuántas semillas distintas los sugirieron, y se descartan los que el usuario ya tiene entre sus semillas (no tiene sentido recomendarle lo que ya escucha).
3. A los primeros 6, se les busca una canción real con `youtube.searchTracks()` (la misma función que ya usan `/genre` y `/search` — no hubo que escribir nada nuevo para YouTube acá) y se toma el primer resultado.
4. El resultado se **cachea en memoria por usuario, 30 minutos**. Importante por costo: armar esto de cero puede llegar a gastar unas 600 unidades de cuota de YouTube (hasta 6 búsquedas × 101 unidades cada una, ver la sección de cuota) — no es algo que se pueda recalcular en cada carga del dashboard.

Por qué Last.fm y no Spotify: Spotify deprecó justo los endpoints que servirían acá (`audio-features`, `related-artists`, `recommendations`) para cualquier app creada después de noviembre de 2024 — no son una opción real hoy. Last.fm sigue teniendo `artist.getsimilar` gratis y sin esa restricción. Requiere `LASTFM_API_KEY` (ver [05-pwa-y-deploy.md](05-pwa-y-deploy.md)) — sin ella, el endpoint no rompe nada, solo devuelve `[]` (cada llamada a Last.fm falla, se loguea el error, y se sigue de largo).

**Cómo llega a "Inicio"**: `main.js` pide `/api/music/popular` de entrada (rápido, cacheado 10 min) para no bloquear la carga inicial del dashboard, y en paralelo — sin esperarlo — pide `/api/music/recommendations`. Si esta segunda llamada vuelve con canciones, se anteponen a `state.homeSongs` (sin duplicar las que ya estaban) y se vuelve a pintar "Inicio" si el usuario sigue ahí parado; el hero ("Top del momento", ver [02-frontend.md](02-frontend.md)) pasa a mostrar la primera de esas canciones. Si el usuario no tiene semillas todavía, esa segunda llamada devuelve `[]` y "Inicio" se queda tal cual estaba con el catálogo popular.

### La cuota de YouTube, explicada

La YouTube Data API no es gratis ni ilimitada: Google le da a cada API key un presupuesto diario de "unidades" (10.000 por defecto, se resetea a medianoche hora de Los Ángeles). Ese presupuesto **es compartido entre todos los usuarios de Noiz** — no hay un límite por usuario, todos gastan del mismo pozo. Y no todas las operaciones cuestan lo mismo:

- `videos.list` (usada para traer canciones "populares", con caché de 10 minutos en memoria) cuesta **1 unidad**.
- `search.list` (usada en "Géneros" y en el buscador) cuesta **100 unidades** — mucho más cara.

`server/services/quota.js` registra ese costo cada vez que `youtube.js` hace una llamada exitosa, agrupado por día. El panel de admin (una vista dentro de `/html/dashboard.html`, ver [02-frontend.md](02-frontend.md)) muestra el total gastado hoy. Es una estimación propia calculada a partir del código de la app — no es un número que venga directamente de Google (Google no expone eso por API), pero es confiable porque nosotros controlamos exactamente qué llamadas se hacen.

## La base de datos (`server/db.js`)

Se usa **`@libsql/client`**, la librería cliente de [Turso](https://turso.tech) (un proveedor de SQLite alojado en la nube, compatible con `libSQL`, un fork de SQLite). Lo interesante es que el mismo cliente sirve para dos casos:

- **En desarrollo local**: si no están seteadas `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`, se conecta a un archivo SQLite local (`server/database.sqlite`, ignorado por git).
- **En producción (Render)**: con esas variables seteadas, se conecta a la base alojada en Turso — necesario porque Render no garantiza que el disco local persista entre despliegues; si Noiz usara SQLite local en Render, cada redeploy podría borrar todos los usuarios y playlists.

`db.js` no usa un ORM (una librería que traduce objetos de JavaScript a filas de base de datos, tipo Prisma o Sequelize) — las consultas son SQL crudo, con tres funciones de ayuda (`db.get`, `db.all`, `db.run`) para no repetir el boilerplate de `db.execute({ sql, args })` en cada ruta. Las tablas se crean con `CREATE TABLE IF NOT EXISTS` al arrancar el servidor — no hay un sistema de migraciones (una herramienta que versiona los cambios de esquema paso a paso); si el esquema cambia, hay que agregar el `ALTER TABLE` a mano.

Las tablas actuales: `users`, `email_verifications`, `password_resets`, `playlists`, `playlist_songs`, `youtube_quota_usage`, y `search_history` (una fila por cada búsqueda de cada usuario, podada a las últimas 30 por usuario — la usa `recommendations.js`, ver más abajo).

## Los tests (`test/`)

Usan el test runner nativo de Node (`node --test`, sin Jest ni Mocha) y [supertest](https://github.com/ladjs/supertest) para simular requests HTTP contra la app sin tener que levantar un servidor real. Corren contra una base de datos SQLite **en memoria** (`DB_PATH=':memory:'`), así cada corrida arranca limpia y no toca `database.sqlite`. Cubren registro (incluida la verificación de email), login, recuperación de contraseña, y CRUD de playlists (incluyendo que un usuario no pueda tocar las playlists de otro). No cubren todavía el panel de admin ni los endpoints de búsqueda/populares de música.

Como registrarse ya no autentica automáticamente (hay que confirmar el mail primero), cualquier test que necesite un usuario logueado pasa por [test/helpers.js](../test/helpers.js): mockea `fetch` hacia `api.sendgrid.com` (igual que ya hacía `password-reset.test.js`), y expone `registerAndVerify`/`registerVerifyAndLogin`, que registran, capturan el token del mail "enviado" (mockeado) y confirman la cuenta antes de loguear — así los tests de `playlists.test.js` y `music.test.js` no repiten esa lógica cada uno por su lado.