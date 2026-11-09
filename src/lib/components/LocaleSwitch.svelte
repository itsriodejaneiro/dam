<script lang="ts">
	import { localesState, m } from '$lib/i18n';
</script>

{#if localesState.all.length > 1}
	<div class="switcher" role="group" aria-label={m('nav.locale')}>
		{#each localesState.all as loc (loc.id)}
			<button
				type="button"
				class:active={localesState.current === loc.code}
				onclick={() => localesState.setCurrent(loc.code)}
				title={loc.label}
				aria-pressed={localesState.current === loc.code}
			>
				{loc.code.toUpperCase()}
			</button>
		{/each}
	</div>
{/if}

<style>
	.switcher {
		display: inline-flex;
		gap: 0;
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		overflow: hidden;
	}
	.switcher button {
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		padding: 0.4rem 0.55rem;
		background: transparent;
		color: var(--text-muted);
		border: 0;
		cursor: pointer;
		line-height: 1;
		transition: color 0.12s, background 0.12s;
	}
	.switcher button + button {
		border-left: 1px solid var(--border-strong);
	}
	.switcher button:hover {
		color: var(--text);
	}
	.switcher button.active {
		color: var(--accent);
		background: var(--accent-soft);
	}
</style>
