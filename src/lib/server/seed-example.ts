/* The example a new project starts from: a fictional digital infrastructure with one node
   per base category, the connections among them and a journey through them, in every
   supported locale. A person learns the shape of a node, a connection and a journey by
   editing it, so it names no real place or organization. seedBaseData (setup.ts) writes
   it in the deploy's locales. Relative imports only: the CLI runs outside Vite. */

import type { LocaleCode } from '../i18n/messages';

export type Translated<T = string> = Record<LocaleCode, T>;

export type ExampleNodeKey =
	| 'agency'
	| 'service'
	| 'domain'
	| 'hosting'
	| 'environment'
	| 'repository'
	| 'credential'
	| 'person';

export interface ExampleNode {
	key: ExampleNodeKey;
	/** Index in BASE_CATEGORIES for the node's type. */
	category: number;
	/** Saved position across the map; the height comes from the category's lane. */
	x: number;
	labels: Translated<{ label: string; label_full: string; description: string }>;
}

export interface ExamplePhase {
	number: number;
	title: Translated;
	summary: Translated;
	/** Ids of the documents needed for what comes after the phase. */
	needed: string[];
}

export interface ExampleDocument {
	id: string;
	label: Translated;
	abbrev: Translated;
	/** Index in `steps` of the step where it appears. null = the reader starts with it. */
	atStep: number | null;
}

export interface ExampleStep {
	phase: number;
	/** The nodes it highlights: the connections among them light up with them. */
	nodes: ExampleNodeKey[];
	title: Translated;
	body: Translated;
	duration: Translated | null;
}

