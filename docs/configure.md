# Configure your deployment

`/admin/settings` holds the identity of a deployment: its name, languages, theme and mark. What you save shows at once, with no new deploy. The [setup wizard](./install.md#the-setup-wizard) writes the same fields the first time.

![The settings form](/screens/configure-1.png)

## The fields

| Field | What it does |
|---|---|
| **Languages** | the languages the site offers, out of Português, English, Français and Español. Choose at least one, and mark one as **Default**: the site opens in it |
| **Name** | the country, city or sector being mapped, in each language. It completes the texts of the home page and of the map ("of the digital infrastructure of …"). Left blank, the map uses generic texts |
| **Theme** | the color set of the site: `legacy`, `green` or `orange`. To create another, see [Add a theme](./add-a-theme.md) |
| **Flag** | a two-letter ISO country code. The flag appears beside the title in the header, and as the browser tab's icon |
| **Logo** | PNG, JPEG, WebP or SVG, up to 400 KB. It takes the flag's place when there are both |
| **Show the journeys** | shows or hides the [journeys](./journeys.md). Off, the link leaves the header and `/journeys` returns to the home page |

## Content in several languages

Every text you write has one line per language of the deployment: the labels of entities, categories and maps, and the texts of a journey. A language left blank falls back to the next one, and the lists mark that text with a `~`.

Adding a language later adds its lines to every form, and the old content waits for its translation.

## What stays in `.env`

Addresses, ports and the superuser's credentials. See [Install](./install.md#the-env-file).
