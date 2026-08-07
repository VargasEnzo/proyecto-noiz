# Changelog

Registro de cambios en lenguaje simple, más nuevo arriba. Es un complemento de `git log`, no un reemplazo: acá se explica el **por qué** y el **para qué**, no el detalle línea por línea (eso lo tiene el diff de cada commit).

---

## 2026-08-07 — Rediseño del dashboard: hero, panel derecho y forma de onda

Pedido del usuario a partir de una captura de referencia (una app tipo "myplayai"). Cuatro cambios de layout/contenido, pensados para no pisarse entre sí:

- **Hero ("Top del momento")**: antes decía "Sonando ahora" con un lila que se perdía contra el fondo — se cambió el texto (`.hero-eyebrow` en `html/dashboard.html`) y el color a blanco. De paso se **desacopló del reproductor**: antes `loadMusic()` lo pisaba con la canción actual cada vez que cambiabas de tema, lo cual lo volvía redundante con la mini-barra de abajo. Ahora es un destacado fijo (la primera canción de "Inicio") que solo cambia `setHero()`, y es clickeable — reproduce esa canción al tocarlo (antes no tenía ningún listener).
- **Panel derecho (`discover_side`) repensado**: dejó de ser "Recomendado" (6 artistas/canciones fijas) para pasar a ser un acompañante de lo que se está reproduciendo — portada/título/artista de la canción actual, y debajo hasta 3 canciones más del mismo artista (`GET /api/music/artist-tracks`, nuevo — cachea 30 min por artista en `youtube.js` por el mismo motivo de costo que `recommendations.js`: `search.list` cuesta 100 unidades de cuota). Se actualiza en cada `loadMusic()`, con un `requestId` incremental en `discover.js` para que la respuesta de un artista viejo no pise a una más nueva si el usuario cambia de canción rápido. En mobile, el cajón hamburguesa ahora muestra "Más de este artista" en vez de "Recomendado" (sin la mini-card, que sería redundante con la vista de pantalla completa).
- **¿Y "Recomendado"?** Esa lógica personalizada (Last.fm + playlists/búsquedas, ver `server/services/recommendations.js`) no se tiró: se mudó a alimentar **"Inicio"**. `main.js` sigue mostrando el catálogo popular de entrada (rápido, sin bloquear), y en paralelo pide `/api/music/recommendations`; si vuelve con algo, esas canciones pasan a encabezar la lista (sin duplicar) y el hero se actualiza a la primera de ellas — sin interrumpir lo que ya esté sonando. Si el usuario no tiene playlists ni búsquedas todavía, no cambia nada (mismo comportamiento que antes).
- **Diferenciación visual**: `.discover_side` ya no se estira a toda la altura de la pantalla (`align-self: start` en el grid de `header`) — su alto ahora lo define su contenido, como en la referencia. Además usa un fondo más oscuro/opaco (`--color-panel-bg-strong`, nueva variable) que `.song_side`, para distinguirse sin dejar de sentirse parte del mismo sistema de paneles "vidriosos".
- **Barra de progreso → forma de onda**: la barra lisa (`#mp-progress`/`#fs-progress`) se reemplazó por ~48 barritas (`.wave-bar`) cuya altura se genera con un hash simple del id del video — siempre igual para la misma canción, distinta entre canciones. No es un análisis de audio real (el iframe oculto de YouTube no expone eso), es decorativo. `updateProgressBar()` les agrega la clase `.played` de izquierda a derecha según el tiempo transcurrido. Las barras tienen `pointer-events: none` a propósito, así el click para buscar (`seek`) sigue cayendo sobre el contenedor sin tener que tocar `setProgressBar()`.
- Se limpió código que quedó sin uso tras el cambio: `showArtistSongs()` (browse.js), `state.recommendedTracks`, y las filas de artista con ícono de persona (`.top-artist-row .bi-person-circle`) del viejo fallback de "Recomendado".

Verificado: `node --test` sigue en 21/21. Sintaxis de todos los módulos ES tocados chequeada con `node --check` (no había Playwright instalado en esta máquina para una captura real — pendiente probarlo a mano en el navegador).

---

## 2026-08-06 (2) — Atajos de teclado en el reproductor

Un tester avisó que la barra espaciadora no hacía nada (solo scrolleaba la página) porque no había ningún listener de teclado en el dashboard.

