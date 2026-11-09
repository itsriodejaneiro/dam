<script lang="ts">
	interface Props {
		section?: string;
	}
	let { section }: Props = $props();

	const version = __APP_VERSION__;
</script>

<div class="meta">v{version}{#if section} / {section}{/if}</div>

<style>
	.meta {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		color: var(--text-soft);
		text-transform: uppercase;
		padding-top: 0.4rem;
	}
</style>
