# AutoPrintFlow

AutoPrintFlow is a web platform for ordering printed stickers: private uploads, a constrained 42 × 42 mm artwork editor, moderation, A4 production layouts, layered PSD export, and individual vector cutting outlines for an 80 × 80 mm machine.

Version **0.3.0** refreshes the interface with restrained glass surfaces, compact mobile navigation and a new production workspace. Existing environment variables and Docker volumes remain compatible; startup applies the additive placement migration automatically.

- [Обновление существующего сервера — две команды](docs/UPGRADE.md)
- [Раскладка по аккаунтам, ручные стрипы и отправления](docs/QUEUE-PLACEMENT.md)
- [Геометрия редактора, PSD и LightBurn](docs/PRINTING.md)
- [Отчёт о ревью и исправлениях](docs/REVIEW.md)
- [Локальные проверки и ограничения](docs/TESTING.md)

```bash
git pull --ff-only
bash scripts/update.sh
```

Run these on the existing server after the release commit is published to its Git branch. The update script builds the image, backs up database/files/environment, restarts the app and checks its health. It does not overwrite `.env`, change ports, recreate volumes or reset the administrator password.

## Stack

- Node.js 22, Next.js 15.5 with App Router
- React 19.2 / React Konva 19.2
- TypeScript
- Tailwind CSS
- shadcn/ui-style local component set
- PostgreSQL
- Prisma ORM
- Custom session auth with PostgreSQL-backed sessions
- Sharp for image generation
- React Konva for the sticker editor
- Zod validation
- Docker Compose for local deployment

## Core features

- Public landing page with queue statistics and CTA routing to `/editor/new` or `/login`
- Registration, login, and logout with hashed passwords and secure session cookies
- Session storage in PostgreSQL with hashed session tokens
- Private user uploads with protected file access
- Sticker editor with constrained move/zoom/stretch/rotate, flip, non-destructive source crop, fit/reset and undo/redo
- Hard 42 mm template boundary, a visible cutting path and a recommended 2 mm safety margin
- Square, rounded-square or alpha-traced cutting outlines; 42 mm cutting size by default, optional 40 mm
- Real sticker PNG export at 496x496 px (42x42 mm at 300 DPI)
- Final print preview plus a compact view of the planned stripe slots
- Moderation states: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `PRINTED`
- User dashboard showing only the current user's stickers
- Admin dashboard with moderation views and queue grouping into stripes and A4 sheets
- Protected downloads for PNG, layered A4 PSD and production ZIPs containing one SVG cut job per sticker
- Admin filtering, search, pagination, versioned draft saves and sheet identity checks
- Dockerized app + Postgres startup

## Layout and print logic

- Sticker: `496 x 496 px`
- Stripe: `1120 x 2409 px`
- A4 landscape: `3508 x 2480 px`
- 1 stripe = 8 stickers
- 1 A4 sheet = 3 stripes
- Queue counts:
  - Automatic stripes are separated per account by default (8 slots each); manual shipping stripes retain their positions.
  - `sheets = ceil(actual_stripes / 3)`, including partially filled stripes.

The stripe and A4 generators now mirror the uploaded PSD reference: sky/grass stripe background, rounded white sticker cards, the black “Printed by IB-WorkShop. 2026” footer band, and clean landscape A4 placement.

## Project structure

```text
src/
  app/                     Next.js pages and route handlers
  components/              UI, editor, dashboard, and admin components
  lib/
    auth/                  Password hashing and session auth
    image/                 Sticker, stripe, and A4 renderers
    queue*.ts              Queue grouping and queue stats
prisma/
  schema.prisma            Prisma schema
  migrations/             SQL migration
  seed.ts                  Admin seed script
storage/                   Local mounted file storage
```

## Environment variables

Copy `.env.example` to `.env` and adjust as needed.

Required variables:

- `DATABASE_URL`
- `SESSION_COOKIE_NAME`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `NODE_ENV`

Optional security/runtime variables:

- `APP_ORIGIN` - canonical external origin for strict origin checks, e.g. `https://print.ilyabot.space`
- `POSTGRES_PASSWORD` - password for the internal PostgreSQL container; keep it in sync with `DATABASE_URL`
- `TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret key

For `docker compose`, the container forces `NODE_ENV=production`. Keep `NODE_ENV=development` only for local `npm run dev`.

New installations seed these default credentials (change them in `.env` before first production startup). Existing accounts are never overwritten by the seed:

- Email: `admin@autoprintflow.local`
- Password: `admin12345`

## Local development setup

1. Install dependencies:

```bash
npm ci
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Run the initial migration:

```bash
npm run prisma:deploy
```

4. Seed the admin user:

```bash
npm run prisma:seed
```

5. Start the app locally:

```bash
npm run dev
```

## Prisma commands

Create a new local development migration:

```bash
npm run prisma:migrate
```

Apply committed migrations:

```bash
npm run prisma:deploy
```

Seed the database:

