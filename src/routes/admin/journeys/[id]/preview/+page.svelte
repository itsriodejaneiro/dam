<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import JourneyView from '$lib/components/JourneyView.svelte';
	import { auth, journeys } from '$lib/services';
	import { m } from '$lib/i18n';
	import type { Journey, JourneyStep } from '$lib/types/journey';

	let { data } = $props();

	$effect(() => {
		if (browser && !auth.isLoggedIn) goto(auth.loginPath());
	});

	let journey = $state.raw<Journey | null>(null);
	let steps = $state.raw<JourneyStep[]>([]);
	let failed = $state(false);

	onMount(async () => {
		try {
			[journey, steps] = await Promise.all([
				journeys.getJourney(data.id),
				journeys.getSteps(data.id)
			]);
		} catch {
			failed = true;
		}
	});
</script>

{#if auth.isLoggedIn}
	<div class="banner">
		<span>{m('journeys_admin.preview_banner')}</span>
		<a class="admin-action" href="/admin/journeys/{data.id}">{m('journeys_admin.back_to_editor')}</a>
	</div>
	{#if failed}
		<p class="admin-error failed">{m('journeys_admin.error.load')}</p>
	{:else if journey}
		<JourneyView {journey} {steps} />
	{/if}
{/if}

<style>
	.banner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 0.6rem 1rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.75rem;
		color: var(--text-muted);
		background: var(--bg-elevated);
		border-bottom: 1px solid var(--border);
	}
	.failed {
		padding: 4rem 2.5rem;
		text-align: center;
	}
</style>
