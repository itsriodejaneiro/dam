<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import { m } from '$lib/i18n';

	/* Asks before an editor with unsaved changes is left. Closing the tab gets the browser's
	   own question. */
	interface Props {
		dirty: boolean;
	}

	let { dirty }: Props = $props();

	let open = $state(false);
	let leaveTo = '';
	let leaving = false;

	beforeNavigate((nav) => {
		if (!dirty || leaving) return;
		nav.cancel();
		if (nav.type === 'leave' || !nav.to) return;
		leaveTo = nav.to.url.pathname + nav.to.url.search;
		open = true;
	});

	async function leave() {
		leaving = true;
		open = false;
		await goto(leaveTo);
	}
</script>

<ConfirmDialog
	bind:open
	title={m('publish.leave_title')}
	description={m('publish.leave_desc')}
	confirmLabel={m('publish.leave_action')}
	cancelLabel={m('common.cancel')}
	onConfirm={leave}
/>
