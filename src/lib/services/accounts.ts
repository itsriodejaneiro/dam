import { pb } from './pb';
import { listAccounts } from './accountList';
import type { Account } from './types';

export async function getAccounts(): Promise<Account[]> {
	return await listAccounts(pb.collection('users'));
}

export async function createAccount(email: string, password: string): Promise<Account> {
	return await pb
		.collection('users')
		.create<Account>({ email, password, passwordConfirm: password, role: 'admin' });
}

export async function setAccountPassword(id: string, password: string): Promise<Account> {
	return await pb
		.collection('users')
		.update<Account>(id, { password, passwordConfirm: password });
}

export async function deleteAccount(id: string): Promise<void> {
	await pb.collection('users').delete(id);
}
