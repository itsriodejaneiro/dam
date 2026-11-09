<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { AppMeta, Button, SettingsFields } from '$lib/components';
	import { auth } from '$lib/services/auth.svelte';
	import { pb } from '$lib/services/pb';
	import { m } from '$lib/i18n';

	let { data, form } = $props();

	$effect(() => {
		if (browser && !auth.isLoggedIn) goto('/login');
	});

	let saving = $state(false);
	// Bumped after a save, so the fields reload from the fresh settings (the logo above all).
	let revision = $state(0);

	const submit: SubmitFunction = ({ formData }) => {
		formData.set('token', pb.authStore.token);
		saving = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') revision++;
			saving = false;
		};
	};
</script>

{#if auth.isLoggedIn}
	<main>
		<section class="hero">
			<AppMeta section={m('meta.admin')} />
			<div>
				<h1>{m('settings.title')}</h1>
				<p class="lede">{m('settings.lede')}</p>
			</div>
		</section>

		<section class="block">
			<form method="POST" enctype="multipart/form-data" use:enhance={submit}>
				{#key revision}
					<SettingsFields settings={data.settings} />
				{/key}
				<div class="actions">
					<Button type="submit" loading={saving}>{m('common.save')}</Button>
					{#if form?.error}
						<p class="error">{m(form.error)}</p>
					{:else if form?.saved}
						<p class="saved">{m('settings.saved')}</p>
					{/if}
				</div>
			</form>
		</section>
	</main>
{/if}

<style>
	main {
		max-width: 1240px;
		margin: 0 auto;
		padding: 2rem 2.5rem 6rem;
	}
	.hero {
		padding: 2rem 0;
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.05;
	}
	.lede {
		margin-top: 1rem;
		max-width: 58ch;
		color: var(--text-muted);
	}
	.block {
		padding: 3rem 0;
		border-top: 1px solid var(--border);
	}
	form {
		max-width: 560px;
		margin-left: 6.5rem;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 2rem;
	}
	.error,
	.saved {
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
	}
	.error {
		color: var(--danger);
	}
	.saved {
		color: var(--accent);
	}
	@media (max-width: 900px) {
		main {
			padding: 1rem 1.2rem 4rem;
		}
		.hero {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		form {
			margin-left: 0;
		}
	}
</style>
