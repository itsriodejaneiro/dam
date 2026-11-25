import { SERVICE_ACCOUNT_EMAIL } from '../api';
import type { Account } from './types';

/** What the list needs from the `users` collection: the test hands it a double. */
export interface AccountSource {
	getFullList<T>(): Promise<T[]>;
}

/**
 * The people's accounts, by e-mail: the agents' API's service account is nobody's, and
 * stays out. The query names no `email`: to anyone but a superuser, PocketBase adds
 * `emailVisibility = true` to a filter on the e-mail of an auth collection, and the
 * accounts keep theirs hidden, so that filter matches none. The list is short, and the
 * browser filters and sorts it.
 */
export async function listAccounts(users: AccountSource): Promise<Account[]> {
	const all = await users.getFullList<Account>();
	return all
		.filter((account) => account.email !== SERVICE_ACCOUNT_EMAIL)
		.sort((a, b) => a.email.localeCompare(b.email));
}