export const EXAMPLE_NODES: ExampleNode[] = [
	{
		key: 'agency',
		category: 0,
		x: 320,
		labels: {
			pt: {
				label: 'Órgão de Exemplo',
				label_full: 'Órgão de Exemplo de Serviços Digitais',
				description:
					'O órgão público que responde por um serviço digital. Troque o nome e a descrição para começar o seu mapa.'
			},
			en: {
				label: 'Example Agency',
				label_full: 'Example Agency for Digital Services',
				description:
					'The public body that answers for a digital service. Change its name and description to start your own map.'
			},
			fr: {
				label: 'Organisme exemple',
				label_full: 'Organisme exemple des services numériques',
				description:
					"L'organisme public qui répond d'un service numérique. Changez son nom et sa description pour commencer votre carte."
			},
			es: {
				label: 'Organismo de Ejemplo',
				label_full: 'Organismo de Ejemplo de Servicios Digitales',
				description:
					'El organismo público que responde por un servicio digital. Cambie su nombre y su descripción para empezar su mapa.'
			}
		}
	},
	{
		key: 'service',
		category: 1,
		x: 640,
		labels: {
			pt: {
				label: 'Portal público',
				label_full: 'Portal de serviços públicos',
				description:
					'O site pelo qual as pessoas chegam aos serviços do órgão. Um serviço é a parte da infraestrutura que o público vê.'
			},
			en: {
				label: 'Public portal',
				label_full: 'Public services portal',
				description:
					"The website people use to reach the agency's services. A service is the part of the infrastructure the public sees."
			},
			fr: {
				label: 'Portail public',
				label_full: 'Portail des services publics',
				description:
					"Le site par lequel le public accède aux services de l'organisme. Un service est la partie de l'infrastructure que le public voit."
			},
			es: {
				label: 'Portal público',
				label_full: 'Portal de servicios públicos',
				description:
					'El sitio por el que las personas acceden a los servicios del organismo. Un servicio es la parte de la infraestructura que el público ve.'
			}
		}
	},
	{
		key: 'domain',
		category: 2,
		x: 900,
		labels: {
			pt: {
				label: 'portal.example',
				label_full: 'Domínio do portal público',
				description:
					'O endereço que leva ao portal. Quem controla o domínio decide aonde o público chega.'
			},
			en: {
				label: 'portal.example',
				label_full: 'Domain of the public portal',
				description:
					'The address that leads to the portal. Whoever controls the domain decides where the public ends up.'
			},
			fr: {
				label: 'portal.example',
				label_full: 'Domaine du portail public',
				description:
					"L'adresse qui mène au portail. Qui contrôle le domaine décide où arrive le public."
			},
			es: {
				label: 'portal.example',
				label_full: 'Dominio del portal público',
				description:
					'La dirección que lleva al portal. Quien controla el dominio decide adónde llega el público.'
			}
		}
	},
	{
		key: 'hosting',
		category: 3,
		x: 640,
		labels: {
			pt: {
				label: 'Data center compartilhado',
				label_full: 'Data center compartilhado entre órgãos',
				description:
					'As máquinas em que o portal roda e os seus dados ficam guardados. Se elas param, o serviço para.'
			},
			en: {
				label: 'Shared data center',
				label_full: 'Data center shared among agencies',
				description:
					'The machines where the portal runs and its data is kept. If they stop, the service stops.'
			},
			fr: {
				label: 'Centre de données mutualisé',
				label_full: 'Centre de données mutualisé entre organismes',
				description:
					"Les machines sur lesquelles le portail fonctionne et où ses données sont conservées. Si elles s'arrêtent, le service s'arrête."
			},
			es: {
				label: 'Centro de datos compartido',
				label_full: 'Centro de datos compartido entre organismos',
				description:
					'Las máquinas en las que funciona el portal y se guardan sus datos. Si se detienen, el servicio se detiene.'
			}
		}
	},
	{
		key: 'environment',
		category: 4,
		x: 420,
		labels: {
			pt: {
				label: 'Ambiente de testes',
				label_full: 'Ambiente de testes do portal',
				description:
					'Onde novas versões do portal são preparadas e testadas antes de chegar ao público.'
			},
			en: {
				label: 'Test environment',
				label_full: 'Test environment of the portal',
				description:
					'Where new versions of the portal are prepared and tested before reaching the public.'
			},
			fr: {
				label: 'Environnement de test',
				label_full: 'Environnement de test du portail',
				description:
					"Où les nouvelles versions du portail sont préparées et testées avant d'arriver au public."
			},
			es: {
				label: 'Entorno de pruebas',
				label_full: 'Entorno de pruebas del portal',
				description:
					'Donde las nuevas versiones del portal se preparan y se prueban antes de llegar al público.'
			}
		}
	},
	{
		key: 'repository',
		category: 5,
		x: 640,
		labels: {
			pt: {
				label: 'Código do portal',
				label_full: 'Repositório de código do portal',
				description:
					'O código do portal e o histórico das mudanças. Sem ele, ninguém consegue corrigir ou refazer o serviço.'
			},
			en: {
				label: 'Portal code',
				label_full: 'Code repository of the portal',
				description:
					'The code of the portal and its history of changes. Without it, nobody can fix or rebuild the service.'
			},
			fr: {
				label: 'Code du portail',
				label_full: 'Dépôt de code du portail',
				description:
					"Le code du portail et l'historique de ses modifications. Sans lui, personne ne peut corriger ou reconstruire le service."
			},
			es: {
				label: 'Código del portal',
				label_full: 'Repositorio de código del portal',
				description:
					'El código del portal y el historial de sus cambios. Sin él, nadie puede corregir ni reconstruir el servicio.'
			}
		}
	},
	{
		key: 'credential',
		category: 6,
		x: 860,
		labels: {
			pt: {
				label: 'Conta de administrador',
				label_full: 'Conta de administrador do portal',
				description:
					'O acesso que abre o código e os servidores. Precisa ser registrado, renovado e repassado.'
			},
			en: {
				label: 'Administrator account',
				label_full: 'Administrator account of the portal',
				description:
					'The login that opens the code and the servers. It must be recorded, renewed and handed over.'
			},
			fr: {
				label: 'Compte administrateur',
				label_full: 'Compte administrateur du portail',
				description:
					"L'accès qui ouvre le code et les serveurs. Il doit être consigné, renouvelé et transmis."
			},
			es: {
				label: 'Cuenta de administrador',
				label_full: 'Cuenta de administrador del portal',
				description:
					'El acceso que abre el código y los servidores. Debe registrarse, renovarse y traspasarse.'
			}
		}
	},
	{
		key: 'person',
		category: 7,
		x: 320,
		labels: {
			pt: {
				label: 'Pessoa responsável',
				label_full: 'Pessoa responsável pelo portal',
				description:
					'Quem guarda as credenciais hoje. Quando essa pessoa sai, o acesso precisa ficar com o órgão.'
			},
			en: {
				label: 'Technical lead',
				label_full: 'Technical lead of the portal',
				description:
					'The person who holds the credentials today. When this person leaves, the access must stay with the agency.'
			},
			fr: {
				label: 'Responsable technique',
				label_full: 'Responsable technique du portail',
				description:
					"La personne qui détient aujourd'hui les identifiants. Quand elle part, les accès doivent rester à l'organisme."
			},
			es: {
				label: 'Persona responsable',
				label_full: 'Persona responsable del portal',
				description:
					'Quien guarda hoy las credenciales. Cuando esa persona se va, el acceso debe quedar en el organismo.'
			}
		}
	}
];

