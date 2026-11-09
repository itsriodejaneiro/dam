# Digital Assets Map

The Digital Assets Map (DAM) is an interactive map of a country's digital infrastructure: identity, credentials, information systems and public services, organised in hierarchical layers, with guided journeys through them. It is the new, international version of the *Mapa da Informação* (ITS Rio, 2018), and any country can deploy it.

Each deployment runs its own app and its own PocketBase. A country is configuration and content, kept in that PocketBase and edited in the app.

**The manual:** <https://itsriodejaneiro.github.io/dam/>

## Stack

- **SvelteKit** (Svelte 5 runes, TypeScript)
- **PocketBase** for the database, authentication and API
- **D3** for the force simulation and the SVG graph
- **TipTap** for the rich-text fields
- **Bun** as runtime and package manager
- **Plain CSS** with design tokens and scoped styles

## Install

There are three ways to run it: by hand for development, with Docker on any machine, or with Dokploy. All three end at `/setup`, a wizard that asks for the deployment's name, languages, theme and brand, then creates the schema and seeds an example map and journey.

A deployment has two public addresses, one for the app and one for PocketBase. The browser talks to PocketBase directly, for login and for everything under `/admin`, so PocketBase needs an address the browser can reach. The app's server side uses the internal network.

### By hand

You need [Bun](https://bun.sh) and Docker: Docker Desktop or Docker Engine, or on macOS [Colima](https://github.com/abiosoft/colima) (`brew install colima docker docker-compose`).

```bash
bun install
bun run dev
```

`bun run dev` creates `.env` from `.env.example`, starts Colima when Docker is down, brings PocketBase up in Docker and serves the app with Vite. One Ctrl-C stops the app and its container; Colima keeps running.

Open <http://localhost:5173>. A new project sends you to `/setup`: sign in with the superuser in `.env`. The PocketBase admin is at <http://127.0.0.1:8090/_/>, with the same credentials.

### With Docker

`compose.yaml` builds the app and PocketBase from this repository and runs them side by side. Create a `.env` next to it:

```dotenv
ORIGIN=http://localhost:3000
PUBLIC_POCKETBASE_URL=http://localhost:8090
PB_SUPERUSER_EMAIL=admin@example.com
PB_SUPERUSER_PASSWORD=a-long-password
```

`compose.yaml` publishes no port. On one machine, add `compose.local.yaml`, which publishes the app and PocketBase on loopback:

```bash
docker compose -f compose.yaml -f compose.local.yaml up --build
```

Open <http://localhost:3000>, which sends you to `/setup`, and sign in with the superuser in `.env`. Ctrl-C stops both services. `APP_PORT` and `PB_PORT` in `.env` change the two ports; keep `ORIGIN` and `PUBLIC_POCKETBASE_URL` in step with them.

Name the files with `-f`: a bare `docker compose up` also merges `compose.override.yaml`, the development setup, which leaves the app to Vite.

On a server, put a reverse proxy with TLS in front of `app` (port 3000) and `dam-pocketbase` (port 8090), and set `ORIGIN` and `PUBLIC_POCKETBASE_URL` to the two public URLs.

Each deployment on a server needs its own Compose project, which also names its internal PocketBase address: `COMPOSE_PROJECT_NAME=dam-acme` in `.env` gives `dam-acme-pocketbase`.

**Data and backups.** The database and the uploaded files live in the named volume `pb_data`. Rebuilding and `down` keep it; `down -v` deletes it. PocketBase has its own scheduled backups in its admin, under Settings, Backups. For a copy of the whole volume:

```bash
docker compose -f compose.yaml stop dam-pocketbase
docker compose -f compose.yaml cp dam-pocketbase:/pb/pb_data ./pb_data-backup
docker compose -f compose.yaml start dam-pocketbase
```

To restore it, stop both services, so nothing touches the database during the copy:

```bash
docker compose -f compose.yaml stop
docker compose -f compose.yaml cp ./pb_data-backup/. dam-pocketbase:/pb/pb_data
docker compose -f compose.yaml start
```

An app left running through a restore signs in again by itself, as long as `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD` work on the restored database.

### With Dokploy

Point two DNS names at the server, one for the app and one for PocketBase. Then, in [Dokploy](https://dokploy.com):

1. Create a project and add a **Compose** service.
2. In **General**, choose this repository and its branch, with `./compose.yaml` as the **Compose Path**.
3. In **Environment**, set the variables, with your two names:

   ```dotenv
   ORIGIN=https://map.example.org
   PUBLIC_POCKETBASE_URL=https://pb.map.example.org
   PB_SUPERUSER_EMAIL=admin@example.com
   PB_SUPERUSER_PASSWORD=a-long-password
   ```

4. In **Domains**, add both, with HTTPS on:

   | Service | Host | Port |
   |---|---|---|
   | `app` | `map.example.org` | 3000 |
   | `dam-pocketbase` | `pb.map.example.org` | 8090 |

5. **Deploy**. The first boot creates the superuser.
6. Open `https://map.example.org/setup`, sign in with that superuser and fill in the wizard.

Several deployments share one Dokploy with nothing else to set: Dokploy gives each Compose service its own project, and each deployment's internal PocketBase address comes from it.

`/setup` and `bun run db:setup` turn on PocketBase's rate limit for logins, 20 attempts a minute per address, and read the visitor's address from the `X-Forwarded-For` the reverse proxy writes. That expects one proxy in front of PocketBase and no port of its own, which is what `compose.yaml` sets up.

The app's server side signs in with `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD`, so they stay set after the first boot. A password changed in the PocketBase admin changes in the environment too, followed by a restart of the app.

## Configure

Everything that identifies a deployment lives in the `settings` record: its name in each language, the languages and the default one, the theme, the logo or flag, and the feature flags. `/setup` writes it the first time and `/admin/settings` edits it afterwards. Maps, entities, connections, categories and journeys are edited under `/admin`.

`.env` holds infrastructure only (defaults in `.env.example`):

| Variable | What it is |
|---|---|
| `COMPOSE_PROJECT_NAME` | the Docker Compose project: its containers, its volume and PocketBase's internal address |
| `ORIGIN` | the public URL of the app; `compose.yaml` refuses to start without it, since every form POST answers 403 otherwise |
| `PUBLIC_POCKETBASE_URL` | the PocketBase URL the browser uses |
| `PB_URL` | the PocketBase URL the server uses; `compose.yaml` sets it to the internal address, and without it the server uses `PUBLIC_POCKETBASE_URL` |
| `PB_PORT`, `APP_PORT` | the ports `compose.local.yaml` publishes; in development, `PB_PORT` is PocketBase's port on the host |
| `PB_ADMIN_URL`, `APP_URL` | the URLs `bun run dev` prints |
| `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD` | the superuser, created on the first boot of a new database and used by the scripts and the server side |

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | the whole development environment: Docker, PocketBase and the app |
| `bun run build` | production build |
| `bun run check` | type-check |
| `bun run db:setup` | creates or updates the collections, and seeds an empty project |
| `bun run db:reset --yes` | deletes the collections (destructive) |
| `bun run db:seed-maps` | adds every node to the main map |

## Contributing

Set up as in [By hand](#by-hand) and open a pull request against `main`. Code, comments and commit messages are in English, and commits follow [Conventional Commits](https://www.conventionalcommits.org) (`feat: add a filter to the map`). Run `bun run check` and `bun run build` before you push; CI runs both on every pull request.

Text on screen goes through `m('key')` in `src/lib/i18n/messages.ts`, in every locale. The PocketBase schema is defined once, in `src/lib/server/setup.ts`.
