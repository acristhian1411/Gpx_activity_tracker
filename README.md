# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Despliegue con Coolify (Docker Compose)

El proyecto usa [`@sveltejs/adapter-node`](https://svelte.dev/docs/kit/adapter-node) y se despliega con Docker Compose.

### 1. Crear el recurso en Coolify

1. En Coolify, crea un nuevo recurso con tipo **Docker Compose**.
2. Apunta al repositorio y la rama deseados.
3. Coolify detectará automáticamente `docker-compose.yml` y construirá la imagen con el `Dockerfile`.

### 2. Configurar el dominio y HTTPS

1. Asigna un dominio a la aplicación (Coolify configura el proxy Traefik automáticamente).
2. Activa **Force HTTPS** para que todo el tráfico vaya por TLS.

### 3. Variables de entorno

| Variable          | Valor por defecto   | Descripción                                    |
| ----------------- | ------------------- | ---------------------------------------------- |
| `HOST`            | `0.0.0.0`           | Dirección de escucha del servidor Node         |
| `PORT`            | `3000`              | Puerto de escucha (lo gestiona Coolify)        |
| `DATABASE_URL`    | `/data/local.db`    | Ruta del archivo SQLite (persistente)          |
| `BODY_SIZE_LIMIT` | `52428800`          | Límite de subida (50MB, igual que `MAX_FILE_SIZE`) |
| `ORIGIN`          | (vacío)             | URL pública final, p. ej. `https://tu-dominio.com` |

Cuando tengas tu dominio, define `ORIGIN` con la URL pública para que las URLs generadas por SSR sean correctas. Si lo dejas vacío, `adapter-node` lo deduce de las cabeceras del proxy.

### 4. Persistencia

La base de datos SQLite se guarda en el volumen `app-data` (montado en `/data`). No se pierde al reconstruir o redesplegar el contenedor.

### Despliegue local con Docker

```sh
docker compose up --build
```

La aplicación queda disponible en `http://localhost:3000`.
