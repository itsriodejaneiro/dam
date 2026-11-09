<script lang="ts">
	import '$lib/styles/index.css';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { SiteHeader } from '$lib/components';
	import { localesState, deployLocales, m, type MessageKey } from '$lib/i18n';
	import { markUrl, placeName } from '$lib/settings';
	import { applyDeployPack } from '$lib/theme';

	let { data, children } = $props();

	let settings = $derived(data.settings);
	let locales = $derived(deployLocales(settings.locales, settings.defaultLocale));

	// SSR and hydration render in the deploy's default locale.
	localesState.seed(untrack(() => locales));

	// init() handles the preference saved in localStorage internally, with untrack
	// around the reads of _current, so this effect can run more than once with no
	// side effect on the current locale the user picked.
	$effect.pre(() => {
		localesState.init(locales);
	});

	// A save in /admin/settings reaches <html> with no reload.
	$effect(() => {
		applyDeployPack(settings.theme);
	});

	// Title = [page title] | brand | deploy name, always in the current locale.
	// Routes pass `titleKey` (i18n) by preference; a raw `title` is the fallback.
	let pageTitle = $derived(
		page.data.titleKey ? m(page.data.titleKey as MessageKey) : (page.data.title ?? null)
	);
	let title = $derived(
		[pageTitle, m('nav.brand'), placeName(settings, localesState.current)].filter(Boolean).join(' | ')
	);
	let subtitle = $derived(
		page.data.subtitleKey ? m(page.data.subtitleKey as MessageKey) : page.data.subtitle
	);

	let icon = $derived(markUrl(settings) ?? favicon);
</script>

<svelte:head>
	<title>{title}</title>
	<link rel="icon" href={icon} />
</svelte:head>

<SiteHeader {subtitle} />

{@render children()}
