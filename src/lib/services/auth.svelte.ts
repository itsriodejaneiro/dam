import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { pb } from './pb';

class AuthState {
	isLoggedIn = $state(false);
	userId = $state<string | null>(null);
	email = $state<string | null>(null);
	isSuperuser = $state(false);
	/** May use the admin screens: a superuser, or an account with the admin role. */
	isAdmin = $state(false);

	constructor() {
		if (browser) {
			this.sync();
			pb.authStore.onChange(() => this.sync());
		}
	}

	private sync() {
		this.isLoggedIn = pb.authStore.isValid;
		const record = pb.authStore.record as
			| { id?: string; email?: string; collectionName?: string; role?: string }
			| null;
		this.userId = record?.id ?? null;
		this.email = record?.email ?? null;
		this.isSuperuser = record?.collectionName === '_superusers';
		this.isAdmin = this.isSuperuser || record?.role === 'admin';
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
}

export const auth = new AuthState();

/** The guard of an admin screen, called once from its script. An account signed in with no
    role goes to the home page: /login would send it straight back here. */
export function requireAdmin() {
	$effect(() => {
		if (browser && !auth.isAdmin) goto(auth.isLoggedIn ? '/' : '/login');
	});
}