export const EXAMPLE_EDGES: [source: ExampleNodeKey, target: ExampleNodeKey][] = [
	['agency', 'service'],
	['service', 'domain'],
	['service', 'hosting'],
	['domain', 'hosting'],
	['hosting', 'environment'],
	['environment', 'repository'],
	['repository', 'credential'],
	['hosting', 'credential'],
	['credential', 'person'],
	['agency', 'person']
];

const phases: ExamplePhase[] = [
	{
		number: 1,
		title: { pt: 'O serviço', en: 'The service', fr: 'Le service', es: 'El servicio' },
		summary: {
			pt: 'O público chega ao serviço por um domínio que o órgão precisa controlar.',
			en: 'The public reaches the service through a domain the agency must control.',
			fr: "Le public accède au service par un domaine que l'organisme doit contrôler.",
			es: 'El público llega al servicio por un dominio que el organismo debe controlar.'
		},
		needed: ['domain-record']
	},
	{
		number: 2,
		title: {
			pt: 'Onde ele roda',
			en: 'Where it runs',
			fr: 'Où il fonctionne',
			es: 'Dónde funciona'
		},
		summary: {
			pt: 'O serviço depende da hospedagem, de um ambiente de testes e do código: três lugares para acompanhar.',
			en: 'The service depends on hosting, a test environment and its code: three places to keep track of.',
			fr: "Le service dépend de l'hébergement, d'un environnement de test et du code : trois endroits à suivre.",
			es: 'El servicio depende del alojamiento, de un entorno de pruebas y del código: tres lugares que seguir.'
		},
		needed: []
	},
	{
		number: 3,
		title: {
			pt: 'Quem guarda as chaves',
			en: 'Who holds the keys',
			fr: 'Qui détient les clés',
			es: 'Quién guarda las llaves'
		},
		summary: {
			pt: 'Toda camada termina numa pessoa. Agora edite esta jornada, ou apague-a e escreva a sua.',
			en: 'Every layer ends in a person. Now edit this journey, or delete it and write your own.',
			fr: 'Chaque couche aboutit à une personne. Modifiez maintenant ce parcours, ou supprimez-le et écrivez le vôtre.',
			es: 'Cada capa termina en una persona. Ahora edite este recorrido, o bórrelo y escriba el suyo.'
		},
		needed: []
	}
];

const documents: ExampleDocument[] = [
	{
		id: 'service-charter',
		label: {
			pt: 'Carta de serviço',
			en: 'Service charter',
			fr: 'Charte du service',
			es: 'Carta de servicio'
		},
		abbrev: { pt: 'Carta', en: 'Charter', fr: 'Charte', es: 'Carta' },
		atStep: null
	},
	{
		id: 'domain-record',
		label: {
			pt: 'Registro do domínio',
			en: 'Domain record',
			fr: 'Enregistrement du domaine',
			es: 'Registro del dominio'
		},
		abbrev: { pt: 'Domínio', en: 'Domain', fr: 'Domaine', es: 'Dominio' },
		atStep: 1
	},
	{
		id: 'access-list',
		label: {
			pt: 'Lista de acessos',
			en: 'Access list',
			fr: 'Liste des accès',
			es: 'Lista de accesos'
		},
		abbrev: { pt: 'Acessos', en: 'Access', fr: 'Accès', es: 'Accesos' },
		atStep: 5
	}
];

