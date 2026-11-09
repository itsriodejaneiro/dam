/** What an account may do. `admin` edits everything; a new role is one more value here. */
export const ACCOUNT_ROLES = ['admin'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];