```bash
npm run prisma:seed
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

## Docker Compose usage

The repository includes `app` and `postgres` services and uses named volumes for database persistence and file storage.

Start the full stack:

```bash
docker compose up --build
```

Containers use `restart: unless-stopped`, so after the Docker daemon comes back on host boot, the stack starts automatically unless you stopped it explicitly.

What happens on container startup:

- the app image is built
- Next.js production build is generated
- the app waits for PostgreSQL
- Prisma migrations are applied
- the admin seed runs
- the web server starts in the container on port `3000`
- Docker publishes the app on `${APP_HOST_PORT}` which defaults to `3000`

Named volumes:

- `postgres-data`
- `app-storage`

## Parallel local/server deployment

This stack is designed to run alongside other Docker projects.

- PostgreSQL is only exposed inside the Docker network and is not published on the host by default.
- The web app is published on `APP_HOST_PORT`, which defaults to `3000`.
- Set `COMPOSE_PROJECT_NAME` to keep container, network, and volume names isolated and predictable on a server.

Example `.env` values for a server reachable on the LAN:

```env
COMPOSE_PROJECT_NAME=autoprintflow
APP_BIND_IP=0.0.0.0
APP_HOST_PORT=3000
APP_ORIGIN=https://print.ilyabot.space
POSTGRES_PASSWORD=replace-this-postgres-password
DATABASE_URL=postgresql://postgres:replace-this-postgres-password@postgres:5432/autoprintflow?schema=public
TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key
```

Cookie behavior:

- if you access the app directly over LAN `http://SERVER_IP:3000`, keep `APP_ORIGIN` empty or set it to the same `http://...` origin
- after you put the app behind HTTPS reverse proxy, set `APP_ORIGIN=https://your-domain` so session cookies are issued as `Secure`

Then start it in the background:

```bash
docker compose up -d --build
```

LAN access:

```text
http://SERVER_LAN_IP:3000
```

If you later put Nginx in front of the app, proxy to the local app port:

```nginx
server {
    listen 80;
    server_name example.com;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

If you want the app reachable only through Nginx, set `APP_BIND_IP=127.0.0.1` and restart the stack.

## Proxmox one-shot userscript

If you want Proxmox to create an Alpine LXC with Docker and deploy this project automatically, run this on the Proxmox host:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/IlyaBOT/AutoPrintFlow/main/userscript.sh)"
```

Default behavior:

- creates an unprivileged Alpine 3.23 LXC with Docker
- enables nesting and keyctl
- auto-answers the Alpine-Docker installer prompts as `Portainer = N`, `Portainer Agent = N`, `Docker Compose = Y`, `Docker TCP socket = N`
- installs Docker Compose inside the LXC
- clones `https://github.com/IlyaBOT/AutoPrintFlow.git`
- writes `.env` with `APP_BIND_IP=0.0.0.0` and `APP_HOST_PORT=3000`
- starts the stack with `docker compose up -d --build`

Useful overrides:

```bash
CTID=321 \
CT_HOSTNAME=print-stickers \
CT_TEMPLATE_STORAGE=local \
CT_CONTAINER_STORAGE=patriot500 \
CT_CORES=2 \
CT_RAM_MB=2048 \
CT_DISK_GB=8 \
GIT_REF=main \
ADMIN_EMAIL=admin@print.local \
ADMIN_PASSWORD='replace-me' \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/IlyaBOT/AutoPrintFlow/main/userscript.sh)"
```

If your Proxmox host has multiple storages, set `CT_TEMPLATE_STORAGE` and `CT_CONTAINER_STORAGE` to avoid storage prompts completely.

If you ever want to override the automatic installer answers, set `COMMUNITY_INSTALL_RESPONSES` explicitly.

After the script completes, the app should be reachable from the LAN at:

```text
http://CONTAINER_LAN_IP:3000
```

If the CT uses the Proxmox firewall, allow inbound `3000/tcp`.

## Authentication architecture

- Passwords are hashed with `bcryptjs`
- A random raw session token is generated on login/register
- Only a hashed token is stored in the `Session` table
- The raw token is stored in an `HttpOnly` cookie
- Every protected request validates the cookie against PostgreSQL
- Logout deletes the DB session and clears the cookie

## File storage architecture

Files are stored locally under the mounted `storage/` directory:

- `storage/originals/`
- `storage/final-stickers/`
- `storage/previews/`
- `storage/generated-stripes/`
- `storage/generated-sheets/`

Files are not exposed directly by the web server. All access goes through protected route handlers with authorization checks.

## Image generation architecture

- Original uploads are stored as-is
- Editor transforms are stored as JSON in PostgreSQL
- Final sticker PNGs are rendered with Sharp from the original image and saved to disk
- Preview PNGs are generated for dashboard thumbnails
- Stripe PNGs are composed from approved sticker PNGs
- A4 sheet PNGs are composed from stripe PNGs
- Queue layouts are deterministic and derived from approval order

## Admin workflow

- Review `SUBMITTED` stickers
- Approve or reject with a reason
- Approved stickers automatically enter the printable queue
- View queue grouped into A4 sheets and stripes
- Download sticker, stripe, and A4 layouts
- Mark approved stickers as `PRINTED`

## Notes

- Optional PDF export is not included; PNG export is implemented fully.
- The storage directory is intended for MVP/local deployment and is mounted as a Docker volume.
- The app uses server-side authorization checks across pages and route handlers rather than exposing storage or client-side-only access control.
