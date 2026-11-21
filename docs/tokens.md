# API tokens

`/admin/tokens` holds the tokens that let an AI agent, such as Claude Code, Codex or Cursor, read and edit this map through the API. Any admin creates and deletes them; a token belongs to the deployment, not to the person who created it, so it keeps working when that person leaves.

![The list of tokens](/screens/tokens-2.png)

## What a token does

A token does everything the API does: it reads the map and the journeys' edit, saves categories, maps, entities, their positions and connections, writes journeys and their steps, publishes a journey, deletes any of those, and changes the deployment's settings except the flag and the logo. There are no scopes. What it never does: manage accounts or other tokens, upload files, change the schema or run the setup.

Entities, connections, categories and maps an agent saves go live on the public site at once, as if someone had saved them in the admin. A journey is different: the agent writes its edit, which only admins see, and the public copy changes only when the agent calls `publish_journey`, after you have looked at the preview in [Journeys](./writing-a-journey.md) and said yes in the conversation.

What an agent reads, the people of the map included, goes to the provider of its model. Whoever connects the agent answers for that.

## Create a token

**New token** asks for a **Name**: who or what will use it, such as a person, a team or a script. **Create** shows the token once, with **Copy**, beside the MCP address the agent connects to. The server keeps only a fingerprint of the token: close the dialog and it is gone, so copy it first. The next step is in [Connect an agent](./connect-an-agent.md).

![The token, shown once](/screens/tokens-1.png)

## The list

Each row shows the token's name, its first characters, who created it and when, and its last use. **writes** opens what that token wrote: one line per write, with the tool, the record and the content the write replaced, so a wrong edit can be put back by hand. Creating and deleting a token are in that same list, with the account that did it.

## Delete a token

**remove**, after a confirmation, deletes the token: the agent's next request answers 401, and nothing it wrote changes. The lines of its writes stay, under its name and prefix. A token has no expiry: deleting it is how its access ends. To rotate one, create the new token, move the agent to it, then delete the old one.

## Limits

A token makes up to 120 requests a minute; above that the API answers 429 with how long to wait. One call saves up to 50 entities or 200 connections.
