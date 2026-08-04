# La historia de Noiz

Entender por qué el código es como es requiere saber de dónde viene. Noiz no arrancó como la app full-stack que es hoy — creció en etapas, y todavía quedan restos visibles de cada una. Esta página cuenta esa evolución en orden, basada en el historial real de commits del repositorio.

## Etapa 0: un reproductor estático de tutorial

El primer commit del repo (`Commit inicial: reproductor, dashboard y login prototipo`) ya traía tres cosas mezcladas, pero la más antigua de verdad es [html/index.html](../html/index.html) — un reproductor de MP3 simple, sin backend, sin login, sin nada dinámico. Es un clon del "Day #30 Music Player" de AsmrProg (un tutorial clásico para aprender JavaScript con DOM). Tiene:

- [html/index.html](../html/index.html): la página, con controles de play/pausa/siguiente/anterior.
- [js/index.js](../js/index.js) y [js/songs.js](../js/songs.js): la lógica del reproductor y una lista fija de 5 canciones (de The Weeknd) codificada directamente en el archivo.
- [css/estilos.css](../css/estilos.css): los estilos de esa página.
- [MUSICA HTML/](../MUSICA%20HTML/): los archivos MP3 y las portadas reales, servidos como archivos estáticos.

Este reproductor **todavía existe en el repo** y todavía funciona, pero quedó como una reliquia: no está enlazado desde ningún otro lado de la app. Es el punto de partida — el "hola mundo" sobre el que se construyó todo lo demás. `js/songs.js` sigue vivo hoy, no por ese reproductor viejo, sino porque el dashboard actual reusa su mismo formato de datos para representar una canción (`id`, `path`, `displayName`, `cover`, `artist`, `duration`).

## Etapa 1: login y dashboard, todavía sin servidor

Encima de eso se armó un login (`html/login.html`) y un dashboard (`html/dashboard.html`) con una interfaz mucho más parecida a Spotify: sidebar, lista de canciones, reproductor fijo abajo. En esta etapa (commits `Conectar login-dashboard-reproductor...` y `Conectar catalogo real de musica (Jamendo API)...`) todavía no había un servidor propio — el catálogo de música venía de una API externa gratuita llamada **Jamendo** (música con licencia libre), y el login probablemente no persistía nada real todavía.

De acá quedan:
- El **layout** actual del dashboard (sidebar + lista de canciones + reproductor), que se mantiene hasta hoy.
- La costumbre de traer el catálogo de una API externa en vez de alojar archivos de audio propios — hoy esa API es YouTube, pero el patrón (pedirle canciones a un tercero) nació acá.

## Etapa 2: aparece el backend

El commit `Agregar backend: autenticacion de usuarios, playlists y preparacion para deploy` es el salto más grande de todos: ahí nace `server/`, con Express, sesiones de usuario reales, contraseñas hasheadas, y una base de datos para guardar usuarios y playlists. A partir de acá Noiz deja de ser una página estática y pasa a ser una aplicación con estado del lado del servidor. Ver [03-backend.md](03-backend.md) para el detalle de cómo quedó armado.

## Etapa 3: pulido y features (PWA, perfil, admin, responsive)

Una seguidilla de commits fue sumando funcionalidad sobre esa base:
- Reproducción aleatoria y control de volumen.
- Conversión a **PWA** instalable (ver [05-pwa-y-deploy.md](05-pwa-y-deploy.md)).
- Diseño responsive para celulares.
- Gestión de perfil de usuario (nombre, apellido, avatar).
- Panel de administración (`html/admin.html`) para ver usuarios y playlists.
- Corrección de vulnerabilidades tempranas (archivos expuestos, XSS).
- División de un `dashboard.js` gigante en los módulos que hoy viven en [js/dashboard/](../js/dashboard/) — mucho más fácil de mantener que un solo archivo.

## Etapa 4: la base se vuelve "de verdad"

Los últimos commits antes de esta documentación cambiaron piezas de infraestructura, una por una, para que la app se pudiera desplegar y sostener en producción:

1. **Tests automatizados** y autenticación más estricta (rate limiting en login/registro, recuperación de contraseña).
2. **SendGrid** para mandar el mail de recuperación de contraseña (antes se probó con Gmail SMTP directo, que Google bloquea para este uso).
3. **Turso** (SQLite alojado en la nube) reemplazando al SQLite local, para que los datos no se pierdan cada vez que Render reinicia el servidor (Render no garantiza que el disco local persista entre despliegues).
4. **YouTube** reemplazando a Jamendo como catálogo de música — Jamendo tiene menos contenido y Noiz necesitaba un catálogo más grande. El archivo viejo, [server/services/jamendo.js](../server/services/jamendo.js), quedó en el repo sin usarse (candidato a borrar).

## Y a partir de acá

Esta carpeta de documentación (`docs/`) arranca en este punto de la historia. De acá en adelante, cada sesión de trabajo que termine en un commit va a sumar una entrada a [CHANGELOG.md](CHANGELOG.md), y los archivos temáticos (`02-frontend.md`, `03-backend.md`, etc.) se actualizan cuando el cambio afecta algo que ya estaba documentado ahí.