import { defineConfig } from 'vitepress';
import { version } from '../../package.json';

export default defineConfig({
	lang: 'en-US',
	title: 'Digital Assets Map',
	description: "The manual of the Digital Assets Map, an interactive map of a country's digital infrastructure.",
	// GitHub Pages serves the site from the repository's name
	base: '/dam/',
	cleanUrls: true,
	// Install gives the addresses of a local stack, which no build can reach
	ignoreDeadLinks: 'localhostLinks',
	// the app opens in dark mode, and the screens show it
	appearance: 'dark',
	head: [
		['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
		['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
		[
			'link',
			{
				rel: 'stylesheet',
				href: 'https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Fira+Mono:wght@400;500;700&display=swap'
			}
		]
	],
	themeConfig: {
		search: { provider: 'local' },
		outline: { level: [2, 3] },
		// the manual builds from the same commit as the code, so this is the code's version
		nav: [{ text: `v${version}`, link: '/changelog' }],
		socialLinks: [{ icon: 'github', link: 'https://github.com/itsriodejaneiro/dam' }],
		editLink: {
			pattern: 'https://github.com/itsriodejaneiro/dam/edit/main/docs/:path',
			text: 'Edit this page'
		},
		sidebar: [
			{
				text: 'Getting started',
				items: [
					{ text: 'Introduction', link: '/introduction' },
					{ text: 'Install', link: '/install' },
					{ text: 'Configure your deployment', link: '/configure' }
				]
			},
			{
				text: 'Using the map',
				items: [
					{ text: 'Getting around', link: '/getting-around' },
					{ text: 'The map', link: '/map' }
				]
			},
			{
				text: 'Editing',
				items: [
					{ text: 'Sign in', link: '/sign-in' },
					{ text: 'Entities', link: '/entities' },
					{ text: 'Connections', link: '/connections' },
					{ text: 'Categories', link: '/categories' },
					{ text: 'Maps', link: '/maps' },
					{ text: 'The home page', link: '/home' }
				]
			},
			{
				text: 'Journeys',
				items: [
					{ text: 'Journeys for visitors', link: '/journeys' },
					{ text: 'Writing a journey', link: '/writing-a-journey' }
				]
			},
			{
				text: 'Administration',
				items: [{ text: 'Accounts', link: '/accounts' }]
			},
			{
				text: 'Contributing',
				items: [
					{ text: 'Contributing', link: '/contributing' },
					{ text: 'Add a theme', link: '/add-a-theme' },
					{ text: 'Design system', link: '/design-system' },
					{ text: 'Changelog', link: '/changelog' }
				]
			}
		]
	}
});
