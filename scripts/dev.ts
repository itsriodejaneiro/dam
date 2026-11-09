// The whole stack in one command: Docker (Colima, when the engine is down), the PocketBase
// container, then Vite. An empty database waits for the /setup wizard. Ctrl-C stops Vite and
// this checkout's container.
//
// Everything that separates one checkout from another (Compose project, ports) comes from
// its .env, which is what lets several `bun run dev` run side by side.
import { appendFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import PocketBase from 'pocketbase';
import { isConfigured } from '../src/lib/server/setup';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function die(message: string): never {
	console.error(`✗ ${message}`);
	process.exit(1);
}

const quiet = { stdout: 'ignore', stderr: 'ignore' } as const;
const loud = { stdout: 'inherit', stderr: 'inherit' } as const;

// --- .env -------------------------------------------------------------------
const ENV = join(ROOT, '.env');
if (!existsSync(ENV)) {
	// .env.example names the main checkout's Compose project: a linked git worktree running
	// with it would take over that container and mount its own folder there.
	const rev = (flag: string) =>
		Bun.spawnSync(['git', 'rev-parse', '--path-format=absolute', flag], { cwd: ROOT }).stdout.toString().trim();
	if (Bun.which('git') && rev('--git-dir') !== rev('--git-common-dir')) {
		die('this git worktree has no .env: write one with its own COMPOSE_PROJECT_NAME and ports (see .env.example)');
	}
	copyFileSync(join(ROOT, '.env.example'), ENV);
	// Bun loads the .env files before this script starts
	Object.assign(process.env, parseEnv(readFileSync(ENV, 'utf8')));
	console.log('✓ .env created from .env.example');
}

const { PB_PORT, PUBLIC_POCKETBASE_URL: PB_URL, PB_ADMIN_URL, APP_URL } = process.env;
const { PB_SUPERUSER_EMAIL: EMAIL, PB_SUPERUSER_PASSWORD: PASSWORD } = process.env;
if (!PB_PORT || !PB_URL || !APP_URL) die('.env lacks PB_PORT, PUBLIC_POCKETBASE_URL or APP_URL (see .env.example)');
const APP_PORT = Number(new URL(APP_URL).port) || 5173;

// compose.yaml requires ORIGIN on every command, `logs` included, and a checkout's .env may lack it.
if (!process.env.ORIGIN) {
	appendFileSync(ENV, `ORIGIN=${APP_URL}\n`);
	process.env.ORIGIN = APP_URL;
	console.log('✓ ORIGIN added to .env');
}

// --- Docker -----------------------------------------------------------------
const INSTALL = 'Docker is required: Docker Desktop, Docker Engine, or on macOS `brew install colima docker docker-compose`';
if (!Bun.which('docker')) die(INSTALL);

// Homebrew leaves the Compose plugin where the Docker CLI only looks with
// `cliPluginsExtraDirs` set, while its standalone `docker-compose` works as installed.
const COMPOSE = Bun.spawnSync(['docker', 'compose', 'version'], quiet).success
	? ['docker', 'compose']
	: ['docker-compose'];
if (!Bun.which(COMPOSE[0])) die(INSTALL);

// An engine that already answers is used as it is, whichever one it is.
if (!Bun.spawnSync(['docker', 'info'], quiet).success) {
	if (!Bun.which('colima')) die('Docker is not running: start it and run this again');
	console.log('▸ starting Colima');
	// The VM serves the whole machine and outlives this checkout. Its daemons (limactl, ssh)
	// inherit the folder and the session of what starts them, and closing a git worktree
	// stops every process whose folder is inside it: a stop there would take the VM down.
	const colima = Bun.spawn(['colima', 'start'], { ...loud, cwd: '/', detached: true });
	if ((await colima.exited) !== 0) die('`colima start` failed');
}

// `env` by name: left out, a child gets the environment from before this script changed it.
const compose = (...args: string[]) => Bun.spawn([...COMPOSE, ...args], { cwd: ROOT, env: process.env, ...loud }).exited;

// --- Ports ------------------------------------------------------------------
/** Someone answers on the port? Connects rather than listens, so it also sees a process on `::1` only. */
async function inUse(port: number): Promise<boolean> {
	for (const hostname of ['127.0.0.1', '::1']) {
		try {
			const socket = await Bun.connect({ hostname, port, socket: { data() {} } });
			socket.end();
			return true;
		} catch {
			// refused: nobody at this address
		}
	}
	return false;
}

// Docker sees only the VM's ports: with a process on the same host port, the container
// comes up anyway and the health check below would pass on that process's PocketBase.
const mine = Bun.spawnSync([...COMPOSE, 'ps', '-q', '--status', 'running'], { cwd: ROOT }).stdout.toString().trim();
if (!mine && (await inUse(Number(PB_PORT)))) die(`port ${PB_PORT} is taken (lsof -nP -iTCP:${PB_PORT} -sTCP:LISTEN)`);
if (await inUse(APP_PORT)) die(`port ${APP_PORT} is taken (lsof -nP -iTCP:${APP_PORT} -sTCP:LISTEN)`);

// --- Stop -------------------------------------------------------------------
let web: ReturnType<typeof Bun.spawn> | undefined;
let stopping = false;

async function stop(code = 0): Promise<void> {
	// a second Ctrl-C leaves at once
	if (stopping) process.exit(code);
	stopping = true;
	web?.kill();
	await compose('stop');
	process.exit(code);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());

// --- PocketBase -------------------------------------------------------------
console.log('▸ PocketBase');
// compose.yaml puts this on the image's tag: a changed entrypoint is a tag no image has
// yet, so `up` builds it and replaces the container of every checkout that runs this.
const imageHash = new Bun.CryptoHasher('sha256');
for (const file of ['pocketbase/Dockerfile', 'pocketbase/entrypoint.sh']) imageHash.update(readFileSync(join(ROOT, file)));
process.env.PB_IMAGE_SUFFIX = `-${imageHash.digest('hex').slice(0, 8)}`;
if ((await compose('up', '-d')) !== 0) await stop(1);

async function waitForPb(attempts = 120): Promise<boolean> {
	for (let i = 0; i < attempts; i++) {
		try {
			if ((await fetch(`${PB_URL}/api/health`)).ok) return true;
		} catch {
			// still coming up
		}
		await Bun.sleep(250);
	}
	return false;
}

if (!(await waitForPb())) {
	console.error(`✗ PocketBase did not answer at ${PB_URL}/api/health (docker compose logs)`);
	await stop(1);
}

// --- Schema and seed --------------------------------------------------------
// The /setup wizard names the deploy first, so an empty database stays empty here.
const pb = new PocketBase(PB_URL);
try {
	await pb.collection('_superusers').authWithPassword(EMAIL ?? '', PASSWORD ?? '');
	if (!(await isConfigured(pb))) {
		console.log(`▸ empty database: the installation waits at ${APP_URL}/setup`);
	}
} catch (err) {
	// the app still comes up: /setup and the PocketBase admin are where this gets fixed
	console.warn(`⚠  schema check skipped: ${(err as Error).message}. Does .env match this database's superuser?`);
}

// --- Vite -------------------------------------------------------------------
console.log(`\n  App         ${APP_URL}\n  PocketBase  ${PB_ADMIN_URL ?? `${PB_URL}/_/`}\n`);

// strictPort: a neighbouring port would leave the .env and the `look` URL pointing elsewhere
web = Bun.spawn(['bunx', 'vite', 'dev', '--port', String(APP_PORT), '--strictPort'], { cwd: ROOT, ...loud });
await web.exited;
await stop();
