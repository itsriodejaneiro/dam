<script lang="ts">
	import { untrack } from 'svelte';
	import LocalizedInput from './LocalizedInput.svelte';
	import { deployLocales, LOCALE_CODES, m, type Localized } from '$lib/i18n';
	import { flagUrl } from '$lib/flag';
	import { LOGO_TYPES, type DeploySettings } from '$lib/settings';
	import { PACKS } from '$lib/theme';

	interface Props {
		settings: DeploySettings;
	}

	let { settings }: Props = $props();

	// Editable copy: the parent re-keys this component to reload it after a save.
	const initial = untrack(() => settings);
	let name = $state<Localized>({ ...initial.name });
	let codes = $state<string[]>([...initial.locales]);
	let defaultLocale = $state(initial.defaultLocale);
	let theme = $state<string>(initial.theme);
	let flag = $state(initial.flag ?? '');
	let flagFound = $state(true);
	let journeys = $state(initial.journeys);

	let available = $derived(deployLocales(LOCALE_CODES, defaultLocale));
	let chosen = $derived(available.filter((l) => codes.includes(l.code)));
	let flagCode = $derived(flag.trim().toLowerCase());

	// The default stays among the chosen languages.
	$effect(() => {
		if (codes.length > 0 && !codes.includes(defaultLocale)) defaultLocale = codes[0];
	});
</script>

<div class="fields">
	<div class="field">
		<span class="field-label">{m('settings.field.locales')}</span>
		{#each available as loc (loc.code)}
			<div class="locale">
				<label class="check">
					<input type="checkbox" name="locales" value={loc.code} bind:group={codes} />
					{loc.label}
				</label>
				{#if codes.includes(loc.code)}
					<label class="check soft">
						<input type="radio" name="default_locale" value={loc.code} bind:group={defaultLocale} />
						{m('settings.field.default_locale')}
					</label>
				{/if}
			</div>
		{/each}
	</div>

	<div class="field">
		<span class="field-label">{m('settings.field.name')}</span>
		<LocalizedInput bind:value={name} locales={chosen} required={false} />
		<input type="hidden" name="name" value={JSON.stringify(name)} />
		<p class="hint">{m('settings.field.name_hint')}</p>
	</div>

	<div class="field">
		<label class="field-label" for="settings-theme">{m('settings.field.theme')}</label>
		<select id="settings-theme" class="input" name="theme" bind:value={theme}>
			{#each PACKS as pack (pack)}
				<option value={pack}>{pack}</option>
			{/each}
		</select>
	</div>

	<div class="field">
		<label class="field-label" for="settings-flag">{m('settings.field.flag')}</label>
		<div class="flag-row">
			<input
				id="settings-flag"
				class="input flag-input"
				name="flag"
				maxlength="2"
				autocomplete="off"
				bind:value={flag}
			/>
			{#if flagCode.length === 2}
				<img
					class="mark"
					class:missing={!flagFound}
					src={flagUrl(flagCode)}
					alt=""
					onload={() => (flagFound = true)}
					onerror={() => (flagFound = false)}
				/>
			{/if}
		</div>
		<p class="hint">{m('settings.field.flag_hint')}</p>
	</div>

	<div class="field">
		<label class="field-label" for="settings-logo">{m('settings.field.logo')}</label>
		<input id="settings-logo" class="input" type="file" name="logo" accept={LOGO_TYPES.join(',')} />
		{#if settings.logo}
			<div class="flag-row">
				<img class="mark" src={settings.logo} alt="" />
				<label class="check soft">
					<input type="checkbox" name="logo_remove" />
					{m('settings.field.logo_remove')}
				</label>
			</div>
		{/if}
		<p class="hint">{m('settings.field.logo_hint')}</p>
	</div>

	<div class="field">
		<label class="check">
			<input type="checkbox" name="journeys" bind:checked={journeys} />
			{m('settings.field.journeys')}
		</label>
	</div>
</div>

<style>
	.fields {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.field {
		display: flex;
		flex-direction: column;
	}
	.locale {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.3rem 0;
		max-width: 22rem;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.92rem;
	}
	.check.soft {
		color: var(--text-muted);
		font-size: 0.82rem;
	}
	.check input {
		accent-color: var(--accent);
	}
	.hint {
		margin-top: 0.4rem;
		color: var(--text-soft);
		font-size: 0.8rem;
	}
	.flag-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.4rem;
	}
	.flag-input {
		width: 5rem;
		text-transform: lowercase;
	}
	.mark {
		display: block;
		height: 1.35rem;
		width: auto;
		border-radius: 2px;
		box-shadow: 0 0 0 1px var(--border-strong);
	}
	.mark.missing {
		visibility: hidden;
	}
</style>
