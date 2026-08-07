# El frontend

Todo lo que corre en el navegador del usuario. No usa React, Vue ni ningún framework — es HTML, CSS y JavaScript "vanilla" (sin librerías, usando directamente las APIs del navegador como `document.getElementById`, `fetch`, etc.). Es una decisión válida para un proyecto de este tamaño: menos capas para entender, y fuerza a aprender cómo funciona el DOM de verdad antes de esconderlo detrás de un framework.

## Las páginas (`html/`)

Cada página HTML es un punto de entrada independiente — no hay "router" del lado del cliente, cada `.html` es un archivo real que el servidor sirve.

| Página | Para qué es | Requiere sesión |
|---|---|---|
| [login.html](../html/login.html) | Iniciar sesión o registrarse (son dos `<form>` en la misma página, se togglean con JS). | No |
| [forgot-password.html](../html/forgot-password.html) | Pedir el mail de recuperación de contraseña. | No |
| [reset-password.html](../html/reset-password.html) | Poner una contraseña nueva usando el token del mail. | No |
| [dashboard.html](../html/dashboard.html) | La app en sí: sidebar, lista de canciones, reproductor, y el panel de administración (una vista más adentro de esta misma página, ver más abajo). | Sí |
| [index.html](../html/index.html) | El reproductor original de tutorial. No se usa desde ningún lado hoy — ver [01-historia.md](01-historia.md). | No |

El servidor decide qué páginas requieren sesión, no el navegador — si entrás a `/html/dashboard.html` sin haber iniciado sesión, el servidor te redirige a `/html/login.html` antes de mandarte el HTML (ver `requireAuth` en [03-backend.md](03-backend.md)).

## El CSS (`css/`)

