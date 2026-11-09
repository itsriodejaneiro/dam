# Introduction

The Digital Assets Map (DAM) is an interactive map of a country's digital infrastructure: its agencies, public services, domains, hosting, code, credentials and the people who hold them. It shows what depends on what, and who answers for it. It is the international version of the *Mapa da Informação* (ITS Rio, 2018), and any country can deploy it.

![The home page of a deployment](/screens/getting-around-1.png)

## Who this manual is for

| You | Start at |
|---|---|
| explore a map someone published | [Getting around](./getting-around.md), [The map](./map.md), [Journeys for visitors](./journeys.md) |
| keep a map's content up to date | [Sign in](./sign-in.md), [Entities](./entities.md), [Writing a journey](./writing-a-journey.md) |
| install the map for a country | [Install](./install.md), [Configure your deployment](./configure.md), [Accounts](./accounts.md) |
| improve the code or this manual | [Contributing](./contributing.md) |

## The words the map uses

| Word | What it is |
|---|---|
| **Entity** | one piece of the infrastructure: an agency, a service, a domain, a server, a repository, a credential, a person |
| **Category** | the kind of an entity. Each category is a horizontal layer of the map and has a color |
| **Connection** | a real dependency between two entities: hosting, custody, authorship, accountability |
| **Map** | a selection of entities drawn as a graph. A deployment has a main map and can have more |
| **Journey** | a process told step by step over a map, grouped in phases, with the documents a person gathers along the way |
| **Deployment** | one installation: its own app and its own PocketBase, for one country, city or sector |

## How a deployment works

Each deployment runs its own app, a SvelteKit site, and its own [PocketBase](https://pocketbase.io), which holds the data and the accounts. What identifies a deployment is configuration and content, kept in that PocketBase and edited in the app: a new country changes no code.

A new deployment starts from an example: a fictional public portal with eight entities, ten connections and one journey. Edit it to learn its shape, then replace it with your own.
