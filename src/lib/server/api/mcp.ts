/* The MCP server of the agents' API (docs/api-agentes.md § MCP e a REST do PocketBase):
   JSON-RPC over Streamable HTTP, with no state and no session, each request answered in
   JSON. It speaks both eras of the specification: the current one, with the version in the
   `_meta` of each request, and the `initialize` one, which older clients still use. The
   token passed the guard (guard.ts) before any request gets here. */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { INSTRUCTIONS, SERVER, ToolError, toolByName, TOOLS, type Tool, type ToolContext } from './tools';

/** The era with no `initialize`: the version comes in the `_meta` of every request. */
const MODERN = ['2026-07-28'];
/** The `initialize` era, the newest first. */
const LEGACY = ['2025-11-25', '2025-06-18', '2025-03-26'];
const SUPPORTED = [...MODERN, ...LEGACY];
/** With no version header, the specification says to assume the first of Streamable HTTP. */
const LEGACY_DEFAULT = '2025-03-26';

const META = 'io.modelcontextprotocol';
/** How long a client may keep the list of tools: it changes only with a deploy. */
const TTL_MS = 300_000;

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const HEADER_MISMATCH = -32020;
const UNSUPPORTED_VERSION = -32022;

type Json = Record<string, unknown>;
type Id = string | number;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A tool as `tools/list` shows it: the zod schema as JSON Schema. */
function definition(tool: Tool): Json {
	const { $schema: _, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input' }) as Json & { $schema?: string };
	return { name: tool.name, title: tool.title, description: tool.description, inputSchema, annotations: tool.annotations };
}

let cachedList: Json[] | null = null;
const listTools = () => ({ tools: (cachedList ??= TOOLS.map(definition)) });

class RpcError extends Error {
	constructor(
		readonly code: number,
		message: string,
		readonly status = 200,
		readonly data?: unknown
	) {
		super(message);
	}
}

const reply = (body: unknown, status = 200) => json(body, { status, headers: { 'cache-control': 'no-store' } });
const failure = (id: Id | null, e: RpcError) =>
	reply({ jsonrpc: '2.0', ...(id === null ? {} : { id }), error: { code: e.code, message: e.message, ...(e.data === undefined ? {} : { data: e.data }) } }, e.status);

const unsupported = (requested: unknown) => new RpcError(UNSUPPORTED_VERSION, 'Unsupported protocol version', 400, { supported: SUPPORTED, requested });

/** A tool's answer, or its refusal: the agent reads either and goes on. */
const toolResult = (body: unknown, isError: boolean) => ({ content: [{ type: 'text', text: JSON.stringify(body) }], structuredContent: body, isError });

/** The message of a zod refusal: each issue with its path. */
const issues = (error: z.ZodError) => error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ');

export async function callTool(ctx: ToolContext, params: Json) {
	const tool = typeof params.name === 'string' ? toolByName(params.name) : undefined;
	if (!tool) throw new RpcError(INVALID_PARAMS, `Unknown tool: ${String(params.name)}`);
	const args = params.arguments ?? {};
	if (!isObject(args)) throw new RpcError(INVALID_PARAMS, 'arguments must be an object');
	const parsed = tool.input.safeParse(args);
	if (!parsed.success) return toolResult({ error: 'bad_request', message: `The arguments of ${tool.name} are not in its shape: ${issues(parsed.error)}.` }, true);
	try {
		return toolResult(await tool.run(ctx, parsed.data), false);
	} catch (err) {
		if (err instanceof ToolError) return toolResult({ error: err.code, message: err.message, ...err.details }, true);
		console.error(`[api] ${tool.name} failed`, err);
		return toolResult({ error: 'internal', message: `${tool.name} failed on the server, and the request is not to blame. Try again; if it goes on, tell whoever runs this deployment.` }, true);
	}
}

/** A request of the `initialize` era: the version comes from the header, or from `initialize` itself. */
async function legacy(method: string, params: Json, request: Request, ctx: ToolContext): Promise<Json> {
	if (method === 'initialize') {
		const asked = params.protocolVersion;
		return {
			protocolVersion: typeof asked === 'string' && LEGACY.includes(asked) ? asked : LEGACY[0],
			capabilities: { tools: {} },
			serverInfo: SERVER,
			instructions: INSTRUCTIONS
		};
	}
	const version = request.headers.get('mcp-protocol-version') ?? LEGACY_DEFAULT;
	if (MODERN.includes(version)) throw new RpcError(INVALID_PARAMS, `Missing _meta ${META}/protocolVersion`, 400);
	if (!LEGACY.includes(version)) throw unsupported(version);
	if (method === 'ping') return {};
	if (method === 'tools/list') return listTools();
	if (method === 'tools/call') return callTool(ctx, params);
	throw new RpcError(METHOD_NOT_FOUND, `Method not found: ${method}`);
}

/** The headers mirror the body; `Mcp-Name` may come in base64 (`=?base64?…?=`). */
function headerMismatch(headers: Headers, method: string, version: string, params: Json): string | null {
	const expected: [string, unknown][] = [
		['MCP-Protocol-Version', version],
		['Mcp-Method', method]
	];
	if (method === 'tools/call') expected.push(['Mcp-Name', params.name]);
	for (const [name, body] of expected) {
		let value = headers.get(name);
		const encoded = name === 'Mcp-Name' && value ? /^=\?base64\?(.*)\?=$/.exec(value) : null;
		if (encoded) value = Buffer.from(encoded[1], 'base64').toString('utf8');
		if (value === null) return `Header mismatch: missing ${name}`;
		if (value !== body) return `Header mismatch: ${name} header value '${value}' does not match body value '${String(body)}'`;
	}
	return null;
}

/** A request of the current era: version and client capabilities in `_meta`, mirrored in the headers. */
async function modern(method: string, params: Json, meta: Json, request: Request, ctx: ToolContext): Promise<Json> {
	const version = meta[`${META}/protocolVersion`];
	if (typeof version !== 'string' || !isObject(meta[`${META}/clientCapabilities`])) {
		throw new RpcError(INVALID_PARAMS, `Missing _meta ${META}/protocolVersion or ${META}/clientCapabilities`, 400);
	}
	const mismatch = headerMismatch(request.headers, method, version, params);
	if (mismatch) throw new RpcError(HEADER_MISMATCH, mismatch, 400);
	if (!MODERN.includes(version)) throw unsupported(version);

	let result: Json;
	if (method === 'server/discover') result = { supportedVersions: SUPPORTED, capabilities: { tools: {} }, instructions: INSTRUCTIONS, ttlMs: TTL_MS, cacheScope: 'public' };
	else if (method === 'tools/list') result = { ...listTools(), ttlMs: TTL_MS, cacheScope: 'public' };
	else if (method === 'tools/call') result = await callTool(ctx, params);
	else throw new RpcError(METHOD_NOT_FOUND, `Method not found: ${method}`, 404);
	return { resultType: 'complete', ...result, _meta: { [`${META}/serverInfo`]: SERVER } };
}

/**
 * One POST on the MCP. A browser request from another origin is 403, against DNS
 * rebinding. An empty body is a request that did not come, not broken JSON: the
 * adapter-node also hands an empty body when the `Content-Type` is missing.
 */
export async function mcp(request: Request, ctx: ToolContext): Promise<Response> {
	const from = request.headers.get('origin');
	if (from && from !== ctx.origin) return failure(null, new RpcError(INVALID_REQUEST, 'Origin not allowed', 403));

	const text = await request.text();
	if (!text.trim()) return failure(null, new RpcError(INVALID_REQUEST, 'Invalid Request: empty body, or no Content-Type: application/json', 400));
	let msg: unknown;
	try {
		msg = JSON.parse(text);
	} catch {
		return failure(null, new RpcError(PARSE_ERROR, 'Parse error', 400));
	}
	const id = isObject(msg) && (typeof msg.id === 'string' || typeof msg.id === 'number') ? msg.id : null;
	if (!isObject(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' || ('id' in msg && id === null) || ('params' in msg && !isObject(msg.params))) {
		return failure(id, new RpcError(INVALID_REQUEST, 'Invalid Request', 400));
	}
	// a notification (`notifications/initialized`, among others): none wants an answer
	if (id === null) return new Response(null, { status: 202 });

	const params = (msg.params as Json | undefined) ?? {};
	const meta = isObject(params._meta) ? params._meta : {};
	try {
		const result =
			msg.method !== 'initialize' && `${META}/protocolVersion` in meta
				? await modern(msg.method, params, meta, request, ctx)
				: await legacy(msg.method, params, request, ctx);
		return reply({ jsonrpc: '2.0', id, result });
	} catch (e) {
		if (e instanceof RpcError) return failure(id, e);
		throw e;
	}
}