- `js/dashboard/player.js`: espacio (play/pausa), flechas arriba/abajo (volumen ±5%), flechas izquierda/derecha (retroceder/avanzar 5s), Ctrl/Cmd + flecha izquierda/derecha (canción anterior/siguiente), M (silenciar). Se ignoran con el foco en un input/textarea/select para no interferir al escribir (buscador, nombre de playlist); el slider de volumen queda afuera de ese chequeo a propósito porque las flechas ya lo mueven nativamente.
- **Media Session API**: las teclas multimedia de hardware (play/pausa, siguiente/anterior — en muchos teclados son función secundaria de F3/F4/etc.) no llegan como `keydown`, el sistema operativo se las pasa al navegador por otra vía. Se agregó `navigator.mediaSession.setActionHandler` para esas tres acciones, más `metadata`/`playbackState` actualizados en `loadMusic`/`playMusic`/`pauseMusic` — de paso, Noiz ahora aparece con nombre, artista y portada en los controles del sistema (pantalla de bloqueo, notificaciones, auriculares Bluetooth).

---

## 2026-08-06 — Estado online en el panel de admin + Recomendado personalizado

Dos pedidos del usuario, con una decisión de arquitectura para cada uno (quedaron registradas antes de tocar código, ver el resto de esta entrada).

**Estado online**: heartbeat + polling, no WebSockets — Render free tier duerme el server por inactividad, y mantener sockets abiertos no encaja ahí.
- `server/services/presence.js` (nuevo): un `Map<userId, timestamp>` **en memoria**, no en la base — es un estado efímero (quién está conectado ahora), no algo que tenga sentido persistir entre reinicios del server.
- El dashboard manda un heartbeat (`POST /api/heartbeat`) cada 20s mientras está abierto (`js/dashboard/main.js`), sin pausarse en pestañas en segundo plano — la música sigue sonando ahí (iframe oculto de YouTube), así que seguir contando como conectado es lo correcto.
- El panel de admin muestra una columna "Estado" (punto verde con animación de latido + "Conectado", o gris + "Desconectado"), con polling propio cada 15s mientras se está mirando esa vista (`js/dashboard/admin.js`) — sin necesidad de un `clearInterval` al salir: el callback simplemente no hace nada si `state.currentView !== 'admin'`.
- Verificado con dos sesiones de Playwright en paralelo: un usuario con el heartbeat activo aparece "Conectado" en el panel del admin, y pasa a "Desconectado" ~45s después de cerrar esa pestaña (umbral configurable en `presence.js`).

**"Recomendado" personalizado**: antes mostraba los 6 artistas más repetidos dentro del pool de canciones "populares" — nada que ver con el usuario en particular. Ahora se arma a partir de sus playlists y sus búsquedas recientes.
- **Por qué Last.fm y no Spotify**: Spotify deprecó justo los endpoints que servirían acá (`audio-features`, `related-artists`, `recommendations`) para cualquier app creada después de noviembre 2024 — no son una opción real hoy. Last.fm sigue teniendo `artist.getsimilar` gratis y sin esa restricción (`server/services/lastfm.js`, nuevo).
- Tabla nueva `search_history` (`server/db.js`): se guarda una fila por cada búsqueda (`GET /api/music/search`), podada a las últimas 30 por usuario.
- `server/services/recommendations.js` (nuevo): junta artistas "semilla" (los de las playlists del usuario + los resueltos desde sus últimas búsquedas vía `artist.search` de Last.fm), les pide artistas parecidos, rankea por cuántas semillas distintas los sugirieron, y les busca una canción real a los primeros 6 con `youtube.searchTracks()` (función que ya existía, reusada tal cual). Si el usuario no tiene ninguna semilla todavía (cuenta nueva) devuelve `[]` sin romper nada.
- **Cacheado 30 min en memoria por usuario**: armar esto de cero puede gastar ~600 unidades de cuota de YouTube (hasta 6 búsquedas × 101 unidades cada una, ver [03-backend.md](03-backend.md)) — no es algo que se pueda recalcular en cada carga del dashboard sin cachear.
- `js/dashboard/discover.js`: al arrancar el dashboard se sigue mostrando de entrada el fallback de siempre (top artistas del pool de populares, sin bloquear la carga) y en paralelo se pide `GET /api/music/recommendations`; si vuelve con datos, reemplaza el contenido. Como ahora son canciones reales (no solo nombres de artista), cada fila muestra portada + título + artista y al clickear reproduce esa canción directo, en vez de navegar a la vista "Artistas" como hacía el fallback. Mismo patrón dual que ya tenía la sección (se renderiza tanto en `#top-artists-list`, desktop, como en `#mobile-top-artists-list`, dentro del cajón hamburguesa) — y como los títulos de YouTube pueden ser largos, se les agregó truncado (`text-overflow: ellipsis`) para no repetir el bug de "blowout" de CSS Grid que ya habíamos pisado una vez con el título del hero.
- Verificado sin una API key real de Last.fm (todavía no se cargó en `.env`): con un artista semilla en una playlist de prueba, `GET /api/music/recommendations` degrada con gracia — loguea el error de Last.fm y devuelve `200 []` en vez de romper — así que el resto de la app sigue funcionando aunque falte la key. Falta la verificación con datos reales una vez que se cargue `LASTFM_API_KEY`.

