# Changelog

Registro de cambios en lenguaje simple, más nuevo arriba. Es un complemento de `git log`, no un reemplazo: acá se explica el **por qué** y el **para qué**, no el detalle línea por línea (eso lo tiene el diff de cada commit).

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