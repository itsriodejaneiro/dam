# Changelog

All notable changes to the Digital Assets Map are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 0.1.0 - 2026-11-12

The first release of the Digital Assets Map: the international version of ITS Rio's *Mapa da Informação* (2018), ready for any country to deploy.

### Added

- The map: entities in hierarchical layers, one colour per category, with their connections; a panel per entity and a direct link to it.
- Journeys: processes told over the map step by step, with phases, camera and highlights; an editor in the admin that publishes a journey as a frozen copy, so one on the air can be edited without visitors seeing it.
- The home in blocks: rich text, image, link cards and partner logos on white squares, edited in the admin in every language and published the same way.
- Everything editable in the admin: entities, connections, categories, maps, journeys, the home, the deployment's settings (name, languages, theme, logo, flag) and the accounts with the admin role.
- Four languages in the interface (English, French, Portuguese, Spanish) and any subset per deployment; four install paths (by hand, Docker, Dokploy, the published images), each ending at `/setup`, which creates the schema and seeds an example map and journey.
- Security headers on every response, a content security policy with nonces, rate-limited sign-in, and HTML from the database cleaned by an allowlist.
- Three theme packs (legacy, green, orange), each in light and dark mode.
- The manual, with screens taken from the app itself.
