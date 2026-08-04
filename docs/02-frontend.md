# El frontend

Todo lo que corre en el navegador del usuario. No usa React, Vue ni ningún framework — es HTML, CSS y JavaScript "vanilla" (sin librerías, usando directamente las APIs del navegador como `document.getElementById`, `fetch`, etc.). Es una decisión válida para un proyecto de este tamaño: menos capas para entender, y fuerza a aprender cómo funciona el DOM de verdad antes de esconderlo detrás de un framework.

## Las páginas (`html/`)

Cada página HTML es un punto de entrada independiente — no hay "router" del lado del cliente, cada `.html` es un archivo real que el servidor sirve.

| Página | Para qué es | Requiere sesión |
|---|---|---|
| [login.html](../html/login.html) | Iniciar sesión o registrarse (son dos `<form>` en la misma página, se togglean con JS). | No |
| [forgot-password.html](../html/forgot-password.html) | Pedir el mail de recuperación de contraseña. | No |
| [reset-password.html](../html/reset-password.html) | Poner una contraseña nueva usando el token del mail. | No |
| [dashboard.html](../html/dashboard.html) | La app en sí: sidebar, lista de canciones, reproductor. | Sí |
| [admin.html](../html/admin.html) | Panel de administración (estadísticas, gestión de usuarios). | Sí, y además tenés que ser el admin (ver [04-seguridad.md](04-seguridad.md)) |
| [index.html](../html/index.html) | El reproductor original de tutorial. No se usa desde ningún lado hoy — ver [01-historia.md](01-historia.md). | No |

El servidor decide qué páginas requieren sesión, no el navegador — si entrás a `/html/dashboard.html` sin haber iniciado sesión, el servidor te redirige a `/html/login.html` antes de mandarte el HTML (ver `requireAuth` en [03-backend.md](03-backend.md)).

## El CSS (`css/`)

