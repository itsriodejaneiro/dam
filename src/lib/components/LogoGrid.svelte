<script lang="ts">
	/* Partners' logos in white squares, so that any mark, of any shape or colour, reads in both
	   modes from one file: contained with a margin, centred, the whole square the link. */
	interface Props {
		logos: { src: string; name: string; url: string }[];
	}

	let { logos }: Props = $props();
</script>

<ul class="logo-grid">
	{#each logos as logo, i (i)}
		<li>
			{#if logo.url}
				<a class="tile" href={logo.url} target="_blank" rel="noopener noreferrer" title={logo.name}>
					<img src={logo.src} alt={logo.name} loading="lazy" />
				</a>
			{:else}
				<span class="tile" title={logo.name}>
					<img src={logo.src} alt={logo.name} loading="lazy" />
				</span>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.logo-grid {
		--gap: 1rem;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--gap);
		/* six to a row at most */
		max-width: calc(6 * 160px + 5 * var(--gap));
		margin: 0 auto;
	}
	li {
		flex: 0 1 160px;
		min-width: 120px;
	}
	.tile {
		display: block;
		aspect-ratio: 1;
		padding: 16%;
		background: var(--logo-tile);
		border: 1px solid var(--logo-tile-border);
		border-radius: 3px;
		transition: box-shadow 0.2s;
	}
	a.tile:hover {
		box-shadow: 0 0 0 2px var(--accent);
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	@media (max-width: 600px) {
		.logo-grid {
			--gap: 0.75rem;
		}
		li {
			flex-basis: calc((100% - 2 * var(--gap)) / 3);
			min-width: 0;
		}
	}
</style>
