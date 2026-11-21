/* What the agents' API shares between the server, the admin screen and the manual: its
   address, the token's shape and the service account it writes as. Relative imports only:
   the CLI setup imports this module outside Vite. */

export const API_PATH = '/api/v1';
/** The MCP server: one POST per JSON-RPC request. */
export const MCP_PATH = `${API_PATH}/mcp`;

/** A token: `dam_<8 hex>_<256-bit secret in base64url>`. The prefix finds the record. */
export const TOKEN_PREFIX = 'dam';
export const TOKEN_PATTERN = /^dam_([0-9a-f]{8})_[A-Za-z0-9_-]{43}$/;

/** The start of a token, as the list shows it. */
export const tokenHint = (prefix: string) => `${TOKEN_PREFIX}_${prefix}_…`;

/**
 * The account the API writes as: an admin in `users` with a password nobody holds, so the
 * collections' rules decide what a tool reaches. `/admin/accounts` leaves it out of the list.
 */
export const SERVICE_ACCOUNT_EMAIL = 'api@service.invalid';

/** Requests a token may make in a minute; the guard answers 429 above it. */
export const REQUESTS_PER_MINUTE = 120;

/** What `api_writes` records: a write by a tool, or a token created or deleted in the admin. */
export const WRITE_ACTIONS = ['create', 'update', 'delete'] as const;
export type WriteAction = (typeof WRITE_ACTIONS)[number];
