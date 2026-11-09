# Add a theme

A theme, or pack, is a set of colors a deployment chooses in [Settings](./configure.md). Each pack has a light and a dark mode.

1. Copy `src/lib/styles/themes/legacy.css` to a new file named after the pack, and change the values. Keep every token, in both modes: the chrome tokens, the eight `--node-slot-N` of the entities and the three `--status-*`.
2. Replace `legacy` with the name of your pack in the file's selectors.
3. Import the file in `src/lib/styles/themes/index.css`.
4. Add the name to `PACKS` in `src/lib/theme.ts` and to `KNOWN` in `src/app.html`.
5. Run `bun run db:setup` to add the name to the options of the `theme` field.

The pack then appears under **Theme** in the settings, and in the [design system page](./design-system.md).
