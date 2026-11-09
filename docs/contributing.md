# Contributing

Open a pull request against `main`. A change that alters a screen also changes this manual, in the same pull request.

## Rules of the code

- Code, comments, commit messages and this manual are in English.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat: add a filter to the map`.
- Run `bun run check`, `bun run build` and `bun run docs:build` before you push. CI runs the three on every pull request.
- Text on screen goes through `m('key')` in `src/lib/i18n/messages.ts`, in every locale. TypeScript refuses a key with a language missing.
- The PocketBase schema is defined once, in `src/lib/server/setup.ts`.
- Colors come from tokens, as in `var(--accent)`. See [Design system](./design-system.md).
- Nothing from one country enters the code: a deployment is [configuration and content](./configure.md).

## Where the manual lives

The manual is the `docs/` folder of this repository: one Markdown page per screen or feature, with the sidebar in `docs/.vitepress/config.mts`. Each push to `main` publishes it on GitHub Pages.

```bash
bun run docs:dev       # the manual, with live reload
bun run docs:build     # the site, which fails on a broken link
bun run docs:preview   # the built site
```

## The screens

The pictures in `docs/public/screens` come from scripts, one for each page of the manual, in `e2e/shots`. Each picture has one assertion: the text the manual describes is on the screen before the picture is taken, so that a screen that changes breaks its script. Pictures are committed, and CI does not run the scripts.

To retake them, bring the stack up and run:

```bash
bun run dev      # in one terminal
bun run shots    # in another; once per machine: bunx playwright install chromium
```

`bun run shots` runs against an empty database, or one it created itself. It goes through the setup wizard and erases what the stack holds, and it refuses a database with someone else's project: `bun run db:reset --yes` empties that one.

Commit the pictures that changed with the page that describes them.
