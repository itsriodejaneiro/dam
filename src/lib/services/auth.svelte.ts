import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { ClientResponseError } from 'pocketbase';
import { pb } from './pb';
import { deriveSession, msUntilExpiry, refreshRejected, type StoredRecord } from './session';

/** The longest delay a browser timer takes, about 24 days. */
const MAX_TIMER_MS = 2 ** 31 - 1;

class AuthState {
	isLoggedIn = $state(false);
	userId = $state<string | null>(null);
	email = $state<string | null>(null);
	isSuperuser = $state(false);
	/** May use the admin screens: a superuser, or an account with the admin role. */
	isAdmin = $state(false);

	private expiry: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		if (browser) {
			this.sync();
			pb.authStore.onChange(() => this.sync());
			// A timer sleeps with the machine: look again when the tab comes back.
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') this.sync();
			});
			void this.refresh();
		}
	}

	/** Reads the auth store into the state. An expired token leaves the store here, at load
	    or with the tab open, so that the guards send the person to the sign-in page. */
	private sync() {
		clearTimeout(this.expiry);
		if (pb.authStore.token && !pb.authStore.isValid) {
			pb.authStore.clear(); // calls sync again, through onChange
			return;
		}
		const record = pb.authStore.record as StoredRecord | null;
		Object.assign(this, deriveSession(pb.authStore.isValid, record));
		if (pb.authStore.isValid) {
			const wait = Math.min(msUntilExpiry(pb.authStore.token), MAX_TIMER_MS);
			this.expiry = setTimeout(() => this.sync(), wait);
		}
	}

	/** Renews the session at load and brings the role as it is now: an account deleted or
	    left without a role loses the menu here, not when its token expires. */
	private async refresh() {
		const token = pb.authStore.token;
		const collection = (pb.authStore.record as StoredRecord | null)?.collectionName;
		if (!pb.authStore.isValid || !collection) return;
		try {
			await pb.collection(collection).authRefresh();
		} catch (err) {
			const rejected = err instanceof ClientResponseError && refreshRejected(err.status);
			// The token is compared so that a sign-in made while this ran stays.
			if (rejected && pb.authStore.token === token) pb.authStore.clear();
		}
	}

	async login(email: string, password: string) {
		try {
			await pb.collection('users').authWithPassword(email, password);
		} catch {
			await pb.collection('_superusers').authWithPassword(email, password);
		}
	}

	logout() {
		pb.authStore.clear();
	}

	/** The sign-in page, returning to the page open now. */
	loginPath(): string {
		return `/login?redirect=${encodeURIComponent(page.url.pathname + page.url.search)}`;
	}
}

export const auth = new AuthState();

/** The guard of an admin screen, called once from its script. An account signed in with no
    role goes to the home page: /login would send it straight back here. */
export function requireAdmin() {
	$effect(() => {
		if (browser && !auth.isAdmin) goto(auth.isLoggedIn ? '/' : auth.loginPath());
	});
}
