# Seguridad

Qué protege a Noiz hoy, cómo funciona cada pieza, y qué falta.

## Sesiones: cómo la app sabe quién sos

Noiz usa **sesiones de servidor** (con `express-session`), no tokens JWT. La diferencia importa: en vez de mandarle al navegador un token que contiene la identidad del usuario, el servidor guarda esa identidad en su propia memoria (asociada a un ID random) y solo le manda al navegador ese ID, dentro de una cookie. En cada request, el navegador manda la cookie de vuelta, y el servidor busca qué sesión corresponde a ese ID.

Cosas concretas de la implementación:

- La cookie de sesión tiene `secure: true` en producción (solo viaja por HTTPS, nunca en texto plano) y `sameSite: 'lax'` — esto último evita que un sitio externo pueda "arrastrar" la cookie de Noiz en un request que no inició el usuario (protección básica contra CSRF).
- `SESSION_SECRET` es la clave con la que el servidor firma la cookie, para detectar si alguien la modificó. **Es obligatoria en producción**: si `NODE_ENV=production` y no está seteada, el servidor tira un error al arrancar en vez de arrancar igual con un secreto por defecto — antes de este cambio, el servidor arrancaba silenciosamente con un secreto hardcodeado (`'noiz-dev-secret'`), lo que en teoría permitiría forjar sesiones si alguien conociera ese valor.

## Contraseñas

Se guardan hasheadas con **bcrypt** (`bcryptjs`), nunca en texto plano. Bcrypt es un algoritmo pensado específicamente para contraseñas: es deliberadamente lento (para dificultar probar millones de combinaciones si alguien roba la base de datos) e incluye un "salt" (un valor random distinto por contraseña) automáticamente, así dos usuarios con la misma contraseña no producen el mismo hash.

## Recuperación de contraseña

Cuando alguien pide "olvidé mi contraseña" (`POST /api/forgot-password`), el servidor:

1. Genera un token random de 32 bytes.
2. Guarda en la base **el hash SHA-256 del token**, no el token en sí — así, aunque alguien accediera a la base de datos, no podría usar esos hashes para resetear contraseñas (tendría que revertir el hash, que no es viable).
3. Manda por mail (vía SendGrid) un link con el token real, que expira en 1 hora.
4. Responde `{ ok: true }` **siempre**, exista o no ese email en la base — esto es a propósito, para no dejar que alguien use ese endpoint para averiguar qué emails están registrados en Noiz (se llama "no enumerar usuarios", y hay un test específico para esto en `test/password-reset.test.js`).

## XSS: por qué casi todo pasa por `escapeHtml`

XSS (*Cross-Site Scripting*) es cuando un atacante logra que su propio texto se ejecute como HTML/JavaScript dentro de la página de otro usuario — por ejemplo, si el nombre de una playlist fuera `<img src=x onerror="robar_cookie()">` y la app lo insertara tal cual con `innerHTML`, ese código se ejecutaría en el navegador de cualquiera que vea esa playlist.

Noiz arma casi toda su interfaz dinámicamente con `innerHTML` (no hay un framework como React que escape esto automáticamente), así que cada vez que se inserta texto que viene de un usuario (nombre de playlist, nombre de canción, email, etc.) pasa antes por `escapeHtml()` ([js/dashboard/utils.js](../js/dashboard/utils.js), duplicada en [js/admin.js](../js/admin.js)), que convierte los caracteres peligrosos (`<`, `>`, `&`, comillas) en sus equivalentes seguros (`&lt;`, `&gt;`, etc.). Es una convención que hay que mantener a mano en cada lugar nuevo que arme HTML por string — no hay nada que lo fuerce automáticamente.

## Content-Security-Policy (CSP)

Desde `helmet`, cada respuesta incluye un header `Content-Security-Policy` que le dice al navegador de qué orígenes tiene permitido cargar scripts, estilos, imágenes, e iframes. Es una segunda capa de defensa contra XSS: aunque algún texto sin escapar se colara, el navegador igual bloquearía scripts inline o de un dominio no autorizado.

La configuración en [server/index.js](../server/index.js) tiene que permitir explícitamente:
- `script-src`: `www.youtube.com` y `s.ytimg.com` (el reproductor de YouTube).
- `frame-src`: `www.youtube.com` (el iframe del reproductor).
- `style-src`: `fonts.googleapis.com`, `cdn.jsdelivr.net` (Bootstrap Icons) y `cdnjs.cloudflare.com` (Font Awesome, usado solo en `index.html`) — los tres CDNs externos que usan los `<link rel="stylesheet">` de las distintas páginas.
- `img-src`: `https:` en general, porque las portadas de las canciones vienen de dominios de YouTube que cambian.

Si en algún momento se agrega un nuevo `<link>` o `<script>` externo a una página y de golpe deja de funcionar (o un ícono desaparece) sin ningún error visible en el HTML, **lo primero que hay que revisar es la consola del navegador** buscando un mensaje que diga `violates the following Content Security Policy directive` — y agregar ese dominio a la directiva correspondiente en `server/index.js`.

## Rate limiting

Limita cuántos requests puede hacer la misma IP en una ventana de tiempo, usando `express-rate-limit` (ver [server/middleware/apiLimiter.js](../server/middleware/apiLimiter.js)):

- Login/registro/recuperación de contraseña: 10 intentos cada 15 minutos — dificulta fuerza bruta contra contraseñas.
- `/api/music/*`: 60 requests cada 15 minutos — protege la cuota de YouTube (ver [03-backend.md](03-backend.md)) de que un solo usuario (o un bot) la agote sola.
- Las rutas de escritura de `/api/playlists` (crear/borrar playlist, agregar/quitar canción): mismo límite, para evitar spam de escritura en la base.

Se desactiva automáticamente cuando `NODE_ENV=test`, para que los tests no se bloqueen entre sí.

## Autorización: quién puede ver/tocar qué

Dos niveles distintos, que conviene no confundir:

- **Autenticación** ("¿quién sos?"): resuelta por la sesión — `requireAuthApi`/`requireAuth`.
- **Autorización** ("¿podés hacer esto?"): resuelta caso por caso. Por ejemplo, en `playlists.js`, cada operación sobre una playlist chequea `WHERE id = ? AND user_id = ?` — no alcanza con estar logueado, tenés que ser dueño de ese recurso puntual. Ser admin es un caso especial de autorización: se resuelve comparando el email del usuario logueado contra la variable de entorno `ADMIN_EMAIL` (ver `requireAdmin.js`), no hay un campo "rol" en la base.

Vale aclarar un matiz de esto último: el link "Administración" del sidebar se esconde en el navegador si no sos admin, pero esa es solo la parte visual — **la protección real está del lado del servidor** (tanto en la ruta que sirve `admin.html` como en cada endpoint de `/api/admin/*`, vía `requireAdmin`). Aunque alguien lograra mostrar el link a mano con las herramientas de desarrollador, no podría llamar a ninguno de esos endpoints sin ser el usuario admin de verdad.

## Lo que todavía falta (a agosto 2026)

- **Verificación de email en el registro**: hoy cualquiera puede crear una cuenta con el email de otra persona, sin confirmarlo.
- **Tests del panel de admin**: `admin.js` (rutas) no tiene cobertura de tests todavía.
- Ver también la lista completa de mejoras pendientes que se armó al auditar el proyecto — quedó registrada en la conversación con Claude Code, no en un archivo del repo todavía (podría valer la pena bajarla a un `TODO.md` o a issues de GitHub si el proyecto crece).