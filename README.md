# ActivityTracker

Rastreador personal de actividades deportivas basado en archivos **GPX**. Sube tus rutas exportadas desde Strava, Garmin, Polar, Suunto o cualquier dispositivo GPS, y obtén métricas, estadísticas y mapas listos para compartir.

## ¿Qué es?

ActivityTracker es una aplicación web (PWA) auto-alojada para llevar un registro de tus salidas al aire libre: carrera, ciclismo, senderismo o caminatas. A diferencia de las plataformas propietarias, tus datos viven en tu propio servidor, en una base de datos SQLite que controlas tú.

## ¿Qué hace?

- **Importa rutas GPX** arrastrando y soltando un archivo (hasta 50 MB por archivo).
- **Calcula métricas** de cada actividad automáticamente: distancia, duración, desnivel acumulado, velocidad media y velocidad máxima.
- **Detecta el tipo de actividad** (running, cycling, walking, hiking) a partir de los metadatos, el nombre de la pista o el nombre del archivo.
- **Dashboard con estadísticas**: distancia total, número de actividades, tiempo total, récord de distancia y comparativa mensual (este mes vs. mes anterior) con tendencias.
- **Estadísticas por categoría** para ver la distribución por tipo de deporte.
- **Mapas interactivos** con Leaflet para visualizar cada ruta.
- **Generador de imágenes de ruta**: exporta un mapa de la actividad en PNG/JPEG con estilo configurable (color de traza, grosor, estilo de mapa, posición de metadatos y marca de inicio/fin) listo para compartir en redes sociales.
- **Autenticación externa** contra un servidor Laravel Passport (OAuth2 _password grant_), con datos de actividad aislados por usuario.
- **Funciona como PWA**: instalable en móvil y escritorio con iconos y soporte offline del shell.

## Stack tecnológico

| Capa               | Tecnología                               |
| ------------------ | ---------------------------------------- |
| Framework          | SvelteKit + Svelte 5                     |
| Lenguaje           | TypeScript                               |
| Estilos            | Tailwind CSS v4                          |
| Base de datos      | SQLite (better-sqlite3) + Drizzle ORM    |
| Mapas              | Leaflet                                  |
| Parsing GPX        | gpxparser                                |
| Autenticación      | Laravel Passport (OAuth2 password grant) |
| PWA                | Vite PWA / Workbox                       |
| Gestor de paquetes | pnpm                                     |

## Requisitos

- Node.js 22+
- pnpm (habilitado vía Corepack, viene configurado en `package.json`)

## Desarrollo local (dev)

1. **Clona el repositorio e instala dependencias:**

   ```sh
   git clone https://github.com/acristhian1411/Gpx_activity_tracker.git activitytracker
   cd activitytracker
   pnpm install
   ```

2. **Configura las variables de entorno:**

   ```sh
   cp .env.example .env
   ```

   Edita `.env` con los datos de tu servidor de autenticación (ver [Variables de entorno](#variables-de-entorno)). Para desarrollo local, `DATABASE_URL=local.db` crea la base SQLite en la raíz del proyecto.

3. **Aplica el esquema de la base de datos:**

   ```sh
   pnpm db:push
   ```

   > Alternativamente: `pnpm db:generate` genera los archivos de migración y `pnpm db:migrate` los aplica.

4. **Arranca el servidor de desarrollo:**

   ```sh
   pnpm dev
   ```

   La app queda disponible en `http://localhost:5173` (o el puerto que indique Vite).

### Scripts útiles

| Comando            | Descripción                                          |
| ------------------ | ---------------------------------------------------- |
| `pnpm dev`         | Servidor de desarrollo con hot-reload                |
| `pnpm build`       | Compila la app para producción                       |
| `pnpm preview`     | Previsualiza la build de producción                  |
| `pnpm check`       | Type-check con `svelte-check`                        |
| `pnpm lint`        | Lint (prettier + eslint)                             |
| `pnpm test`        | Test unitarios + e2e (Playwright)                    |
| `pnpm db:push`     | Sincroniza el esquema de Drizzle con la BD           |
| `pnpm db:generate` | Genera archivos de migración                         |
| `pnpm db:migrate`  | Aplica migraciones pendientes                        |
| `pnpm db:studio`   | Interfaz visual de la base de datos (Drizzle Studio) |

## Despliegue con Docker

La imagen usa [`@sveltejs/adapter-node`](https://svelte.dev/docs/kit/adapter-node) y compila el proyecto en un contenedor multi-etapa. La base de datos SQLite se persiste en un volumen para no perder datos al reconstruir la imagen.

### Despliegue local con Docker

```sh
docker compose up --build
```

La aplicación queda disponible en `http://localhost:3000`. El puerto `3000` solo se expone para la comunicación interna entre servicios; en producción lo publica tu proxy (p. ej. Traefik/Coolify).

Para detener y reconstruir:

```sh
docker compose down
docker compose up --build
```

### Persistencia

Los datos (base SQLite) se guardan en el volumen `app-data`, montado en `/data` dentro del contenedor. `DATABASE_URL=/data/local.db` apunta a esa ruta. El volumen sobrevive a reconstrucciones y redespliegues.

### Despliegue con Coolify (Docker Compose)

1. En Coolify, crea un recurso de tipo **Docker Compose** apuntando al repositorio y la rama deseados.
2. Coolify detecta `docker-compose.yml` y construye la imagen con el `Dockerfile` automáticamente.
3. Asigna un dominio a la aplicación (Coolify configura el proxy Traefik) y activa **Force HTTPS**.
4. Configura las variables de entorno (ver sección siguiente).

## Variables de entorno

| Variable          | Valor por defecto                            | Descripción                                        |
| ----------------- | -------------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`    | `local.db` (dev) / `/data/local.db` (docker) | Ruta del archivo SQLite                            |
| `HOST`            | `0.0.0.0`                                    | Dirección de escucha del servidor Node             |
| `PORT`            | `3000`                                       | Puerto de escucha                                  |
| `BODY_SIZE_LIMIT` | `52428800`                                   | Límite de subida (50 MB)                           |
| `ORIGIN`          | (vacío)                                      | URL pública final, p. ej. `https://tu-dominio.com` |

### Autenticación (Laravel Passport)

| Variable                     | Descripción                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| `AUTH_BASE_URL`              | URL base del servidor de autenticación                                  |
| `AUTH_CLIENT_ID`             | ID del cliente OAuth (obligatorio)                                      |
| `AUTH_CLIENT_SECRET`         | Secreto del cliente OAuth (obligatorio)                                 |
| `AUTH_SCOPE`                 | Alcance OAuth solicitado (opcional)                                     |
| `AUTH_TOKEN_URL`             | URL del endpoint de token (si difiere de `{AUTH_BASE_URL}/oauth/token`) |
| `AUTH_USERINFO_URL`          | URL del endpoint de usuario (si difiere de `{AUTH_BASE_URL}/api/user`)  |
| `AUTH_USERINFO_CACHE_TTL_MS` | TTL de la caché de datos de usuario (por defecto `30000`)               |

Sin `AUTH_CLIENT_ID` y `AUTH_CLIENT_SECRET` configurados, el login devuelve un error de configuración. En Docker Compose, `AUTH_BASE_URL` ya trae un valor por defecto; el resto se define vía variables de entorno del host o en el panel de Coolify.

> **Nota de seguridad**: no commitees secretos reales. El archivo `.env` está en `.gitignore`; usa `.env.example` como plantilla.