const steps: ExampleStep[] = [
	{
		phase: 1,
		nodes: ['agency', 'service'],
		title: {
			pt: 'Um órgão responde pelo serviço',
			en: 'An agency answers for the service',
			fr: 'Un organisme répond du service',
			es: 'Un organismo responde por el servicio'
		},
		body: {
			pt: '<p>Toda jornada começa por quem responde por ela. Aqui, um órgão fictício mantém um portal público. A conexão em destaque é uma das que você pode abrir e editar no admin.</p>',
			en: '<p>Every journey starts with who answers for it. Here, a fictional agency runs a public portal. The highlighted connection is one you can open and edit in the admin.</p>',
			fr: "<p>Tout parcours commence par celui qui en répond. Ici, un organisme fictif gère un portail public. La connexion en surbrillance peut être ouverte et modifiée dans l'administration.</p>",
			es: '<p>Todo recorrido empieza por quien responde por él. Aquí, un organismo ficticio mantiene un portal público. La conexión resaltada se puede abrir y editar en la administración.</p>'
		},
		duration: null
	},
	{
		phase: 1,
		nodes: ['service', 'domain'],
		title: {
			pt: 'O portal responde num domínio',
			en: 'The portal answers at a domain',
			fr: 'Le portail répond sur un domaine',
			es: 'El portal responde en un dominio'
		},
		body: {
			pt: '<p>O público chega ao portal por um endereço. Guarde o registro do domínio: quem o tem decide aonde esse endereço leva.</p>',
			en: '<p>The public reaches the portal through an address. Keep the domain record: whoever holds it decides where that address leads.</p>',
			fr: "<p>Le public accède au portail par une adresse. Conservez l'enregistrement du domaine : qui le détient décide où mène cette adresse.</p>",
			es: '<p>El público llega al portal por una dirección. Guarde el registro del dominio: quien lo tiene decide adónde lleva esa dirección.</p>'
		},
		duration: { pt: '1 dia', en: '1 day', fr: '1 jour', es: '1 día' }
	},
	{
		phase: 2,
		nodes: ['service', 'domain', 'hosting'],
		title: {
			pt: 'O domínio aponta para os servidores',
			en: 'The domain points to the servers',
			fr: 'Le domaine pointe vers les serveurs',
			es: 'El dominio apunta a los servidores'
		},
		body: {
			pt: '<p>Atrás do endereço estão as máquinas que mantêm o portal no ar. A câmera enquadra todos os nós em destaque no passo: você escolhe os nós, ela faz o enquadramento.</p>',
			en: '<p>Behind the address are the machines that keep the portal running. The camera frames every node highlighted in the step: you choose the nodes, it does the framing.</p>',
			fr: "<p>Derrière l'adresse se trouvent les machines qui font fonctionner le portail. La caméra cadre tous les nœuds en surbrillance de l'étape : vous choisissez les nœuds, elle fait le cadrage.</p>",
			es: '<p>Detrás de la dirección están las máquinas que mantienen el portal en marcha. La cámara encuadra todos los nodos resaltados del paso: usted elige los nodos y ella hace el encuadre.</p>'
		},
		duration: null
	},
	{
		phase: 2,
		nodes: ['hosting', 'environment'],
		title: {
			pt: 'Novas versões passam por um ambiente de testes',
			en: 'New versions pass through a test environment',
			fr: 'Les nouvelles versions passent par un environnement de test',
			es: 'Las nuevas versiones pasan por un entorno de pruebas'
		},
		body: {
			pt: '<p>Antes de chegar ao público, uma mudança é preparada e testada num ambiente separado, ligado à hospedagem.</p>',
			en: '<p>Before reaching the public, a change is prepared and tried out in a separate environment connected to the hosting.</p>',
			fr: "<p>Avant d'arriver au public, une modification est préparée et essayée dans un environnement séparé, relié à l'hébergement.</p>",
			es: '<p>Antes de llegar al público, un cambio se prepara y se prueba en un entorno separado, conectado al alojamiento.</p>'
		},
		duration: { pt: '2 dias', en: '2 days', fr: '2 jours', es: '2 días' }
	},
	{
		phase: 2,
		nodes: ['environment', 'repository'],
		title: {
			pt: 'O ambiente parte do código',
			en: 'The environment builds from the code',
			fr: "L'environnement part du code",
			es: 'El entorno parte del código'
		},
		body: {
			pt: '<p>O que roda nos servidores vem de um repositório. Se o código se perde, o serviço deixa de ter conserto.</p>',
			en: '<p>What runs on the servers comes from a repository. If the code is lost, the service can no longer be fixed.</p>',
			fr: "<p>Ce qui tourne sur les serveurs provient d'un dépôt. Si le code est perdu, le service ne peut plus être réparé.</p>",
			es: '<p>Lo que funciona en los servidores viene de un repositorio. Si el código se pierde, el servicio ya no tiene arreglo.</p>'
		},
		duration: null
	},
	{
		phase: 3,
		nodes: ['repository', 'hosting', 'credential'],
		title: {
			pt: 'Uma credencial abre o código e os servidores',
			en: 'One credential opens the code and the servers',
			fr: 'Un identifiant ouvre le code et les serveurs',
			es: 'Una credencial abre el código y los servidores'
		},
		body: {
			pt: '<p>Uma única conta alcança duas camadas de uma vez. Anote-a na lista de acessos: um documento obtido no caminho aparece no inventário ao lado da jornada.</p>',
			en: '<p>A single account reaches two layers at once. Write it in the access list: a document collected along the way appears in the inventory beside the journey.</p>',
			fr: "<p>Un seul compte atteint deux couches à la fois. Notez-le dans la liste des accès : un document obtenu en chemin apparaît dans l'inventaire à côté du parcours.</p>",
			es: '<p>Una sola cuenta alcanza dos capas a la vez. Anótela en la lista de accesos: un documento obtenido por el camino aparece en el inventario junto al recorrido.</p>'
		},
		duration: { pt: '1 semana', en: '1 week', fr: '1 semaine', es: '1 semana' }
	},
	{
		phase: 3,
		nodes: ['credential', 'person'],
		title: {
			pt: 'Toda credencial leva a uma pessoa',
			en: 'Every credential leads to a person',
			fr: 'Chaque identifiant mène à une personne',
			es: 'Toda credencial lleva a una persona'
		},
		body: {
			pt: '<p>Alguém guarda esse acesso hoje. Dar nome a essa pessoa é a razão de ser do mapa.</p>',
			en: '<p>Someone holds this access today. Putting a name to that person is what the map is for.</p>',
			fr: "<p>Quelqu'un détient cet accès aujourd'hui. Mettre un nom sur cette personne, c'est la raison d'être de la carte.</p>",
			es: '<p>Alguien guarda hoy este acceso. Poner nombre a esa persona es la razón de ser del mapa.</p>'
		},
		duration: null
	},
	{
		phase: 3,
		nodes: ['agency', 'person'],
		title: {
			pt: 'E a pessoa responde ao órgão',
			en: 'And the person answers to the agency',
			fr: "Et la personne répond à l'organisme",
			es: 'Y la persona responde al organismo'
		},
		body: {
			pt: '<p>A cadeia fecha onde começou. Se o órgão não sabe dizer quem guarda as suas chaves, ele não controla o serviço.</p>',
			en: '<p>The chain closes where it began. If the agency cannot say who holds its keys, it does not control its service.</p>',
			fr: "<p>La chaîne se referme là où elle a commencé. Si l'organisme ne peut pas dire qui détient ses clés, il ne contrôle pas son service.</p>",
			es: '<p>La cadena se cierra donde empezó. Si el organismo no sabe decir quién guarda sus llaves, no controla su servicio.</p>'
		},
		duration: null
	}
];

export const EXAMPLE_JOURNEY = {
	slug: 'example-journey',
	title: {
		pt: 'Quem guarda as chaves de um serviço digital',
		en: 'Who holds the keys of a digital service',
		fr: "Qui détient les clés d'un service numérique",
		es: 'Quién guarda las llaves de un servicio digital'
	} satisfies Translated,
	description: {
		pt: 'Uma jornada de exemplo: siga um portal público fictício, do órgão que responde por ele até a pessoa que guarda os acessos. Edite-a ou apague-a no admin.',
		en: 'An example journey: follow a fictional public portal from the agency that answers for it to the person who holds its access. Edit or delete it in the admin.',
		fr: "Un parcours d'exemple : suivez un portail public fictif, de l'organisme qui en répond à la personne qui détient ses accès. Modifiez-le ou supprimez-le dans l'administration.",
		es: 'Un recorrido de ejemplo: siga un portal público ficticio, desde el organismo que responde por él hasta la persona que guarda sus accesos. Edítelo o bórrelo en la administración.'
	} satisfies Translated,
	phases,
	documents,
	steps
};
