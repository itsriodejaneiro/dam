<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { AppMeta, Button } from '$lib/components';
	import { auth } from '$lib/services/auth.svelte';
	import { m } from '$lib/i18n';

	// Post-login destination: ?redirect= (internal paths only) or the admin by default.
	function dest(): string {
		const r = page.url.searchParams.get('redirect');
		return r && r.startsWith('/') && !r.startsWith('//') ? r : '/admin/entities';
	}

	$effect(() => {
		if (browser && auth.isLoggedIn) goto(dest());
	});

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			await auth.login(email, password);
			goto(dest());
		} catch {
			error = m('login.invalid');
		} finally {
			loading = false;
		}
	}
</script>

<main>
	<section class="login">
		<AppMeta section={m('meta.access')} />
		<div class="form-wrap">
			<h1>{m('login.title')}</h1>
			<p class="lede">{m('login.lede')}</p>

			<form onsubmit={handleSubmit}>
				<div class="field">
					<label class="field-label" for="email">{m('login.email')}</label>
					<input
						id="email"
						class="input"
						type="email"
						autocomplete="username"
						bind:value={email}
						required
					/>
				</div>

				<div class="field">
					<label class="field-label" for="password">{m('login.password')}</label>
					<input
						id="password"
						class="input"
						type="password"
						autocomplete="current-password"
						bind:value={password}
						required
					/>
				</div>

				{#if error}
					<p class="error">{error}</p>
				{/if}

				<Button type="submit" {loading}>{m('login.submit')}</Button>
			</form>
		</div>
	</section>
</main>

<style>
	main {
		max-width: 1240px;
		margin: 0 auto;
		padding: 4rem 2.5rem 6rem;
	}
	.login {
		padding: 4rem 0 2rem;
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
	}
	.form-wrap {
		max-width: 420px;
	}
	h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.05;
	}
	.lede {
		margin-top: 1rem;
		color: var(--text-muted);
	}
	form {
		margin-top: 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}
	.field {
		display: flex;
		flex-direction: column;
	}
	.error {
		color: var(--danger);
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
	}
	@media (max-width: 900px) {
		main { padding: 2rem 1.2rem 4rem; }
		.login { grid-template-columns: 1fr; gap: 0.5rem; }
	}
</style>