**Pendiente**: cargar `LASTFM_API_KEY` (se consigue gratis en last.fm/api/account/create) en `.env` local y en las variables de entorno de Render — sin eso, "Recomendado" se queda mostrando el fallback de siempre.

---

## 2026-08-04 (7) — Reproductor a pantalla completa

Se agregó una vista de "reproduciendo ahora" a pantalla completa (estilo Spotify). Se abre haciendo click en la info de la canción dentro de la barra inferior (`master_play`).

Técnicamente no es un reproductor nuevo: `player.js` ya tenía toda la lógica de reproducción (play/pausa, siguiente/anterior, shuffle, volumen, barra de progreso) atada a los elementos de `master_play`. Se agregó un segundo juego de elementos (`fs-*`) para la vista fullscreen, y cada función que ya actualizaba la mini-barra (`loadMusic`, `playMusic`, `pauseMusic`, `updateProgressBar`, `setShuffle`, `toggleMute`) ahora actualiza ambos juegos en paralelo — nunca se desincronizan porque hay una sola fuente de verdad (`state`), solo dos lugares en pantalla mostrándola. Los botones de la vista fullscreen llaman a las mismas funciones que ya usaban los de siempre, no hay lógica de reproducción duplicada.

El contenido (portada, info, controles, volumen, y el logo de Noiz reemplazando al de Spotify) vive dentro de una caja "frosted glass" (`.nowplaying-card`, más transparente que los paneles glass del resto del dashboard porque acá tiene que dejar ver el fondo desenfocado detrás). La flecha para volver quedó a la izquierda de esa caja, chica y sin fondo (`bi-chevron-left`, sin el círculo/pill que tenía al principio). El fondo de toda la pantalla es la portada de la canción bien desenfocada (`filter: blur(22px)`) — CSS puro, mismo truco que ya usaba `.fondo` en las páginas de login/dashboard. Los controles de reproducción y el de volumen quedaron en la misma fila (`.nowplaying-controls-row`), y la caja se hizo más compacta (menos padding/gaps, portada más chica) para que no ocupe casi toda la altura de la pantalla como en el primer intento. En mobile la caja mantiene el mismo estilo (mismo `.nowplaying-card`, sin overrides de transparencia ni de layout) — solo cambian los tamaños vía los mismos `min()` de CSS ya usados en desktop, y la pestañita para volver pasa a quedar arriba a la izquierda de la caja (en vez de al lado) porque no entran ambas cosas en una fila en una pantalla angosta.

---

## 2026-08-04 (6) — Reproductor persistente y "Recomendado" con top 6 artistas

