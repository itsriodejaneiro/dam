import PocketBase from 'pocketbase';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

// process.env and not $env/dynamic/private: the browser loads this module too, and
// `browser` drops this branch from its bundle.
export const pb = new PocketBase(
	browser ? env.PUBLIC_POCKETBASE_URL : process.env.PB_URL || env.PUBLIC_POCKETBASE_URL
);
pb.autoCancellation(false);
