<script lang="ts">
	import { page } from '$app/state';
	import AppMeta from './AppMeta.svelte';
	import PageBlocks from './PageBlocks.svelte';
	import { localesState, m } from '$lib/i18n';
	import { placeName } from '$lib/settings';
	import type { ResolvedBlock } from '$lib/types/page';

	/* The home: the top from the settings, the same on every deploy, and below it the blocks
	   of the copy, or of the edit in the preview. */
	interface Props {
		blocks: ResolvedBlock[];
	}

	let { blocks }: Props = $props();

	let place = $derived(placeName(page.data.settings, localesState.current));
</script>

<main>
	<section class="hero">
		<AppMeta />
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
	{#if blocks.length > 0}
		<div class="blocks">
			<PageBlocks {blocks} />
		</div>
	{/if}
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
	/* under the hero's text, past the column of its meta */
	.blocks {
		margin: 3rem 0 0 6.5rem;
	}

	@media (max-width: 900px) {
		main {
			padding: 2rem 1.2rem 4rem;
		}
		.hero {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		.blocks {
			margin: 2rem 0 0;
		}
	}
</style>