**Reproductor persistente al entrar a Administración**: hasta ahora, entrar al panel de admin cortaba la música — "Administración" era la única opción del sidebar que navegaba a una página HTML aparte (`admin.html`, con su propio `js/admin.js`), y esa navegación destruía el iframe oculto de YouTube que reproduce el audio (y todo el estado de JS con él). El resto del sidebar (Inicio, Explorar, Géneros, Radio, Artistas, Albums, playlists) ya era 100% SPA — cambia de vista con JS sin recargar nada — por eso ahí nunca se cortaba. La solución fue tratar a Admin igual que a esas otras vistas: se migró todo su markup y su lógica (`js/admin.js` → `js/dashboard/admin.js`) adentro de `dashboard.html`, como una sección más (`#admin-view`) que `setActiveNav()` muestra/esconde igual que ya hacía con `song_side`/`discover_side`. La ruta vieja `/html/admin.html` en el servidor ahora solo redirige a `/html/dashboard.html`, por compatibilidad con bookmarks. No cambia quién puede ver datos de admin: la protección real siempre fue (y sigue siendo) `requireAdmin` sobre cada endpoint `/api/admin/*`, no la carga de una página. Como `dashboard.html` es la misma página en desktop y en el celular/PWA, este arreglo aplica en mobile sin nada adicional.

**"Recomendado" ahora son 6 artistas clickeables, no 1 track random**: la vieja card de "Recomendado" (un track al azar del pool de canciones populares) y el widget separado "Top Artistas" (5 artistas por cantidad de canciones, no clickeable) se unificaron en una sola sección: los 6 artistas con más canciones dentro de ese mismo pool de populares (mismo cálculo que ya existía, solo que ahora es la única fuente de la sección), cada uno clickeable — al tocar uno, lleva directo a la vista "Artistas" con las canciones de ese artista ya cargadas (`showArtistSongs()`, nuevo en `browse.js`, reusa la misma lógica que ya tenía el flujo de chips de Artistas). En mobile, como la columna derecha donde vive esto (`.discover_side`) está oculta por CSS, la sección se muestra en cambio dentro del cajón hamburguesa (`.mobile-only-section`, visible solo en el media query mobile) — `discover.js` renderiza el mismo resultado en ambos contenedores para que no se desincronicen.

Verificado: `node --test` sigue en 21/21 (sin cambios de backend salvo el redirect de `/html/admin.html`). Contra el server local conectado a la Turso real: se registró y logueó una cuenta de prueba, se confirmó que `dashboard.html` autenticado ya trae el nuevo `#admin-view`/`#mobile-top-artists-list` y ya no trae la vieja `#recommended-card`, y que `/api/admin/stats` le sigue devolviendo 403 a un usuario no-admin — la cuenta de prueba se borró después.

---

## 2026-08-04 (5) — Verificación de email en el registro

Cerraba el último ítem de seguridad pendiente que quedó anotado en `docs/04-seguridad.md`: hasta ahora cualquiera podía crear una cuenta con el email de otra persona sin confirmarlo — la cuenta quedaba totalmente funcional igual, el campo "verificado" no existía. Mismo mecanismo que ya usa "olvidé mi contraseña" (token random, se guarda el hash SHA-256 en la base, link por mail, expira), aplicado a un caso distinto — no es una arquitectura nueva.

- **`POST /api/register` deja de loguear automáticamente.** Antes, registrarse abría sesión al toque; ahora crea la cuenta con `email_verified = 0`, manda un mail de confirmación, y no hay sesión hasta que se confirma. Si el registro siguiera logueando aunque sea con la cuenta sin confirmar, la verificación no protegería nada de verdad — solo sería un campo decorativo que nadie chequea.
- **`POST /api/login` rechaza (403) una cuenta sin verificar**, aunque la contraseña sea correcta. Se agregó `POST /api/resend-verification` (mismo principio de "no enumerar usuarios" que `forgot-password`: responde `ok: true` exista o no la cuenta) para cuando el mail se pierde o el link vence.
- **Migración sin romper cuentas existentes**: la tabla `users` ya tenía filas reales en Turso (la mía, la tuya, y varias de amigos que ya habían probado la app). `server/db.js` agrega la columna nueva con `ALTER TABLE ... ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1` — pero **solo si la columna todavía no existe** (chequeado con `PRAGMA table_info`) — así todas las cuentas de antes de este cambio quedan marcadas como verificadas automáticamente, y nadie se queda afuera de su propia cuenta. Confirmado contra la base real de Turso después del deploy: las 10 cuentas que ya existían (incluida la admin) quedaron en `verified=1`.
- **Tests**: como el registro ya no autentica, se rompían los helpers de setup de `playlists.test.js` y `music.test.js` (asumían que registrarse ya dejaba logueado). Se armó `test/helpers.js`, compartido entre los 4 archivos de test, con el mismo truco que ya usaba `password-reset.test.js` para probar flujos por mail sin mandar mails de verdad: mockear `fetch` hacia `api.sendgrid.com`, capturar el último mail "enviado", y sacarle el token con una regex antes de pegarle al endpoint de verificación. Se sumaron 5 tests nuevos para el flujo de verificación (21 tests en total, todos en verde).

