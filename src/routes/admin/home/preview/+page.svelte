<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { HomeView } from '$lib/components';
	import { auth, requireAdmin, journeys, maps, pages } from '$lib/services';
	import { m } from '$lib/i18n';
	import { parseBlocks, resolveBlocks } from '$lib/page';
	import type { ResolvedBlock } from '$lib/types/page';

	requireAdmin();

	// The edit, not the copy: the preview shows what Publish would put on the site, with the
	// cards that would lead somewhere there.
	let blocks = $state.raw<ResolvedBlock[] | null>(null);
	let failed = $state(false);

	onMount(async () => {
		try {
			const [home, mapList, journeyList] = await Promise.all([
				pages.getHome(),
				maps.getMaps(),
				journeys.getJourneys()
			]);
			const showJourneys = page.data.settings.journeys;
			const addresses = {
				map: new Map(mapList.map((r) => [r.id, `/maps/${r.slug}`])),
				journey: new Map(
					journeyList
						.filter((j) => showJourneys && j.published)
						.map((j) => [j.id, `/journeys/${j.slug}`])
				)
			};
			const images = new Set(home.images);
			blocks = resolveBlocks(parseBlocks(home.blocks), {
				image: (name) => (images.has(name) ? pages.imageUrl(home, name) : null),
				target: (kind, id) => addresses[kind].get(id) ?? null
			});
		} catch {
			failed = true;
		}
	});
</script>

{#if auth.isAdmin}
	<div class="preview-banner">
		<span>{m('home_admin.preview_banner')}</span>
		<a class="admin-action" href="/admin/home">{m('publish.back_to_editor')}</a>
	</div>
	{#if failed}
		<p class="admin-error">{m('home_admin.error.load')}</p>
	{:else if blocks}
		<HomeView {blocks} />
	{/if}
{/if}
