<script lang="ts">
	import { onMount } from 'svelte';
	import JourneyView from '$lib/components/JourneyView.svelte';
	import { auth, requireAdmin, journeys } from '$lib/services';
	import { m } from '$lib/i18n';
	import { toPublished } from '$lib/journey';
	import type { PublishedJourney } from '$lib/types/journey';

	let { data } = $props();

	requireAdmin();

	// The edit, not the copy: the preview shows what Publish would put on the site.
	let journey = $state.raw<PublishedJourney | null>(null);
	let failed = $state(false);

	onMount(async () => {
		try {
			const [record, steps] = await Promise.all([
				journeys.getJourney(data.id),
				journeys.getSteps(data.id)
			]);
			journey = toPublished(record, steps);
		} catch {
			failed = true;
		}
	});
</script>

{#if auth.isAdmin}
	<div class="preview-banner">
		<span>{m('journeys_admin.preview_banner')}</span>
		<a class="admin-action" href="/admin/journeys/{data.id}">{m('publish.back_to_editor')}</a>
	</div>
	{#if failed}
		<p class="admin-error">{m('journeys_admin.error.load')}</p>
	{:else if journey}
		<JourneyView {journey} />
	{/if}
{/if}