---

## 2026-08-04 (4) — El cajón de navegación mobile no se cerraba solo

En mobile, elegir algo del menú hamburguesa (por ejemplo "Artistas") navegaba a esa vista pero el cajón se quedaba abierto tapando la pantalla. Causa: el cajón se abre/cierra con un checkbox oculto (`#mobile-menu-toggle`, truco CSS-only vía `:checked`), y nada lo destildaba al elegir una opción. Se agregó `closeMobileMenu()` en `js/dashboard/utils.js`, llamada desde `setActiveNav()` (`js/dashboard/playlists.js`) — el punto por el que pasan todas las navegaciones del sidebar (Inicio, Explorar, playlists, y Géneros/Radio/Artistas/Albums vía `resetBrowseView`), así quedó arreglado en un solo lugar en vez de repetirlo en cada handler.

**Auth de git**: se reemplazó el flujo de pegar un Personal Access Token en cada push por una clave SSH dedicada (`~/.ssh/id_ed25519_github`, cargada en la cuenta de GitHub del usuario). El remote de este repo ahora es `git@github.com:VargasEnzo/proyecto-noiz.git`.

---

## 2026-08-04 (3) — Arreglar el desfasaje real en mobile y logo en el login

Los arreglos de mobile de la entrada anterior (el "2") no alcanzaron: probando ya desplegado en un celular Android, la interfaz seguía desfasándose (texto cortado, contenido más ancho que la pantalla). El motivo era otro, y solo aparecía con datos reales (no se veía en local porque ahí no había canciones cargadas):

- **Causa real**: `.now-playing-hero-overlay h2` (el título de la canción sonando, en la card "Sonando ahora") no tenía ningún límite de ancho ni truncado. Con los títulos largos reales que vienen de YouTube (tipo "Artista - Canción (Video Oficial) ft. Fulano, Mengano..."), el texto forzaba a crecer la columna del grid del dashboard entera (`.song_side`, `.mobile-topbar`, todo lo que comparte esa columna) más allá del ancho de la pantalla — el clásico bug de "blowout" de CSS Grid, donde un track `1fr` no se achica por debajo del contenido mínimo de sus items a menos que se le diga explícitamente. Confirmado midiendo directamente en producción con Playwright emulando un Android real: el panel llegaba a medir 646px en una pantalla de 412px.
- **Arreglo**: el título del hero ahora trunca a 2 líneas con "…" (`-webkit-line-clamp`), y se agregó `min-width: 0` a los items del grid mobile (`.mobile-topbar`, `.song_side`, `.master_play`) — el fix estándar para este tipo de bug, que además protege contra que aparezca de nuevo con cualquier otro contenido largo en el futuro. Se sumó `overflow-x: hidden` en el body como red de seguridad adicional.
- Verificado simulando canciones con títulos largos reales contra el server local (con Playwright emulando un Pixel 7): antes, `.song_side` medía 646px en una pantalla de 412px; después, todo queda contenido exactamente en el ancho de pantalla.

**Login**: se agregó el logo de Noiz (ícono + wordmark) arriba del título "Iniciar sesión"/"Crear cuenta", con el mismo estilo que usa el sidebar del dashboard.

---

## 2026-08-04 (2) — Retoques estéticos y arreglos de la PWA

**Logo**
- El logo (`IMAGENES/logo-noiz.png`) tenía un margen transparente enorme alrededor de la "N" (el dibujo real ocupaba solo ~42% del canvas), por eso se veía chico y perdía nitidez a tamaño ícono. Se generaron dos variantes nuevas a partir del original: `logo-noiz-icon.png` (recortada al borde real, para el sidebar del dashboard y el header del admin) y `logo-noiz-app-icon.png`/`logo-noiz-app-icon-192.png` (la N en blanco sobre fondo sólido oscuro, para el ícono de la PWA/favicon/apple-touch-icon, donde la transparencia no funciona bien).

