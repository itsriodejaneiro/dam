<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/i18n';
</script>

<main>
	<section class="hero">
		<div class="meta">{m('error.label')} / {page.status}</div>
		<div>
			<h1>{page.status === 404 ? m('error.not_found') : m('error.generic')}</h1>
			<p class="lede">
				{page.error?.message ?? m('error.unexpected')}
			</p>
			<a class="back" href="/">{m('common.back_home')}</a>
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
	.meta {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		color: var(--text-soft);
		text-transform: uppercase;
		padding-top: 0.4rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 4vw, 3.2rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.05;
		max-width: 18ch;
	}
	.lede {
		margin-top: 1.4rem;
		max-width: 58ch;
		font-size: 1.05rem;
		color: var(--text-muted);
		line-height: 1.55;
	}
	.back {
		display: inline-block;
		margin-top: 2rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
		text-decoration: none;
		border-bottom: 1px solid var(--border-strong);
		padding-bottom: 0.2rem;
		transition: color 0.15s, border-color 0.15s;
	}
	.back:hover {
		color: var(--accent);
		border-color: var(--accent);
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
