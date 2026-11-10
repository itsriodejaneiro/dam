# Install

The Digital Assets Map runs on [Bun](https://bun.sh) and [PocketBase](https://pocketbase.io). Install it by hand to develop or to keep control of each piece, with Docker to build everything from a clone, or from the published images to run it with no clone at all. All three end at the same place: the [setup wizard](#the-setup-wizard).

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

`compose.yaml` publishes no port. On one machine, add `compose.local.yaml`, which publishes the app and PocketBase on loopback:

```bash
docker compose -f compose.yaml -f compose.local.yaml up --build
```

Keep `--build` on every manual `up`: it builds both images from your checkout, and `up` alone runs whatever image already has their tag, or pulls the [published one](#from-the-published-images). `bun run dev` builds PocketBase under a tag of its own and needs no flag.

On a machine where Homebrew left the Compose plugin outside Docker's path, `docker compose` answers `unknown command`: run `docker-compose`, the standalone binary, with the same arguments. `bun run dev` accepts both.

Open <http://localhost:3000>. The PocketBase admin is at <http://localhost:8090/_/>.

Name the files with `-f`: a bare `docker compose up` also merges `compose.override.yaml`, the development setup, which leaves the app to Vite.

## From the published images

Every release publishes the app and PocketBase as two images, for amd64 and arm64, and `compose.deploy.yaml` runs them: a machine needs that file and the same `.env` as [With Docker](#with-docker), with no clone and no build. This works from the first published release.

```bash
curl -O https://raw.githubusercontent.com/itsriodejaneiro/dam/main/compose.deploy.yaml
docker compose -f compose.deploy.yaml up -d
```

`DAM_VERSION` in `.env` pins a release, such as `DAM_VERSION=1.2.0`, or its minor, `1.2`, for the newest patch of it; without it, the images are the `latest` ones. To update, change `DAM_VERSION` and run `up -d` again; on `latest` or a minor, run `docker compose -f compose.deploy.yaml pull` first.

The file publishes no port, like `compose.yaml`: on one machine, fetch `compose.local.yaml` too and add `-f compose.local.yaml`; on a server, a reverse proxy reaches the two services.

## On a server

The [README](https://github.com/itsriodejaneiro/dam#install) has the steps for a server: the reverse proxy, Dokploy, and the backup of the database.

The app sends a `Content-Security-Policy`, with a new nonce on every page, and the other security headers itself. A reverse proxy or CDN in front passes them on as they are, adds no policy of its own and injects no script into the pages. The policy lets the browser reach PocketBase at the origin of `PUBLIC_POCKETBASE_URL`, and needs nothing else from you.

## The `.env` file

`.env` holds infrastructure only: addresses, ports and the superuser, the account that installs and can do everything. The first boot of a new database creates the superuser from `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD`, at least 8 characters long, and the app's server side signs in with them, so they stay set. The defaults in `.env.example` are for development: set your own on a server.

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
