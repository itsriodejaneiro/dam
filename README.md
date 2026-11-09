# Digital Assets Map

The Digital Assets Map (DAM) is an interactive map of a country's digital infrastructure: identity, credentials, information systems and public services, organised in hierarchical layers, with guided journeys through them. It is the new, international version of the *Mapa da Informação* (ITS Rio, 2018), and any country can deploy it.

Each deployment runs its own app and its own PocketBase. A country is configuration and content, kept in that PocketBase and edited in the app.

## Stack

- **SvelteKit** (Svelte 5 runes, TypeScript)
- **PocketBase** for the database, authentication and API
- **D3** for the force simulation and the SVG graph
- **TipTap** for the rich-text fields
- **Bun** as runtime and package manager
- **Plain CSS** with design tokens and scoped styles

## Install

You need [Bun](https://bun.sh) and Docker: Docker Desktop or Docker Engine, or on macOS [Colima](https://github.com/abiosoft/colima) (`brew install colima docker docker-compose`).

```bash
bun install
bun run dev
```

`bun run dev` creates `.env` from `.env.example`, starts Colima when Docker is down, brings PocketBase up in Docker and serves the app. One Ctrl-C stops everything.

Open <http://localhost:5173>. A new project sends you to `/setup`, a wizard that asks for the deployment's name, languages, theme and brand, then creates the schema and seeds an example map and journey. The PocketBase admin is at <http://127.0.0.1:8090/_/>, with the credentials in `.env`.

## Configure

Everything that identifies a deployment lives in the `settings` record: its name in each language, the languages and the default one, the theme, the logo or flag, and the feature flags. `/setup` writes it the first time and `/admin/settings` edits it afterwards. Maps, entities, connections, categories and journeys are edited under `/admin`.

`.env` holds infrastructure only (defaults in `.env.example`):

| Variable | What it is |
|---|---|
| `COMPOSE_PROJECT_NAME` | the Docker Compose project of this checkout |
| `PB_PORT` | PocketBase's port on the host |
| `PUBLIC_POCKETBASE_URL` | the PocketBase URL |
| `PB_ADMIN_URL`, `APP_URL` | the URLs of the PocketBase admin and of the app |
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

Open a pull request against `main`. Code, comments and commit messages are in English, and commits follow [Conventional Commits](https://www.conventionalcommits.org) (`feat: add a filter to the map`). Run `bun run check` and `bun run build` before you push; CI runs both on every pull request.

Text on screen goes through `m('key')` in `src/lib/i18n/messages.ts`, in every locale. The PocketBase schema is defined once, in `src/lib/server/setup.ts`.