- [variables.css](../css/variables.css): variables de diseño compartidas (`--color-accent`, `--radius-lg`, etc.), usando [CSS custom properties](https://developer.mozilla.org/es/docs/Web/CSS/Using_CSS_custom_properties) (`--nombre: valor`, se usan con `var(--nombre)`). Cambiar un color acá lo cambia en toda la app.
- [estilos.css](../css/estilos.css): estilos del reproductor original de tutorial (`index.html`).
- [estiloslogin.css](../css/estiloslogin.css), [estilosdashboard.css](../css/estilosdashboard.css): un archivo de estilos por página principal, sin un sistema de componentes compartido más allá de `variables.css`. El panel de admin ya no tiene su propio CSS aparte (`estilosadmin.css` se borró) — sus reglas viven en `estilosdashboard.css`, porque ahora es una vista más del dashboard.

Todos definen una clase utilitaria `.hidden { display: none !important }` para esconder elementos por JS (togglear `classList`). Usa `!important` a propósito: al ser una clase utilitaria pensada para usarse sobre cualquier elemento, necesita ganarle siempre a los estilos propios de ese elemento (por ejemplo, un `<h4>` de la sidebar que normalmente es `display: flex`).

## El JavaScript de páginas sueltas

`login.js`, `forgot-password.js`, `reset-password.js` e `index.js` (en [js/](../js/)) son scripts únicos, uno por página, sin módulos ES ni build step — se cargan con `<script src="...">` directo en el HTML. Cada uno hace básicamente lo mismo: escuchar el submit de un formulario, mandar un `fetch` al backend, y mostrar el resultado o el error. (`admin.js` vivía acá también, pero se migró a `js/dashboard/admin.js` — ver más abajo.)

## El dashboard (`js/dashboard/`)

Esta es la parte más grande de la app, y la única que está modularizada con **ES Modules** (`import`/`export`, cargados con `<script type="module">`). Cada archivo tiene una responsabilidad concreta:

- **[state.js](../js/dashboard/state.js)**: un objeto plano (`state`) que guarda todo el estado de la sesión actual — las playlists cargadas, qué se está reproduciendo, si hay shuffle activado, etc. No hay una librería de manejo de estado (como Redux): es un objeto compartido que todos los módulos importan y mutan directamente. Funciona bien a esta escala; en una app mucho más grande empezaría a ser difícil de rastrear quién cambia qué.
- **[api.js](../js/dashboard/api.js)**: el único lugar que hace `fetch` hacia el backend (`/api/...`). Todas las demás piezas del dashboard le piden datos a este módulo en vez de llamar a `fetch` directamente — así, si mañana cambia una URL de la API, se cambia acá una sola vez.
- **[player.js](../js/dashboard/player.js)**: el reproductor de música en sí, tanto la mini-barra inferior (`master_play`) como el reproductor a pantalla completa. Ver la sección siguiente, es la pieza más particular de todo el frontend.
- **[songlist.js](../js/dashboard/songlist.js)**: dibuja la lista de canciones del panel central y maneja los clicks (reproducir, agregar/quitar de una playlist).
- **[playlists.js](../js/dashboard/playlists.js)**: la sidebar de playlists, el modal de "nueva playlist", y el menú flotante de "agregar a esta playlist".
- **[discover.js](../js/dashboard/discover.js)**: dueño del panel derecho (`discover_side`), que ya no es "Recomendado" (esa lógica se mudó a poblar "Inicio", ver [03-backend.md](03-backend.md)) — ahora es un acompañante de lo que se está reproduciendo: portada/título/artista de la canción actual, y debajo hasta 10 canciones más del mismo artista, pensado para llenar el alto del panel en vez de dejarlo vacío (`GET /api/music/artist-tracks`). Se actualiza en cada `loadMusic()` (ver player.js). Clickear la mini-card abre el reproductor a pantalla completa; clickear una de esas canciones la reproduce directo. Solo existe en desktop — no tiene equivalente en el cajón hamburguesa de mobile (se sacó de ahí; ver la sección de abajo).
- **[browse.js](../js/dashboard/browse.js)**: las secciones de "Géneros", "Radio", "Artistas" y "Albums" del sidebar.
- **[admin.js](../js/dashboard/admin.js)**: el panel de administración, migrado acá desde el viejo `js/admin.js` (página aparte) — ver la sección de abajo.
- **[profile.js](../js/dashboard/profile.js)**: el modal de "Mi perfil" y la lógica que muestra/esconde el link de "Administración" según si sos admin.
- **[utils.js](../js/dashboard/utils.js)**: helpers chicos compartidos — `escapeHtml` (convierte texto de usuario en HTML seguro para insertar con `innerHTML`, ver [04-seguridad.md](04-seguridad.md) sección XSS) y `closeMobileMenu` (cierra el cajón de navegación mobile; ver más abajo).
- **[main.js](../js/dashboard/main.js)**: el punto de entrada. Se ejecuta al cargar `dashboard.html`, importa todos los módulos de arriba (lo que hace que se "activen" — cada uno registra sus propios event listeners al importarse), y llama a `init()` para cargar el usuario actual, las playlists y las canciones populares.

### Por qué el reproductor no usa `<audio>`

Un dato que sorprende la primera vez: no hay ningún `<audio src="...">` reproduciendo un archivo MP3. Como el catálogo son videos de YouTube (no archivos de audio propios), Noiz reproduce música usando el **YouTube IFrame Player API** — una librería que Google provee (`https://www.youtube.com/iframe_api`) para embeber y controlar un reproductor de YouTube por JavaScript. `player.js` crea ese reproductor oculto (`#youtube-player`, escondido con opacidad en vez de con tamaño 0, porque la API necesita que el iframe tenga un tamaño real para inicializarse bien) y lo controla con métodos como `loadVideoById`, `playVideo`, `pauseVideo`, `seekTo`. La barra de progreso, el tiempo transcurrido, etc., son elementos propios de Noiz que se actualizan leyendo el estado del reproductor de YouTube (`getCurrentTime()`, `getDuration()`) cada medio segundo.

Esto significa que reproducir música en Noiz técnicamente reproduce un video de YouTube (oculto) — importante tenerlo en cuenta si en algún momento se evalúa la parte legal/de negocio del proyecto (ver la nota en [README.md](README.md)).

### Dos vistas del mismo reproductor: la mini-barra y la pantalla completa

Además de la barra inferior (`master_play`), hay un reproductor a pantalla completa (`#nowplaying-fullscreen` en `dashboard.html`, estilo inspirado en la vista de "reproduciendo ahora" de Spotify). Se abre haciendo click en la info de la canción dentro de `master_play` (`#now-playing-open-btn`), y se cierra con la flecha (`bi-chevron-left`) a la izquierda de la caja del reproductor.

El contenido (portada, título/artista, progreso, controles, volumen, logo de Noiz) vive dentro de `.nowplaying-card`, una caja "frosted glass" — no es un estilo nuevo, reusa exactamente el mismo patrón que ya tienen los paneles del dashboard (`menu_side`, `song_side`, `discover_side`, `master_play`, `#admin-view`): `backdrop-filter: blur(14px)` + `var(--color-panel-bg)` + `var(--color-glass-border)`. Detrás de esa caja, toda la pantalla tiene la portada de la canción como fondo, desenfocada con `filter: blur(22px)` (justo lo suficiente para no distinguir la imagen del todo, sin ser un manchón).

No es un componente aparte con su propio estado: son simplemente **otro juego de elementos del DOM** (`fs-*` en vez de `mp-*`) que `player.js` actualiza en paralelo a los de siempre, cada vez que cambia algo — `loadMusic()` escribe la portada/título/artista en ambos juegos de elementos (y además setea el fondo desenfocado con la portada de la canción), `playMusic()`/`pauseMusic()` togglean el ícono de play en ambos botones, `updateProgressBar()` actualiza ambas barras de progreso, etc. Los botones del reproductor fullscreen (play, anterior, siguiente, shuffle, volumen, barra de progreso) llaman exactamente a las mismas funciones que ya usaban los de `master_play` — no hay lógica de reproducción duplicada, solo el HTML/CSS están duplicados a propósito porque son dos lugares distintos en pantalla.

El fondo desenfocado no es una imagen aparte: es un `<div>` (`#nowplaying-bg`) al que se le setea `background-image` con la misma URL de portada de la canción, agrandado con `transform: scale()` para que el blur no deje ver el borde recortado de la imagen — mismo truco que ya usa `.fondo` para el fondo general de las páginas de auth.

### El reproductor es persistente porque todo el sidebar es una sola página

`dashboard.html` es una sola página: elegir "Inicio", "Explorar", "Géneros", "Radio", "Artistas", "Albums" o una playlist nunca navega a otro HTML, solo cambia con JS qué se muestra en el panel central (`song_side`) y qué chips aparecen — el patrón `resetBrowseView()`/`showChips()`/`renderSongList()` en `browse.js`. Como el iframe oculto de YouTube (`#youtube-player`) vive en el `<header>` de `dashboard.html` y nunca se destruye durante esos cambios, la música sigue sonando sin importar qué parte de la app estés mirando.

"Administración" seguía esa misma lógica hasta hace poco, pero era la única excepción: hacía `window.location.href = 'admin.html'`, una navegación real a una página HTML totalmente aparte — eso destruía el iframe (y con él, la reproducción) cada vez que entrabas al panel de admin, y no la recuperaba al volver. Se resolvió convirtiendo Admin en una vista más del dashboard, igual que Géneros/Artistas: el markup vive ahora en `dashboard.html` dentro de `#admin-view` (oculto por default), `js/dashboard/admin.js` reemplaza al viejo `js/admin.js`, y `setActiveNav()` (en `playlists.js`) es quien muestra/esconde `#admin-view` vs. `.song_side`/`.discover_side` según la vista activa — el mismo punto único por el que ya pasaban todas las demás navegaciones del sidebar. La ruta vieja `/html/admin.html` en el servidor ahora solo redirige a `/html/dashboard.html`, por si quedó algún link o bookmark viejo.

Importante: esto **no cambia quién puede ver datos de administración**. La protección real siempre estuvo (y sigue estando) en `requireAdmin` sobre cada endpoint `/api/admin/*` (ver [04-seguridad.md](04-seguridad.md)) — mostrar el HTML del panel no expone nada, porque sin esa autorización todos los `fetch` de `admin.js` devuelven 403 igual.

Como `dashboard.html` es la misma página en desktop y en mobile/PWA (el layout mobile es CSS responsive sobre el mismo HTML, no una página distinta), este arreglo aplica en el celular también sin nada adicional.

### Cuidado con los títulos largos en el layout mobile

Los títulos de YouTube pueden ser bastante largos ("Artista - Canción (Video Oficial) ft. Fulano, Mengano..."). Si algún elemento nuevo muestra un título de canción sin limitarle el ancho (`overflow: hidden` + `text-overflow: ellipsis` + `white-space: nowrap`, o un `-webkit-line-clamp` para multilínea), en mobile puede terminar **agrandando toda la columna del grid del dashboard** (`.mobile-topbar`, `.song_side` y todo lo que comparte esa fila/columna en `header`), no solo desbordar ese elemento puntual — es el clásico bug de "blowout" de CSS Grid, donde un track `1fr` no se achica por debajo del contenido mínimo de sus items. Ya pasó una vez con el título de la card "Sonando ahora" (ver [CHANGELOG.md](CHANGELOG.md)). Los items del grid mobile tienen `min-width: 0` como red de seguridad general, pero cualquier texto de longitud variable nuevo debería truncarse explícitamente de todos modos.

### El cajón de navegación mobile es un truco CSS-only (checkbox hack)

En mobile, el sidebar se convierte en un cajón deslizable (`.menu_side`) que se abre con el botón de hamburguesa. No hay JS manejando ese estado abierto/cerrado: es el ["checkbox hack"](https://css-tricks.com/the-checkbox-hack/) — un `<input type="checkbox" id="mobile-menu-toggle">` oculto, y CSS que usa el selector `:checked` para mostrar/ocultar el cajón (ver `dashboard.html` y las reglas `#mobile-menu-toggle:checked ~ .menu_side` en `estilosdashboard.css`). El botón de hamburguesa y el botón de cerrar son `<label for="mobile-menu-toggle">`, que tildan/destildan el checkbox al hacer click sin necesitar JS.

La consecuencia práctica: **elegir algo del menú no cierra el cajón solo**, porque nada tilda/destilda el checkbox al navegar — hay que hacerlo a mano desde JS. Por eso existe `closeMobileMenu()` en `utils.js`, llamada desde `setActiveNav()` en `playlists.js`. Si se agrega alguna otra forma de navegar desde el sidebar en el futuro, hay que acordarse de llamarla ahí también (o, mejor, encauzarla a través de `setActiveNav`).

### El panel derecho ("Reproduciendo ahora") solo existe en desktop

En desktop, `.discover_side` (la columna derecha) es visible y ahí vive el panel de "Reproduciendo ahora + más de este artista". En mobile esa columna se oculta por completo (`.discover_side{display:none}` en el media query de `estilosdashboard.css`) y no tiene reemplazo: hasta hace poco el cajón hamburguesa mostraba una versión reducida ("Más de este artista", sin la mini-card de portada) en `#mobile-artist-tracks-list`, pero se sacó por pedido del usuario — quedaba como una leyenda colgada, sin mucho sentido al lado de "Mis playlists". Si en algún momento hace falta mostrar algo parecido en mobile, el reproductor a pantalla completa (ver más abajo) es el lugar natural, no el cajón.

A diferencia de la sección anterior de "Recomendado" (que ahora alimenta "Inicio", ver [03-backend.md](03-backend.md)), `.discover_side` es su propia columna del grid de `header` (`grid-template-columns: 22% 1fr 300px`), separada de `.song_side` — ya no viven envueltas en un `.content_side` común (ese contenedor se sacó: dejaba a `.discover_side` con la misma altura que `.song_side`, cortada justo arriba de `master_play`, en vez de llegar hasta abajo del todo como `.menu_side`). Ocupa las dos filas del grid (`grid-row: 1 / 3`) por eso mismo — para que el panel derecho tenga la misma altura completa que el sidebar izquierdo. "Más de este artista" pide hasta 10 canciones (`MAX_ARTIST_TRACKS` en `server/routes/music.js`) para no dejar espacio vacío en esa altura, y usa `--color-panel-bg-strong` en vez de `--color-panel-bg` (el mismo "vidrio" que el resto de los paneles, pero más oscuro/opaco) para distinguirse de `.song_side` sin dejar de leerse como parte del mismo conjunto.

### `song_side`, `discover_side` y `master_play` son tres cajas de grid separadas que se leen como una sola pieza en forma de L

Visualmente, `.song_side` (columna central), `.discover_side` (columna derecha, a toda altura) y `master_play` (pie de la columna central) se leen como una sola pieza "vidriosa" con forma de L — mismo fondo, mismo borde, sin huecos entre ellas. Técnicamente son tres elementos de grid independientes, cada uno con su propia celda (`.song_side`: `grid-column: 2; grid-row: 1`, `.discover_side`: `grid-column: 3; grid-row: 1 / 3`, `.master_play`: `grid-column: 2; grid-row: 2`) — ninguno anidado dentro de otro.

La razón de mantenerlos separados (en vez de anidar `.master_play` o `.discover_side` dentro de una sola caja central) es `#admin-view`: ocupa el mismo lugar que `.song_side` (y, para no dejar un hueco vacío a la derecha, también el de `.discover_side`: `grid-column: 2 / 4; grid-row: 1`) cuando el usuario entra al panel de admin, y en CSS Grid dos elementos en la misma celda se apilan uno sobre el otro. Si `master_play` viviera anidado adentro de esa caja, quedaría tapado por `#admin-view` cada vez que se muestra esa vista — rompiendo la reproducción persistente que se armó especialmente para que la música no se corte al entrar a Administración (ver [CHANGELOG.md](CHANGELOG.md), "Reproductor persistente al entrar a Administración"). Al ser un elemento separado en su propia fila del grid, `master_play` sigue arriba de todo pase lo que pase en la celda de al lado.

El efecto "misma caja" se logra con CSS, no con la estructura del HTML: `header` usa `row-gap: 0` (sin hueco entre filas) y cada elemento redondea solo las esquinas que son realmente exteriores al conjunto, sacando borde y radio en los lados que tocan a otro panel — `.song_side` no tiene borde derecho (toca a `.discover_side`) ni inferior (toca a `master_play`), `.master_play` no tiene borde superior (toca a `.song_side`) ni derecho (toca a `.discover_side`), y `.discover_side` sí conserva su borde izquierdo completo (hace de línea divisoria entre las dos columnas, continua de arriba a abajo). Así donde se tocan no hay ni hueco ni línea doble, y las esquinas que sí quedan expuestas mantienen el redondeo del resto de los paneles. En mobile esto no aplica: cada panel vuelve a ser una caja completa y separada (con gap real entre ellos, como el resto de los paneles en ese layout), así que el media query repone el borde/redondeo completo en `.song_side`/`#admin-view`.

### El hero ("Top del momento") es un destacado fijo, no un espejo de lo que suena

`#now-playing-hero` (arriba de todo en `.song_side`) muestra la primera canción de "Inicio" — al principio la más popular del catálogo, o la primera recomendación personalizada en cuanto llega (ver [03-backend.md](03-backend.md)). Es clickeable (reproduce esa canción), pero **no seguí actualizándose con lo que se está reproduciendo**: eso es justamente el trabajo del panel derecho de arriba. `setHero()` en `player.js` es la única función que lo toca; `loadMusic()` (que corre en cada cambio de canción) ya no lo hace, a propósito — antes de este cambio ambos paneles mostraban lo mismo (la canción actual), lo cual los volvía redundantes.

