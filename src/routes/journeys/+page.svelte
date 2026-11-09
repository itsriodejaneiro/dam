<script lang="ts">
	import { page } from '$app/state';
	import { AppMeta } from '$lib/components';
	import { localesState, m, t } from '$lib/i18n';
	import { countedSteps } from '$lib/journey';
	import { placeName } from '$lib/settings';

	let { data } = $props();

	const code = $derived(localesState.current);
	const place = $derived(placeName(page.data.settings, code));
</script>

<main>
	<section class="hero">
		<AppMeta section={m('meta.context')} />
		<div>
			<h1>{m('journeys.title')}</h1>
			<p class="lede">{place ? m('journeys.lede', place) : m('journeys.lede_generic')}</p>
		</div>
	</section>

	<section class="journeys">
		{#each data.journeys as journey (journey.id)}
			<a href="/journeys/{journey.slug}" class="journey-card">
				<h2>{t(journey.title, code)}</h2>
				<p>{t(journey.description, code)}</p>
				<span class="journey-phases">
					{m('journeys.phases_n', journey.phases.length)} ·
					{m('journeys.steps_n', countedSteps(journey.expand?.journey_steps_via_journey ?? []))}
				</span>
			</a>
		{:else}
			<p class="empty">{m('journeys.empty')}</p>
		{/each}
	</section>
</main>

<style>
	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 4rem 2.5rem 6rem;
	}
	.hero {
		padding: 4rem 0 2rem;
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
		margin-bottom: 3rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.05;
		margin-bottom: 1rem;
	}
	.lede {
		max-width: 58ch;
		color: var(--text-muted);
		line-height: 1.6;
	}

	@media (max-width: 900px) {
		main {
			padding: 2rem 1.2rem 4rem;
		}
		.hero {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}

	.journeys {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.empty {
		padding: 1.5rem;
		text-align: center;
		color: var(--text-soft);
		font-family: 'Fira Mono', monospace;
		font-size: 0.85rem;
		border: 1px dashed var(--border);
		border-radius: 3px;
	}
	.journey-card {
		display: block;
		padding: 1.8rem 2rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 4px;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	.journey-card:hover {
		border-color: var(--accent);
		box-shadow: 0 2px 16px color-mix(in srgb, var(--accent) 10%, transparent);
	}
	.journey-phases {
		display: block;
		margin-top: 1rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-soft);
	}
	.journey-card h2 {
		font-size: 1.3rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
	}
	.journey-card p {
		font-size: 0.88rem;
		color: var(--text-muted);
		line-height: 1.5;
	}
</style>
