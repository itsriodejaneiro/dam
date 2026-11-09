# Install

The Digital Assets Map runs on [Bun](https://bun.sh) and [PocketBase](https://pocketbase.io). Install it by hand to develop or to keep control of each piece, or with Docker to bring everything up on a server. Both end at the same place: the [setup wizard](#the-setup-wizard).

## By hand

You need Bun and Docker: Docker Desktop or Docker Engine, or on macOS [Colima](https://github.com/abiosoft/colima) (`brew install colima docker docker-compose`).

```bash
git clone https://github.com/itsriodejaneiro/dam.git
cd dam
bun install
bun run dev
```

`bun run dev` creates `.env` from `.env.example`, starts Colima when Docker is down, brings PocketBase up in Docker and serves the app. One Ctrl-C stops everything.

Open <http://localhost:5173>. The PocketBase admin is at <http://127.0.0.1:8090/_/>.

## With Docker

You need Docker. A deployment has two public addresses, the app and PocketBase, because the browser talks to PocketBase directly. Write them in a `.env` next to `compose.yaml`:

```bash
ORIGIN=http://localhost:3000
PUBLIC_POCKETBASE_URL=http://localhost:8090
PB_SUPERUSER_EMAIL=admin@example.com
PB_SUPERUSER_PASSWORD=choose-a-long-password
```

Then build and start both services, naming the two files:

```bash
docker compose -f compose.yaml -f compose.local.yaml up --build
```

Open <http://localhost:3000>. The PocketBase admin is at <http://localhost:8090/_/>.

Name the files with `-f`: a bare `docker compose up` also merges `compose.override.yaml`, the development setup, which leaves the app out.

## The `.env` file

`.env` holds infrastructure only: addresses, ports and the superuser, the account that installs and can do everything. The first boot of a new database creates the superuser from `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD`. The defaults in `.env.example` are for development: set your own on a server.

Everything else that identifies a deployment lives in the app: see [Configure your deployment](./configure.md).

## The setup wizard

A new project sends every page to `/setup`. Sign in with the superuser's email and password, and the wizard asks for the deployment's languages, name, theme, flag, logo and whether to show the journeys. All of it can change later in [Settings](./configure.md).

![The setup wizard, with the deployment's languages, name, theme and logo](/screens/install-1.png)

**Set up project** creates the collections, eight base categories, the main map and the example, and shows each step in a terminal. At the end, the app opens the map.

![The terminal of the setup wizard, listing what it created](/screens/install-2.png)

## Start over

A superuser finds `/setup` in the **⋮** menu of the header. On a project already set up it shows the **Danger zone**: type `RESET` and press **Reset project** to delete all the collections and data and return to the wizard. This cannot be undone.

![The danger zone of the setup page](/screens/install-3.png)

The same from the command line:

| Command | What it does |
|---|---|
| `bun run db:setup` | creates or updates the collections, and seeds an empty project |
| `bun run db:reset --yes` | deletes the collections and their data |
