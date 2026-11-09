import { browser } from '$app/environment';
import { pb } from './pb';

class AuthState {
	isLoggedIn = $state(false);
	userId = $state<string | null>(null);
	email = $state<string | null>(null);
	isSuperuser = $state(false);

	constructor() {
		if (browser) {
			this.sync();
			pb.authStore.onChange(() => this.sync());
		}
	}

	private sync() {
		this.isLoggedIn = pb.authStore.isValid;
		const record = pb.authStore.record as
			| { id?: string; email?: string; collectionName?: string }
			| null;
		this.userId = record?.id ?? null;
		this.email = record?.email ?? null;
		this.isSuperuser = record?.collectionName === '_superusers';
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
