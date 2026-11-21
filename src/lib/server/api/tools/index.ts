/* The registry of the tools and the guide the MCP server hands the agent. */
import { READ_TOOLS } from './read';
import type { Tool } from './types';

export type { Tool, ToolContext } from './types';
export { ToolError } from './types';

export const TOOLS: Tool[] = [...READ_TOOLS];

export const toolByName = (name: string): Tool | undefined => TOOLS.find((t) => t.name === name);

export const SERVER = { name: 'dam', title: 'Digital Assets Map', version: '1' };

/** What the agent reads once, with the list of tools. */
export const INSTRUCTIONS = [
	'This server edits a Digital Assets Map: entities (the nodes of a map of digital infrastructure), the connections between them, categories, maps and the guided journeys over a map.',
	'Start with get_deployment: it gives the locales (every text is an object per locale code, and only those locales are accepted), the categories and the maps, and the main map, which is first.',
	'Entities, connections, categories and maps go live on the public site the moment they are saved. A journey is different: the tools write its edit, and the public copy changes only with publish_journey, after the person has looked at the preview in /admin/journeys and said yes.',
	'Saving is safe to repeat: with an existing id, save_* updates; with no id, save_entities finds an entity of the same category and label in the default locale, and save_connections finds the same pair.',
	'Every write is recorded with what it replaced; an error comes back as a result with isError and a message that says what to fix.'
].join(' ');
