<script lang="ts">
	import LogoGrid from './LogoGrid.svelte';
	import { localesState, t } from '$lib/i18n';
	import { sanitizeHtml } from '$lib/sanitize';
	import type { ResolvedBlock } from '$lib/types/page';

	/* A page's blocks as the visitor reads them, in the current locale: a blank text falls
	   back to the default locale (t). The addresses and files come resolved (resolveBlocks). */
	interface Props {
		blocks: ResolvedBlock[];
	}

	let { blocks }: Props = $props();

	const code = $derived(localesState.current);
</script>

<div class="page-blocks">
	{#each blocks as block (block.id)}
		{#if block.type === 'text'}
			<div class="text">{@html sanitizeHtml(t(block.body, code))}</div>
		{:else if block.type === 'image'}
			<figure>
				<img src={block.src} alt={t(block.alt, code)} loading="lazy" />
				{#if t(block.caption, code)}
					<figcaption>{t(block.caption, code)}</figcaption>
				{/if}
			</figure>
		{:else if block.type === 'cards'}
			<div class="cards" style="--cards: {block.cards.length}">
				{#each block.cards as card, i (i)}
					<a
						class="link-card"
						href={card.href}
						target={card.external ? '_blank' : undefined}
						rel={card.external ? 'noopener noreferrer' : undefined}
					>
						<h3>{t(card.title, code)}</h3>
						{#if t(card.text, code)}<p>{t(card.text, code)}</p>{/if}
					</a>
				{/each}
			</div>
		{:else if block.type === 'logos'}
			<LogoGrid logos={block.logos} />
		{/if}
	{/each}
</div>

<style>
	.page-blocks {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.text {
		max-width: 62ch;
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--text-muted);
	}
	.text :global(h2) {
		font-size: clamp(1.5rem, 2.6vw, 2rem);
		font-weight: 400;
		letter-spacing: -0.02em;
		line-height: 1.15;
		color: var(--text);
		margin: 1.6em 0 0.6em;
	}
	.text :global(h3) {
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--text);
		margin: 1.4em 0 0.5em;
	}
	.text :global(:is(h2, h3):first-child) {
		margin-top: 0;
	}
	.text :global(p),
	.text :global(ul),
	.text :global(ol) {
		margin-bottom: 0.9em;
	}
	.text :global(:is(ul, ol)) {
		padding-left: 1.4em;
	}
	.text :global(a) {
		color: var(--accent);
		text-underline-offset: 2px;
	}
	.text :global(strong) {
		color: var(--text);
		font-weight: 600;
	}

	figure img {
		display: block;
		max-width: 100%;
		height: auto;
		border-radius: 3px;
	}
	figcaption {
		margin-top: 0.7rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		color: var(--text-soft);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(var(--cards), minmax(0, 1fr));
		gap: 1rem;
	}

	@media (max-width: 900px) {
		.page-blocks {
			gap: 2.2rem;
		}
		.cards {
			grid-template-columns: 1fr;
		}
	}
</style>
