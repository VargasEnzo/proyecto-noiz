# Changelog

Registro de cambios en lenguaje simple, más nuevo arriba. Es un complemento de `git log`, no un reemplazo: acá se explica el **por qué** y el **para qué**, no el detalle línea por línea (eso lo tiene el diff de cada commit).

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