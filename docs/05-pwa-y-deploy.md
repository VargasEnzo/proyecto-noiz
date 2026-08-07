# PWA y deploy

## ¿Qué es una PWA?

PWA (*Progressive Web App*) es una página web que, cumpliendo ciertos requisitos, el navegador ofrece "instalar" como si fuera una app nativa: aparece con su propio ícono, abre en su propia ventana (sin la barra de direcciones del navegador), y puede funcionar (parcialmente) sin conexión. No es una app nativa de verdad — sigue siendo la misma página web — pero se comporta como una desde el punto de vista del usuario. Dos piezas la habilitan:

### El manifest (`manifest.json`)

Un archivo JSON que le dice al navegador cómo se llama la app, qué ícono usar, y cómo se ve al abrirse instalada (`display: "standalone"` = sin la UI del navegador alrededor). [js/pwa.js](../js/pwa.js) es el script (cargado en casi todas las páginas) que registra el service worker — sin ese registro, tener el `manifest.json` no alcanza para que el navegador ofrezca instalar la app.

### El service worker (`service-worker.js`)

Un script que el navegador ejecuta en segundo plano, por fuera de cualquier pestaña en particular, y que puede interceptar los requests de red de la app. Noiz lo usa para dos cosas:

1. **Precachear el "shell"** de la app (login, dashboard, sus CSS/JS, los íconos) al instalarse, así la próxima vez que se abra carga más rápido.
2. **Estrategia network-first**: en cada request, intenta primero traer la versión más nueva del servidor; solo si no hay conexión, usa la copia guardada en caché. Es la estrategia opuesta a "cache-first" — prioriza que el usuario siempre vea contenido actualizado, y usa el caché solo como respaldo sin internet.

Cada vez que cambia qué se precachea, hay que subir `CACHE_NAME` (por ejemplo `noiz-shell-v2`) — es lo que le indica al navegador que hay una versión nueva del caché y que debe reemplazar la anterior en los dispositivos donde la PWA ya está instalada.

### Los íconos de la PWA

Hay dos assets distintos derivados del logo original (`IMAGENES/logo-noiz.png`), para dos usos distintos:

- **`logo-noiz-icon.png`**: la "N" recortada al borde real (el archivo original tenía un margen transparente enorme alrededor, ocupando solo ~42% del canvas — por eso se veía chica y perdía nitidez a tamaño ícono). Se usa inline en el sidebar del dashboard y el header del admin, con fondo transparente — el CSS la pinta de blanco con `filter: brightness(0) invert(1)`.
- **`logo-noiz-app-icon.png`** / **`logo-noiz-app-icon-192.png`**: la "N" en blanco ya renderizada sobre un fondo sólido oscuro (`#14172a`, el mismo color que `background_color` en `manifest.json`). Se usa para los íconos del manifest (incluyendo variantes `purpose: "maskable"`, para que Android no la recorte mal al aplicarle su máscara de ícono adaptativo), el favicon, y el `apple-touch-icon` — en esos contextos no conviene depender de transparencia (iOS/Android la rellenan con un color que no controlamos), así que el fondo va horneado directamente en el PNG.

### El truco de `100dvh`

Los contenedores de pantalla completa (`body` en login/dashboard/admin, el `header` del dashboard en mobile, el cajón de navegación) declaran `height: 100vh` seguido de `height: 100dvh` — la segunda línea pisa a la primera en los navegadores que la soportan, y sirve de respaldo en los que no. La diferencia importa en mobile: `100vh` no tiene en cuenta que la barra de direcciones del navegador aparece/desaparece dinámicamente (cambiando cuánto se ve realmente en pantalla), lo que puede cortar o desplazar contenido. `100dvh` ("dynamic viewport height") sí se ajusta a ese cambio en tiempo real.

## Deploy: Render

Noiz está desplegado en **[Render](https://render.com)**, en `https://noiz-f7lo.onrender.com`. El flujo de trabajo es:

1. Se desarrolla y prueba en local.
2. Se hace commit y push a la rama principal en GitHub.
3. Render detecta el push (tiene el repo conectado) y vuelve a desplegar automáticamente — corre `npm install` y después `npm start` (`node server/index.js`).

### Variables de entorno

El código nunca tiene secretos hardcodeados — todo lo sensible se lee de `process.env` (con la librería `dotenv`, que en local carga esas variables desde un archivo `.env` que **no se sube a git**, listado en `.gitignore`). En Render, esas mismas variables se cargan a mano desde el panel de "Environment Variables" del servicio.

Las variables que usa la app (ver `.env.example` para la lista con descripciones, sin valores reales):

| Variable | Para qué |
|---|---|
| `PORT` | Puerto en el que escucha el servidor (Render lo asigna automáticamente). |
| `SESSION_SECRET` | Firma las cookies de sesión. Obligatoria en producción (ver [04-seguridad.md](04-seguridad.md)). |
| `ADMIN_EMAIL` | Qué cuenta tiene acceso al panel de administración. |
| `YOUTUBE_API_KEY` | Credencial para la YouTube Data API (el catálogo de música). |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | Para mandar el mail de recuperación de contraseña. |
| `LASTFM_API_KEY` | Gratis en [last.fm/api/account/create](https://www.last.fm/api/account/create). Para armar las recomendaciones personalizadas que encabezan "Inicio" (ver [03-backend.md](03-backend.md)). Sin ella, "Inicio" se queda con el catálogo popular de siempre en vez de romper. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Conexión a la base de datos en producción. Si no están, cae a SQLite local (pensado para desarrollo). |
| `YOUTUBE_DAILY_QUOTA` *(opcional)* | Si en algún momento se le pide a Google más cuota diaria que el default de 10.000 unidades, este valor ajusta el panel de admin para que muestre el límite correcto. |
| `JAMENDO_CLIENT_ID` | Quedó de cuando el catálogo era Jamendo (ver [01-historia.md](01-historia.md)). Ya no lo usa ningún archivo del código — candidato a borrar de Render cuando se limpie `server/services/jamendo.js`. |

### Desarrollo local

`npm run dev` levanta el servidor con `nodemon` (reinicia solo cuando cambia un archivo). Requiere Node 24 (ver `.node-version`) y un `.env` local — copiar `.env.example` a `.env` y completar los valores. Si no se completan `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`, el servidor usa un SQLite local en `server/database.sqlite` (se crea solo, y está en `.gitignore`).