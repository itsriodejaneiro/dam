# Digital Assets Map

The Digital Assets Map (DAM) is an interactive map of a country's digital infrastructure: identity, credentials, information systems and public services, organised in hierarchical layers, with guided journeys through them. It is the new, international version of the [*Mapa da Informação*](https://github.com/itsriodejaneiro/mapa-da-informacao/tree/v1) (ITS Rio, 2018), and any country can deploy it.

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

There are four ways to run it: by hand for development, with Docker from a clone, from the published images with no clone, or with Dokploy. All four end at `/setup`, a wizard that asks for the deployment's name, languages, theme and brand, then creates the schema and seeds an example map and journey.

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

Keep `--build` on every manual `up`: it builds both images from your checkout, and `up` alone runs whatever image already has their tag, or pulls the [published one](#from-the-published-images). `bun run dev` builds PocketBase under a tag of its own and needs no flag.

On a machine where Homebrew left the Compose plugin outside Docker's path, `docker compose` answers `unknown command`: run `docker-compose`, the standalone binary, with the same arguments. `bun run dev` accepts both.

Open <http://localhost:3000>, which sends you to `/setup`, and sign in with the superuser in `.env`. Ctrl-C stops both services. `APP_PORT` and `PB_PORT` in `.env` change the two ports; keep `ORIGIN` and `PUBLIC_POCKETBASE_URL` in step with them.

Name the files with `-f`: a bare `docker compose up` also merges `compose.override.yaml`, the development setup, which leaves the app to Vite.

On a server, put a reverse proxy with TLS in front of `app` (port 3000) and `dam-pocketbase` (port 8090), and set `ORIGIN` and `PUBLIC_POCKETBASE_URL` to the two public URLs.

The app sends its own security headers: a `Content-Security-Policy` with a new nonce on every page, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`. Let the proxy, and a CDN in front of it, pass them on as they are. A second policy added on the way also applies, and the page's nonce does not satisfy it; a feature that injects scripts into the page, such as Cloudflare's Rocket Loader or e-mail obfuscation, is blocked. The policy lets the browser reach PocketBase at the origin of `PUBLIC_POCKETBASE_URL`, so that variable is the PocketBase address the browser really uses.

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

### From the published images

Every release publishes two images to the GitHub Container Registry, for amd64 and arm64: `ghcr.io/itsriodejaneiro/dam`, the app, and `ghcr.io/itsriodejaneiro/dam-pocketbase`. `compose.deploy.yaml` runs them, so a server needs that file and a `.env`, with no clone and no build. This path works from the first published release.

```bash
curl -O https://raw.githubusercontent.com/itsriodejaneiro/dam/main/compose.deploy.yaml
docker compose -f compose.deploy.yaml up -d
```

The `.env` holds the same four variables as [With Docker](#with-docker), plus `DAM_VERSION` to pin a release, the same for both images:

```dotenv
DAM_VERSION=1.2.0
```

Each image carries three tags: the version (`1.2.0`), its minor (`1.2`, the newest patch of it) and `latest`, the default. The PocketBase image also carries the PocketBase version it runs (`pocketbase-0.39.7`). To update, change `DAM_VERSION` and run `up -d` again; on `latest` or a minor, `docker compose -f compose.deploy.yaml pull` comes first.

Like `compose.yaml`, the file publishes no port: on a server, the reverse proxy reaches both services, as in [With Docker](#with-docker). To try it on one machine, fetch `compose.local.yaml` too and add `-f compose.local.yaml`. A panel such as Dokploy, Coolify or Portainer takes the file as it is, pasted as a Compose stack, with the variables in its environment, `DAM_VERSION` among them, and a domain on each service.

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

`/setup` and `bun run db:setup` turn on PocketBase's rate limits, 20 login attempts a minute per address and 5 requests for a password reset or a verification e-mail, and read the visitor's address from the `X-Forwarded-For` the reverse proxy writes. That expects one proxy in front of PocketBase and no port of its own, which is what `compose.yaml` sets up.

The app's server side signs in with `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD`, so they stay set after the first boot. A password changed in the PocketBase admin changes in the environment too, followed by a restart of the app; until then the public site keeps serving, `/setup` shows an error and the app's log says why.

## Configure

Everything that identifies a deployment lives in the `settings` record: its name in each language, the languages and the default one, the theme, the logo or flag, and the feature flags. `/setup` writes it the first time and `/admin/settings` edits it afterwards. Maps, entities, connections, categories and journeys are edited under `/admin`.

`.env` holds infrastructure only (defaults in `.env.example`):

| Variable | What it is |
|---|---|
| `COMPOSE_PROJECT_NAME` | the Docker Compose project: its containers, its volume and PocketBase's internal address |
| `DAM_VERSION` | the release of the [published images](#from-the-published-images) a deploy runs (`1.2.0`, or `1.2` for its newest patch); `latest` without it |
| `ORIGIN` | the public URL of the app; `compose.yaml` refuses to start without it, since every form POST answers 403 otherwise |
| `PUBLIC_POCKETBASE_URL` | the PocketBase URL the browser uses |
| `PB_URL` | the PocketBase URL the server uses; `compose.yaml` sets it to the internal address, and without it the server uses `PUBLIC_POCKETBASE_URL` |
| `PB_PORT`, `APP_PORT` | the ports `compose.local.yaml` publishes; in development, `PB_PORT` is PocketBase's port on the host |
| `PB_ADMIN_URL`, `APP_URL` | the URLs `bun run dev` prints |
| `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD` | the superuser, created on the first boot of a new database and used by the scripts and the server side; the password needs at least 8 characters |

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

## License

Copyright (C) 2026 Instituto de Tecnologia e Sociedade do Rio de Janeiro (ITS Rio)

The DAM is free software under the [GNU Affero General Public License v3.0](LICENSE). Anyone may install, adapt and run it, commercially too; whoever offers a modified version to the public, including as a website, publishes the modifications under the same license. [AUTHORS](AUTHORS) lists the people who write it.
