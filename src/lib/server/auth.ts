/* Server-side validation of a superuser token. Never trusts the client alone: it
   re-runs authRefresh against PocketBase and checks that it really is a _superuser. */

import PocketBase from 'pocketbase';
import { serverPbUrl } from '$lib/services/pb.server';

export async function isSuperuserToken(token: string): Promise<boolean> {
	if (!token) return false;
	const check = new PocketBase(serverPbUrl());
	check.authStore.save(token, null);
	try {
		await check.collection('_superusers').authRefresh();
	} catch {
		return false;
	}
	return check.authStore.record?.collectionName === '_superusers';
}
