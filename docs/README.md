# Documentación de Noiz

Esta carpeta explica **qué es Noiz, cómo está construido y por qué está construido así**. Está pensada para alguien que recién arranca: no asume que sabés qué es un middleware, una sesión, o un service worker — cada concepto se explica la primera vez que aparece.

No es documentación de una librería ni de una API pública: es la bitácora técnica del proyecto, para que en seis meses (vos, o cualquiera que se sume) pueda entender por qué el código es como es sin tener que releer todo el historial de git.

## Cómo está organizada

| Archivo | Qué vas a encontrar |
|---|---|
| [01-historia.md](01-historia.md) | De dónde viene Noiz: arrancó como un tutorial estático y se convirtió en una app con cuentas de usuario, base de datos y deploy. Leelo primero — le da contexto a todo lo demás. |
| [02-frontend.md](02-frontend.md) | Las páginas HTML, el CSS y el JavaScript del navegador: qué hace cada archivo, cómo se comunican entre sí. |
| [03-backend.md](03-backend.md) | El servidor Node/Express: rutas, middlewares, servicios externos (YouTube, SendGrid) y la base de datos. |
| [04-seguridad.md](04-seguridad.md) | Autenticación, sesiones, y las protecciones que tiene la app (y las que todavía le faltan). |
| [05-pwa-y-deploy.md](05-pwa-y-deploy.md) | Qué es una PWA y cómo se aplica acá, más cómo/dónde se despliega la app (Render). |
| [CHANGELOG.md](CHANGELOG.md) | Registro cronológico de cambios, en lenguaje simple. Se actualiza en cada commit. |

## Lo esencial en 60 segundos

Noiz es un reproductor de música tipo Spotify. Un usuario se registra, arma playlists, y escucha canciones que en realidad vienen de YouTube (Noiz usa la YouTube Data API como catálogo — no aloja archivos de audio propios, salvo un puñado de MP3 de prueba que quedaron del prototipo original).

Es una aplicación **full-stack**:
- **Frontend**: HTML + CSS + JavaScript "vanilla" (sin frameworks como React o Vue). Corre en el navegador del usuario.
- **Backend**: Node.js + Express. Corre en un servidor (Render) y expone una API (`/api/...`) que el frontend consume con `fetch`.
- **Base de datos**: SQLite en desarrollo local, Turso (SQLite alojado en la nube) en producción.

Es un proyecto de aprendizaje/portfolio — no está pensado (por ahora) para generar ingresos, en parte porque usar el catálogo de YouTube así choca con sus Términos de Servicio si se monetiza directamente. Eso está bien: el objetivo es que esté bien hecho y sea un buen ejemplo de código para mostrar.