- [variables.css](../css/variables.css): variables de diseño compartidas (`--color-accent`, `--radius-lg`, etc.), usando [CSS custom properties](https://developer.mozilla.org/es/docs/Web/CSS/Using_CSS_custom_properties) (`--nombre: valor`, se usan con `var(--nombre)`). Cambiar un color acá lo cambia en toda la app.
- [estilos.css](../css/estilos.css): estilos del reproductor original de tutorial (`index.html`).
- [estiloslogin.css](../css/estiloslogin.css), [estilosdashboard.css](../css/estilosdashboard.css), [estilosadmin.css](../css/estilosadmin.css): un archivo de estilos por página principal, sin un sistema de componentes compartido más allá de `variables.css`.

Todos definen una clase utilitaria `.hidden { display: none !important }` para esconder elementos por JS (togglear `classList`). Usa `!important` a propósito: al ser una clase utilitaria pensada para usarse sobre cualquier elemento, necesita ganarle siempre a los estilos propios de ese elemento (por ejemplo, un `<h4>` de la sidebar que normalmente es `display: flex`).

## El JavaScript de páginas sueltas

`login.js`, `forgot-password.js`, `reset-password.js`, `index.js` y `admin.js` (en [js/](../js/)) son scripts únicos, uno por página, sin módulos ES ni build step — se cargan con `<script src="...">` directo en el HTML. Cada uno hace básicamente lo mismo: escuchar el submit de un formulario, mandar un `fetch` al backend, y mostrar el resultado o el error.

## El dashboard (`js/dashboard/`)

Esta es la parte más grande de la app, y la única que está modularizada con **ES Modules** (`import`/`export`, cargados con `<script type="module">`). Cada archivo tiene una responsabilidad concreta:

- **[state.js](../js/dashboard/state.js)**: un objeto plano (`state`) que guarda todo el estado de la sesión actual — las playlists cargadas, qué se está reproduciendo, si hay shuffle activado, etc. No hay una librería de manejo de estado (como Redux): es un objeto compartido que todos los módulos importan y mutan directamente. Funciona bien a esta escala; en una app mucho más grande empezaría a ser difícil de rastrear quién cambia qué.
- **[api.js](../js/dashboard/api.js)**: el único lugar que hace `fetch` hacia el backend (`/api/...`). Todas las demás piezas del dashboard le piden datos a este módulo en vez de llamar a `fetch` directamente — así, si mañana cambia una URL de la API, se cambia acá una sola vez.
- **[player.js](../js/dashboard/player.js)**: el reproductor de música en sí. Ver la sección siguiente, es la pieza más particular de todo el frontend.
- **[songlist.js](../js/dashboard/songlist.js)**: dibuja la lista de canciones del panel central y maneja los clicks (reproducir, agregar/quitar de una playlist).
- **[playlists.js](../js/dashboard/playlists.js)**: la sidebar de playlists, el modal de "nueva playlist", y el menú flotante de "agregar a esta playlist".
- **[discover.js](../js/dashboard/discover.js)**: la columna derecha ("Recomendado" / "Top Artistas") — se calcula en el navegador a partir de las canciones populares que ya se cargaron, no pide nada nuevo al servidor.
- **[browse.js](../js/dashboard/browse.js)**: las secciones de "Géneros", "Radio", "Artistas" y "Albums" del sidebar.
- **[profile.js](../js/dashboard/profile.js)**: el modal de "Mi perfil" y la lógica que muestra/esconde el link de "Administración" según si sos admin.
- **[utils.js](../js/dashboard/utils.js)**: por ahora, solo `escapeHtml` — convierte texto de usuario en HTML seguro para insertar con `innerHTML` (ver [04-seguridad.md](04-seguridad.md), sección XSS).
- **[main.js](../js/dashboard/main.js)**: el punto de entrada. Se ejecuta al cargar `dashboard.html`, importa todos los módulos de arriba (lo que hace que se "activen" — cada uno registra sus propios event listeners al importarse), y llama a `init()` para cargar el usuario actual, las playlists y las canciones populares.

### Por qué el reproductor no usa `<audio>`

Un dato que sorprende la primera vez: no hay ningún `<audio src="...">` reproduciendo un archivo MP3. Como el catálogo son videos de YouTube (no archivos de audio propios), Noiz reproduce música usando el **YouTube IFrame Player API** — una librería que Google provee (`https://www.youtube.com/iframe_api`) para embeber y controlar un reproductor de YouTube por JavaScript. `player.js` crea ese reproductor oculto (`#youtube-player`, escondido con opacidad en vez de con tamaño 0, porque la API necesita que el iframe tenga un tamaño real para inicializarse bien) y lo controla con métodos como `loadVideoById`, `playVideo`, `pauseVideo`, `seekTo`. La barra de progreso, el tiempo transcurrido, etc., son elementos propios de Noiz que se actualizan leyendo el estado del reproductor de YouTube (`getCurrentTime()`, `getDuration()`) cada medio segundo.

Esto significa que reproducir música en Noiz técnicamente reproduce un video de YouTube (oculto) — importante tenerlo en cuenta si en algún momento se evalúa la parte legal/de negocio del proyecto (ver la nota en [README.md](README.md)).

### Cuidado con los títulos largos en el layout mobile

Los títulos de YouTube pueden ser bastante largos ("Artista - Canción (Video Oficial) ft. Fulano, Mengano..."). Si algún elemento nuevo muestra un título de canción sin limitarle el ancho (`overflow: hidden` + `text-overflow: ellipsis` + `white-space: nowrap`, o un `-webkit-line-clamp` para multilínea), en mobile puede terminar **agrandando toda la columna del grid del dashboard** (`.mobile-topbar`, `.song_side` y todo lo que comparte esa fila/columna en `header`), no solo desbordar ese elemento puntual — es el clásico bug de "blowout" de CSS Grid, donde un track `1fr` no se achica por debajo del contenido mínimo de sus items. Ya pasó una vez con el título de la card "Sonando ahora" (ver [CHANGELOG.md](CHANGELOG.md)). Los items del grid mobile tienen `min-width: 0` como red de seguridad general, pero cualquier texto de longitud variable nuevo debería truncarse explícitamente de todos modos.