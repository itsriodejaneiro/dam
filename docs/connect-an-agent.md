# Connect an agent

An AI agent connects to a deployment through its MCP server, at `https://<app>/api/v1/mcp`, with a [token](./tokens.md) in the header `Authorization: Bearer <token>`. MCP is the protocol Claude Code, Codex and Cursor use to discover and call tools: the agent reads the list of tools and their descriptions, and from a spreadsheet or a document it saves categories, entities, connections and journeys, as [the manual's editing pages](./entities.md) describe by hand.

![The token and the MCP address, shown once when the token is created](/screens/tokens-1.png)

## Before you connect

- **Give the agent only these tools.** The recipe recommended below runs the agent with the map's tools and nothing else: no terminal, no web, no other MCP servers. A document the agent reads can carry instructions meant for it; with no other tool, those instructions have nowhere to go.
- **What the agent reads goes to its model's provider**, the people of the map included. Whoever connects the agent answers for that.
- **What it saves goes live at once**, except journeys, which stay in their edit until `publish_journey`. The agent is told to point you to the preview and ask before publishing. Every write is recorded, with what it replaced, under **writes** in [API tokens](./tokens.md).
- **Keep the token out of files in a repository.** The recipes below put it in an environment variable or in a file of your own account.

## The recipes

The address below is the one the token dialog shows; `<token>` is the token itself, and `DAM_API_TOKEN` an environment variable that holds it.

### Claude Code, with the map's tools only

A file, `dam.json`, with this server alone; Claude Code expands the variable:

```json
{
  "mcpServers": {
    "dam": {
      "type": "http",
      "url": "https://<app>/api/v1/mcp",
      "headers": { "Authorization": "Bearer ${DAM_API_TOKEN}" }
    }
  }
}
```

```sh
export DAM_API_TOKEN="<token>"
claude --tools "" --strict-mcp-config --mcp-config dam.json --allowedTools "mcp__dam"
```

`--tools ""` turns off Claude Code's own tools (terminal, web, files, subagents); `--strict-mcp-config` uses only the servers of `--mcp-config` and leaves out the ones of your account. `--allowedTools` only spares the permission question on each call.

### Claude Code, added to a session

```sh
claude mcp add --transport http dam https://<app>/api/v1/mcp --header "Authorization: Bearer <token>"
```

The default scope is the folder where the command runs, and `--scope user` is every folder; use one of the two rather than `--scope project`, which writes the token to the repository's `.mcp.json`.

### Codex

In `~/.codex/config.toml`, with the token in the environment variable:

```toml
[mcp_servers.dam]
url = "https://<app>/api/v1/mcp"
bearer_token_env_var = "DAM_API_TOKEN"
```

### Cursor, and other clients with `mcpServers` in JSON

In `~/.cursor/mcp.json`, which applies to every project, or `.cursor/mcp.json` for one:

```json
{ "mcpServers": { "dam": { "url": "https://<app>/api/v1/mcp", "headers": { "Authorization": "Bearer <token>" } } } }
```

Cursor expands `${env:DAM_API_TOKEN}` in `headers`; other clients may not, so keep that file in your own account, outside any repository.

### Any HTTP client

The server speaks JSON-RPC over HTTP: one POST per request, JSON back. To see the tools:

```sh
curl https://<app>/api/v1/mcp \
  -H "Authorization: Bearer $DAM_API_TOKEN" -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## What the agent can do

| Tool | What it does |
|---|---|
| `get_deployment` | the settings, the locales, the categories and the maps: where the agent starts |
| `get_settings`, `list_entities`, `get_entity`, `list_connections`, `list_journeys`, `get_journey` | reads the settings, the map and the journeys' edit |
| `save_category`, `save_map`, `save_settings` | the lanes of the map, the maps and the deployment's identity (not the flag or logo) |
| `save_entities` | up to 50 entities a call, each whole: category, texts per language, links, maps; with no id, an entity of the same category and label is updated, so a spreadsheet can run twice |
| `place_entities`, `save_connections` | positions on a map, and up to 200 connections a call |
| `save_journey`, `save_journey_steps` | a journey's edit and the whole list of its steps, each with the entities it highlights |
| `publish_journey` | copies the edit to the public site, after you said yes |
| `delete_entity`, `delete_connection`, `delete_category`, `delete_map`, `delete_journey` | deletes, under the same rules as the admin screens |

A good first prompt names the source and the categories: "Read this spreadsheet; each row is an entity of the category in column A, on the main map; connect each one to the agency in column D."

## Out of reach

The connectors of claude.ai and ChatGPT ask for OAuth, which the map does not offer: use a client that takes a fixed token, like the ones above.
