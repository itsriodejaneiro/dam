<script lang="ts">
	import { page } from '$app/state';
	import { AppMeta } from '$lib/components';
	import { m, localesState } from '$lib/i18n';
	import { placeName } from '$lib/settings';

	let place = $derived(placeName(page.data.settings, localesState.current));
</script>

<main>
	<section class="hero">
		<AppMeta section="2026.05" />
		<div>
			<h1>
				{m('nav.brand')}<br />
				{#if place}{m('home.title_b')} <em>{place}</em>.{:else}{m('home.title_b_generic')}.{/if}
			</h1>
			<p class="lede">
				{place ? m('home.lede', place) : m('home.lede_generic')}
			</p>
		</div>
	</section>
</main>

<style>
	main {
		max-width: 1240px;
		margin: 0 auto;
		padding: 4rem 2.5rem 6rem;
	}
	.hero {
		padding: 4rem 0 2rem;
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
	}
	.hero h1 {
		font-size: clamp(2.5rem, 5vw, 4.2rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.02;
		max-width: 18ch;
	}
	.hero h1 em {
		font-style: italic;
		color: var(--accent);
		font-weight: 400;
	}
	.lede {
		margin-top: 1.8rem;
		max-width: 58ch;
		font-size: 1.15rem;
		color: var(--text-muted);
		line-height: 1.55;
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
</style>