**Panel de admin**
- El texto "Admin" junto al logo era casi ilegible (`color: var(--color-accent-soft)`, un lila muy claro que se perdía contra el fondo). Ahora usa `var(--color-text)`.

**PWA / mobile**
- El manifest apuntaba al logo viejo (N negra sobre transparente) combinado con un `background_color` oscuro — eso hacía que el splash screen al abrir la app en el celular se viera como "fondo oscuro con letra negra", casi invisible. Ahora usa el ícono nuevo (N blanca sobre fondo oscuro), y se agregaron variantes `maskable` para que Android no la recorte mal con su máscara de ícono adaptativo.
- Se reemplazó `100vh` por `100dvh` (con `100vh` como respaldo) en los contenedores de pantalla completa de dashboard, login y admin. `100vh` no tiene en cuenta que la barra de direcciones del navegador mobile aparece/desaparece y cambia el alto visible real — eso podía cortar o desplazar contenido en el celular.
- Se corrigió el bug ya detectado antes en `service-worker.js`: precacheaba `/js/dashboard.js`, que no existe (el dashboard vive en `js/dashboard/main.js`). Como `cache.addAll` falla entero si un solo archivo de la lista da 404, esto podía romper la instalación de la PWA en silencio. Se corrigieron las rutas y se subió la versión del caché (`noiz-shell-v2`) para que los usuarios que ya la tenían instalada reciban la actualización.
- El cajón de navegación mobile (`.menu_side`) tenía un fondo semitransparente pensado para el efecto "vidrio" del sidebar de escritorio; en el celular, al deslizarse por encima del resto de la interfaz, dejaba traslucir contenido de atrás. Se le subió la opacidad para uso mobile.

---

## 2026-08-04 — Seguridad, panel de admin y primera documentación

**Seguridad**
- El servidor ya no arranca en producción si falta `SESSION_SECRET` (antes usaba un secreto por defecto hardcodeado si esa variable no estaba seteada).
- Se agregó `helmet` para headers de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.). El CSP tuvo que ajustarse para permitir explícitamente el reproductor de YouTube y los CDNs de íconos/fuentes que usan las páginas (Bootstrap Icons, Font Awesome, Google Fonts) — sin esos permisos, el CSP rompía los íconos de todo el sitio.
- La cookie de sesión ahora fija `sameSite: 'lax'` explícitamente.
- `express.json()` limita el tamaño del body a 100kb.
- Se agregó rate limiting a `/api/music/*` y a las rutas de escritura de `/api/playlists` (antes solo estaba en login/registro). Se extrajo a un middleware reusable (`server/middleware/apiLimiter.js`).

**Panel de administración**
- Se corrigió que el link "Administración" del sidebar aparecía para *todos* los usuarios, no solo para el admin. No era un bug de JavaScript (la lógica de mostrar/ocultar ya estaba bien) sino de **especificidad CSS**: una regla más específica (`.playlist h4`) le ganaba a la clase `.hidden`. Se resolvió agregando `!important` a `.hidden` en los tres CSS del proyecto.
- Se agregó un contador de cuota de YouTube usada en el día, visible en el panel de admin. La cuota de YouTube es global (compartida entre todos los usuarios de la app, no por usuario) y no tiene un endpoint público para consultarla en tiempo real, así que se armó un tracking propio: cada llamada a la YouTube API en `server/services/youtube.js` registra su costo conocido en una tabla nueva (`youtube_quota_usage`), agrupado por día (huso horario Pacífico, que es cuando Google resetea la cuota).

**Documentación**
- Primera versión de la carpeta `docs/`, cubriendo la historia del proyecto, el frontend, el backend, la seguridad, y el deploy. A partir de ahora, cada sesión de trabajo que termine en un commit suma una entrada acá.

---

<!--
Al agregar una entrada nueva:
- Fecha en formato AAAA-MM-DD, más reciente arriba.
- Un título corto que resuma el tema del commit/sesión.
- Bullets agrupados por área si tocaste varias cosas (Seguridad, Frontend, Backend, etc.) — no hace falta la lista completa de archivos, con el diff alcanza para eso.
- Explicar el motivo de cada cambio, no solo qué se tocó — el "qué" ya lo tiene el diff.
-->