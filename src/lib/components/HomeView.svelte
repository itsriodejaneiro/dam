<script lang="ts">
	import AppMeta from './AppMeta.svelte';
	import PageBlocks from './PageBlocks.svelte';
	import { localesState, m, t, type Localized } from '$lib/i18n';
	import { sanitizeHtml } from '$lib/sanitize';
	import type { ResolvedBlock } from '$lib/types/page';

	/* The home: the top the deploy writes, title and lede per locale, and below it the blocks
	   of the copy, or of the edit in the preview. A top blank in every locale shows the
	   generic text, so a fresh deploy reads as the product. */
	interface Props {
		title: Localized;
		lede: Localized;
		blocks: ResolvedBlock[];
	}

	let { title, lede, blocks }: Props = $props();

	const code = $derived(localesState.current);
	// The title is the editor's HTML, italic and line breaks: cleaned on its way in, as every
	// stored rich text is.
	const heading = $derived(sanitizeHtml(t(title, code)));
	const intro = $derived(t(lede, code));
</script>

<main>
	<section class="hero">
		<AppMeta />
		<div>
			<h1>
				{#if heading}{@html heading}{:else}{m('home.title_a')}<br />{m('home.title_b')}.{/if}
			</h1>
			<p class="lede">{intro || m('home.lede')}</p>
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
	.hero h1 :global(em) {
		font-style: italic;
		color: var(--accent);
		font-weight: 400;
	}
	/* the editor wraps the title in a paragraph; a second one is one more line */
	.hero h1 :global(p) {
		margin: 0;
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
