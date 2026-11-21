<script lang="ts">
	import { EllipsisVertical } from '@lucide/svelte';
	import { auth } from '$lib/services/auth.svelte';
	import { m } from '$lib/i18n';
	import DropdownMenu from './DropdownMenu.svelte';
	import type { MenuItem } from './types';

	let items = $derived<MenuItem[]>([
		{ href: '/ds', label: m('settings.design_system') },
		...(auth.isSuperuser ? [{ href: '/setup', label: m('settings.setup') }] : [])
	]);
</script>

{#if auth.isAdmin}
	<DropdownMenu label={m('settings.menu')} {items}>
		{#snippet trigger()}
			<EllipsisVertical size={16} strokeWidth={1.75} />
		{/snippet}
	</DropdownMenu>
{/if}
