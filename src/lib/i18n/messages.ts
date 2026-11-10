/**
 * Central dictionary of UI strings.
 *
 * Key convention: `namespace.subkey` in lowercase snake_case. Organize by
 * functional domain (common, nav, entities, node, edge, map, ...), not by
 * file. Shared messages live in `common.*`.
 *
 * Supported locales: see `LocaleCode`. The `satisfies` at the end REQUIRES every
 * key to have ALL languages: a missing translation is a compile error
 * (the guardrail standing in for an i18n framework while the dictionary holds up).
 * To add a language: include it in `LocaleCode` and fill it in on every key
 * (TypeScript lists exactly what is missing).
 *
 * For simple interpolation use `{0}`, `{1}` etc. and pass args via `m('key', a, b)`.
 * French uses double quotes because of apostrophes (l', d', qu').
 */

/** Languages with UI strings available: what a deploy can offer. */
export const LOCALE_CODES = ['pt', 'en', 'fr', 'es'] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

export const messages = {
	// ──────────────────────────────────────────────
	// COMMON
	// ──────────────────────────────────────────────
	'common.save': { pt: 'Salvar', en: 'Save', fr: 'Enregistrer', es: 'Guardar' },
	'common.cancel': { pt: 'Cancelar', en: 'Cancel', fr: 'Annuler', es: 'Cancelar' },
	'common.confirm': { pt: 'Confirmar', en: 'Confirm', fr: 'Confirmer', es: 'Confirmar' },
	'common.create': { pt: 'Criar', en: 'Create', fr: 'Créer', es: 'Crear' },
	'common.edit': { pt: 'Editar', en: 'Edit', fr: 'Modifier', es: 'Editar' },
	'common.edit_lower': { pt: 'editar', en: 'edit', fr: 'modifier', es: 'editar' },
	'common.remove': { pt: 'Remover', en: 'Remove', fr: 'Supprimer', es: 'Eliminar' },
	'common.remove_lower': { pt: 'remover', en: 'remove', fr: 'supprimer', es: 'eliminar' },
	'common.loading': { pt: 'Carregando…', en: 'Loading…', fr: 'Chargement…', es: 'Cargando…' },
	'common.search': { pt: 'Buscar', en: 'Search', fr: 'Rechercher', es: 'Buscar' },
	'common.clear_search': {
		pt: 'Limpar busca',
		en: 'Clear search',
		fr: 'Effacer la recherche',
		es: 'Limpiar búsqueda'
	},
	'common.all': { pt: 'Todas', en: 'All', fr: 'Toutes', es: 'Todas' },
	'common.select': { pt: 'Selecionar…', en: 'Select…', fr: 'Sélectionner…', es: 'Seleccionar…' },
	'common.close': { pt: 'Fechar', en: 'Close', fr: 'Fermer', es: 'Cerrar' },
	'common.move_up': { pt: 'Mover para cima', en: 'Move up', fr: 'Monter', es: 'Subir' },
	'common.move_down': { pt: 'Mover para baixo', en: 'Move down', fr: 'Descendre', es: 'Bajar' },
	'common.back_home': {
		pt: '← voltar ao início',
		en: '← back to home',
		fr: "← retour à l'accueil",
		es: '← volver al inicio'
	},
	'common.unknown': { pt: '?', en: '?', fr: '?', es: '?' },

	// ──────────────────────────────────────────────
	// NAV (SiteHeader)
	// ──────────────────────────────────────────────
	'nav.brand': { pt: 'Digital Assets Map', en: 'Digital Assets Map', fr: 'Digital Assets Map', es: 'Digital Assets Map' },
	'nav.start': { pt: 'início', en: 'start', fr: 'accueil', es: 'inicio' },
	'nav.map': { pt: 'mapas', en: 'maps', fr: 'cartes', es: 'mapas' },
	'nav.journeys': { pt: 'jornadas', en: 'journeys', fr: 'parcours', es: 'recorridos' },
	'nav.entities': { pt: 'entidades', en: 'entities', fr: 'entités', es: 'entidades' },
	'nav.connections': { pt: 'conexões', en: 'connections', fr: 'connexions', es: 'conexiones' },
	'nav.maps': { pt: 'mapas', en: 'maps', fr: 'cartes', es: 'mapas' },
	'nav.categories': { pt: 'categorias', en: 'categories', fr: 'catégories', es: 'categorías' },
	'nav.settings': { pt: 'configurações', en: 'settings', fr: 'paramètres', es: 'configuración' },
	'nav.accounts': { pt: 'contas', en: 'accounts', fr: 'comptes', es: 'cuentas' },
	'nav.locale': { pt: 'Idioma', en: 'Language', fr: 'Langue', es: 'Idioma' },
	'nav.menu_open': { pt: 'Abrir menu', en: 'Open menu', fr: 'Ouvrir le menu', es: 'Abrir menú' },
	'nav.menu_close': { pt: 'Fechar menu', en: 'Close menu', fr: 'Fermer le menu', es: 'Cerrar menú' },

	// ──────────────────────────────────────────────
	// META (AppMeta): short, the label sits in a 5rem column
	// ──────────────────────────────────────────────
	'meta.access': { pt: 'acesso', en: 'access', fr: 'accès', es: 'acceso' },
	'meta.admin': { pt: 'admin', en: 'admin', fr: 'admin', es: 'admin' },
	'meta.context': { pt: 'contexto', en: 'context', fr: 'contexte', es: 'contexto' },
	'meta.datavis': { pt: 'datavis', en: 'datavis', fr: 'dataviz', es: 'dataviz' },
	'meta.setup': { pt: 'setup', en: 'setup', fr: 'config', es: 'config' },
	'meta.showcase': { pt: 'showcase', en: 'showcase', fr: 'vitrine', es: 'vitrina' },

	// ──────────────────────────────────────────────
	// THEME (ThemeToggle) + AUTH (AuthButton)
	// ──────────────────────────────────────────────
	'theme.mode_dark': { pt: 'escuro', en: 'dark', fr: 'sombre', es: 'oscuro' },
	'theme.mode_light': { pt: 'claro', en: 'light', fr: 'clair', es: 'claro' },
	'theme.switch_pack': {
		pt: 'Trocar marca (atual: {0})',
		en: 'Switch theme pack (current: {0})',
		fr: 'Changer de thème (actuel : {0})',
		es: 'Cambiar tema (actual: {0})'
	},
	'theme.to_light': {
		pt: 'Mudar para tema claro',
		en: 'Switch to light theme',
		fr: 'Passer au thème clair',
		es: 'Cambiar al tema claro'
	},
	'theme.to_dark': {
		pt: 'Mudar para tema escuro',
		en: 'Switch to dark theme',
		fr: 'Passer au thème sombre',
		es: 'Cambiar al tema oscuro'
	},
	'auth.login': { pt: 'entrar', en: 'sign in', fr: 'connexion', es: 'entrar' },
	'auth.logout': { pt: 'desconectar', en: 'log out', fr: 'déconnexion', es: 'salir' },
	'auth.login_aria': { pt: 'Entrar', en: 'Sign in', fr: 'Se connecter', es: 'Iniciar sesión' },
	'auth.logout_aria': { pt: 'Desconectar', en: 'Log out', fr: 'Se déconnecter', es: 'Cerrar sesión' },
	'auth.logout_title': {
		pt: 'Desconectar?',
		en: 'Log out?',
		fr: 'Se déconnecter ?',
		es: '¿Cerrar sesión?'
	},
	'auth.logout_desc': {
		pt: 'Você precisará entrar novamente para acessar áreas restritas.',
		en: 'You will need to sign in again to access restricted areas.',
		fr: 'Vous devrez vous reconnecter pour accéder aux zones restreintes.',
		es: 'Necesitará iniciar sesión de nuevo para acceder a las áreas restringidas.'
	},
	'settings.menu': { pt: 'Configurações', en: 'Settings', fr: 'Paramètres', es: 'Configuración' },
	'settings.design_system': {
		pt: 'Design System',
		en: 'Design System',
		fr: 'Design System',
		es: 'Design System'
	},
	'settings.setup': { pt: 'Setup', en: 'Setup', fr: 'Setup', es: 'Setup' },
	'settings.title': { pt: 'Configurações', en: 'Settings', fr: 'Paramètres', es: 'Configuración' },
	'settings.lede': {
		pt: 'A identidade deste mapa: nome, idiomas, tema e marca. O que você salva aparece na hora, sem novo deploy.',
		en: 'The identity of this map: name, languages, theme and mark. What you save shows at once, with no new deploy.',
		fr: "L'identité de cette carte : nom, langues, thème et marque. Ce que vous enregistrez s'affiche aussitôt, sans nouveau déploiement.",
		es: 'La identidad de este mapa: nombre, idiomas, tema y marca. Lo que guarda aparece al instante, sin un nuevo despliegue.'
	},
	'settings.saved': {
		pt: 'Configurações salvas.',
		en: 'Settings saved.',
		fr: 'Paramètres enregistrés.',
		es: 'Configuración guardada.'
	},
	'settings.field.name': { pt: 'Nome', en: 'Name', fr: 'Nom', es: 'Nombre' },
	'settings.field.name_hint': {
		pt: 'O país, cidade ou setor mapeado, em cada idioma. Em branco, o mapa usa textos genéricos.',
		en: 'The country, city or sector being mapped, in each language. Left blank, the map uses generic texts.',
		fr: 'Le pays, la ville ou le secteur cartographié, dans chaque langue. Laissé vide, la carte utilise des textes génériques.',
		es: 'El país, ciudad o sector mapeado, en cada idioma. En blanco, el mapa usa textos genéricos.'
	},
	'settings.field.locales': { pt: 'Idiomas', en: 'Languages', fr: 'Langues', es: 'Idiomas' },
	'settings.field.default_locale': {
		pt: 'Padrão',
		en: 'Default',
		fr: 'Par défaut',
		es: 'Predeterminado'
	},
	'settings.field.theme': { pt: 'Tema', en: 'Theme', fr: 'Thème', es: 'Tema' },
	'settings.field.logo': { pt: 'Logotipo', en: 'Logo', fr: 'Logo', es: 'Logotipo' },
	'settings.field.logo_hint': {
		pt: 'PNG, JPEG, WebP ou SVG, até 400 KB. Vence a bandeira quando há os dois.',
		en: 'PNG, JPEG, WebP or SVG, up to 400 KB. Takes precedence over the flag.',
		fr: 'PNG, JPEG, WebP ou SVG, 400 Ko maximum. Prime sur le drapeau.',
		es: 'PNG, JPEG, WebP o SVG, hasta 400 KB. Prevalece sobre la bandera.'
	},
	'settings.field.logo_remove': {
		pt: 'Remover o logotipo',
		en: 'Remove the logo',
		fr: 'Supprimer le logo',
		es: 'Quitar el logotipo'
	},
	'settings.field.flag': { pt: 'Bandeira', en: 'Flag', fr: 'Drapeau', es: 'Bandera' },
	'settings.field.flag_hint': {
		pt: 'Código ISO de duas letras.',
		en: 'Two-letter ISO code.',
		fr: 'Code ISO à deux lettres.',
		es: 'Código ISO de dos letras.'
	},
	'settings.field.journeys': {
		pt: 'Mostrar as jornadas',
		en: 'Show the journeys',
		fr: 'Afficher les parcours',
		es: 'Mostrar los recorridos'
	},
	'settings.error.locales': {
		pt: 'Escolha ao menos um idioma e o padrão entre eles.',
		en: 'Choose at least one language, and the default among them.',
		fr: 'Choisissez au moins une langue, et la langue par défaut parmi elles.',
		es: 'Elija al menos un idioma, y el predeterminado entre ellos.'
	},
	'settings.error.theme': {
		pt: 'Tema desconhecido.',
		en: 'Unknown theme.',
		fr: 'Thème inconnu.',
		es: 'Tema desconocido.'
	},
	'settings.error.name': {
		pt: 'Nome inválido ou longo demais.',
		en: 'Invalid or overly long name.',
		fr: 'Nom non valide ou trop long.',
		es: 'Nombre no válido o demasiado largo.'
	},
	'settings.error.flag': {
		pt: 'Código de bandeira desconhecido.',
		en: 'Unknown flag code.',
		fr: 'Code de drapeau inconnu.',
		es: 'Código de bandera desconocido.'
	},
	'settings.error.logo': {
		pt: 'O logotipo precisa ser PNG, JPEG, WebP ou SVG, até 400 KB.',
		en: 'The logo must be PNG, JPEG, WebP or SVG, up to 400 KB.',
		fr: 'Le logo doit être au format PNG, JPEG, WebP ou SVG, 400 Ko maximum.',
		es: 'El logotipo debe ser PNG, JPEG, WebP o SVG, hasta 400 KB.'
	},
	'settings.error.save': {
		pt: 'Não foi possível salvar as configurações.',
		en: 'Could not save the settings.',
		fr: "Impossible d'enregistrer les paramètres.",
		es: 'No se pudo guardar la configuración.'
	},

	// ──────────────────────────────────────────────
	// DESIGN SYSTEM (/ds — showcase)
	// ──────────────────────────────────────────────
	'ds.hero_em': { pt: 'vivo', en: 'live', fr: 'vivant', es: 'vivo' },
	'ds.lede': {
		pt: 'Showcase dos componentes implementados.',
		en: 'Showcase of the implemented components.',
		fr: 'Vitrine des composants implémentés.',
		es: 'Vitrina de los componentes implementados.'
	},
	'ds.controls_hint': {
		pt: 'marca × claro/escuro — teste as 4 combinações',
		en: 'brand × light/dark — try all 4 combinations',
		fr: 'marque × clair/sombre — testez les 4 combinaisons',
		es: 'marca × claro/oscuro — pruebe las 4 combinaciones'
	},
	'ds.palette_title': { pt: 'Paleta', en: 'Palette', fr: 'Palette', es: 'Paleta' },
	'ds.palette_desc_a': {
		pt: '8 slots indexados por',
		en: '8 slots indexed by',
		fr: '8 emplacements indexés par',
		es: '8 espacios indexados por'
	},
	'ds.palette_desc_b': { pt: 'do', en: 'of', fr: 'du', es: 'del' },
	'ds.palette_desc_c': {
		pt: '. Tipo novo no PocketBase só precisa apontar pra um slot existente — nada de variável CSS por slug, nada de cor preta por engano.',
		en: '. A new type in PocketBase just needs to point to an existing slot — no per-slug CSS variable, no accidental black.',
		fr: '. Un nouveau type dans PocketBase doit seulement pointer vers un emplacement existant — pas de variable CSS par slug, pas de noir accidentel.',
		es: '. Un tipo nuevo en PocketBase solo necesita apuntar a un espacio existente — sin variable CSS por slug, sin negro accidental.'
	},
	'ds.slot': { pt: 'Slot {0}', en: 'Slot {0}', fr: 'Emplacement {0}', es: 'Espacio {0}' },
	'ds.components_title': { pt: 'Componentes', en: 'Components', fr: 'Composants', es: 'Componentes' },
	'ds.components_desc': {
		pt: 'Vocabulário base implementado.',
		en: 'Implemented base vocabulary.',
		fr: 'Vocabulaire de base implémenté.',
		es: 'Vocabulario base implementado.'
	},
	'ds.card_buttons': { pt: 'Botões', en: 'Buttons', fr: 'Boutons', es: 'Botones' },
	'ds.card_type_markers': {
		pt: 'Marcadores de tipo',
		en: 'Type markers',
		fr: 'Marqueurs de type',
		es: 'Marcadores de tipo'
	},
	'ds.card_form': { pt: 'Formulário', en: 'Form', fr: 'Formulaire', es: 'Formulario' },
	'ds.card_editor': { pt: 'Editor de texto', en: 'Text editor', fr: 'Éditeur de texte', es: 'Editor de texto' },
	'ds.card_dialog': { pt: 'Dialog', en: 'Dialog', fr: 'Dialogue', es: 'Diálogo' },
	'ds.card_search': {
		pt: 'Busca & filtros',
		en: 'Search & filters',
		fr: 'Recherche et filtres',
		es: 'Búsqueda y filtros'
	},
	'ds.btn_save_node': { pt: 'Salvar nó', en: 'Save node', fr: 'Enregistrer le nœud', es: 'Guardar nodo' },
	'ds.btn_discard': { pt: 'Descartar', en: 'Discard', fr: 'Abandonner', es: 'Descartar' },
	'ds.btn_new_node': { pt: '+ Novo nó', en: '+ New node', fr: '+ Nouveau nœud', es: '+ Nuevo nodo' },
	'ds.btn_new_edge': { pt: '+ Nova aresta', en: '+ New edge', fr: '+ Nouvelle arête', es: '+ Nueva arista' },
	'ds.btn_export': { pt: '↗ Exportar', en: '↗ Export', fr: '↗ Exporter', es: '↗ Exportar' },
	'ds.btn_saving': { pt: 'Salvando', en: 'Saving', fr: 'Enregistrement', es: 'Guardando' },
	'ds.btn_disabled': { pt: 'Desabilitado', en: 'Disabled', fr: 'Désactivé', es: 'Deshabilitado' },
	'ds.btn_removing': { pt: 'Removendo', en: 'Removing', fr: 'Suppression', es: 'Eliminando' },
	'ds.dialog_hint': {
		pt: 'Modal nativo HTML5 — ESC e clique no backdrop fecham.',
		en: 'Native HTML5 modal — ESC and backdrop click close it.',
		fr: 'Modale HTML5 native — ESC et clic sur le fond la ferment.',
		es: 'Modal nativo HTML5 — ESC y clic en el fondo la cierran.'
	},
	'ds.dialog_open': { pt: 'Abrir dialog', en: 'Open dialog', fr: 'Ouvrir le dialogue', es: 'Abrir diálogo' },
	'ds.dialog_confirm_destructive': {
		pt: 'Confirmar destrutivo',
		en: 'Confirm destructive',
		fr: 'Confirmer destructif',
		es: 'Confirmar destructivo'
	},
	'ds.dialog_example_title': {
		pt: 'Exemplo de dialog',
		en: 'Dialog example',
		fr: 'Exemple de dialogue',
		es: 'Ejemplo de diálogo'
	},
	'ds.search_placeholder': {
		pt: 'Buscar nó…',
		en: 'Search node…',
		fr: 'Rechercher un nœud…',
		es: 'Buscar nodo…'
	},
	'ds.tag_agency': { pt: 'órgão', en: 'agency', fr: 'organisme', es: 'organismo' },
	'ds.tag_hosting': { pt: 'hosting', en: 'hosting', fr: 'hébergement', es: 'alojamiento' },
	'ds.tag_dev': { pt: 'dev', en: 'dev', fr: 'dev', es: 'dev' },
	'ds.tag_credential': { pt: 'credencial', en: 'credential', fr: 'identifiant', es: 'credencial' },
	'ds.tag_service': { pt: 'serviço', en: 'service', fr: 'service', es: 'servicio' },
	'ds.demo_phase_from': {
		pt: 'Coleta de documentos',
		en: 'Document collection',
		fr: 'Collecte de documents',
		es: 'Recolección de documentos'
	},
	'ds.demo_phase_to': { pt: 'Licenciamento', en: 'Licensing', fr: 'Autorisation', es: 'Licencia' },
	'ds.editor_content': {
		pt: '<p>Editor mínimo: <strong>negrito</strong>, <em>itálico</em>, <a href="#">link</a>, lista.</p><ul><li>um</li><li>dois</li></ul>',
		en: '<p>Minimal editor: <strong>bold</strong>, <em>italic</em>, <a href="#">link</a>, list.</p><ul><li>one</li><li>two</li></ul>',
		fr: '<p>Éditeur minimal : <strong>gras</strong>, <em>italique</em>, <a href="#">lien</a>, liste.</p><ul><li>un</li><li>deux</li></ul>',
		es: '<p>Editor mínimo: <strong>negrita</strong>, <em>cursiva</em>, <a href="#">enlace</a>, lista.</p><ul><li>uno</li><li>dos</li></ul>'
	},

	// ──────────────────────────────────────────────
	// TITLES (browser tabs, composed as [page] | brand | deploy name)
	// ──────────────────────────────────────────────
	'title.journey': { pt: 'Jornada', en: 'Journey', fr: 'Parcours', es: 'Recorrido' },
	'title.map': { pt: 'Mapa', en: 'Map', fr: 'Carte', es: 'Mapa' },
	'title.entities': { pt: 'Entidades', en: 'Entities', fr: 'Entités', es: 'Entidades' },
	'title.connections': { pt: 'Conexões', en: 'Connections', fr: 'Connexions', es: 'Conexiones' },
	'title.login': { pt: 'Entrar', en: 'Sign in', fr: 'Connexion', es: 'Iniciar sesión' },

	// ──────────────────────────────────────────────
	// ACCOUNTS (/admin/accounts)
	// ──────────────────────────────────────────────
	'accounts.title': { pt: 'Contas', en: 'Accounts', fr: 'Comptes', es: 'Cuentas' },
	'accounts.lede': {
		pt: 'Quem pode entrar e editar este mapa. Uma conta admin edita o conteúdo e cuida das outras contas.',
		en: 'Who can sign in and edit this map. An admin account edits the content and looks after the other accounts.',
		fr: 'Qui peut se connecter et modifier cette carte. Un compte administrateur modifie le contenu et gère les autres comptes.',
		es: 'Quién puede entrar y editar este mapa. Una cuenta de administrador edita el contenido y gestiona las demás cuentas.'
	},
	'accounts.col_role': { pt: 'Papel', en: 'Role', fr: 'Rôle', es: 'Rol' },
	'accounts.role.admin': { pt: 'Admin', en: 'Admin', fr: 'Admin', es: 'Admin' },
	'accounts.role.none': {
		pt: 'Sem papel',
		en: 'No role',
		fr: 'Sans rôle',
		es: 'Sin rol'
	},
	'accounts.new': { pt: 'Nova conta', en: 'New account', fr: 'Nouveau compte', es: 'Nueva cuenta' },
	'accounts.empty': {
		pt: 'Nenhuma conta criada.',
		en: 'No accounts yet.',
		fr: 'Aucun compte pour le moment.',
		es: 'Todavía no hay cuentas.'
	},
	'accounts.you': { pt: 'você', en: 'you', fr: 'vous', es: 'usted' },
	'accounts.set_password': {
		pt: 'trocar senha',
		en: 'change password',
		fr: 'changer le mot de passe',
		es: 'cambiar contraseña'
	},
	'accounts.dialog.password': {
		pt: 'Nova senha para {0}',
		en: 'New password for {0}',
		fr: 'Nouveau mot de passe pour {0}',
		es: 'Nueva contraseña para {0}'
	},
	'accounts.field.email': { pt: 'Email', en: 'Email', fr: 'E-mail', es: 'Correo' },
	'accounts.field.password': {
		pt: 'Senha',
		en: 'Password',
		fr: 'Mot de passe',
		es: 'Contraseña'
	},
	'accounts.field.password_hint': {
		pt: 'Ao menos 8 caracteres',
		en: 'At least 8 characters',
		fr: 'Au moins 8 caractères',
		es: 'Al menos 8 caracteres'
	},
	'accounts.confirm_remove_title': {
		pt: 'Remover esta conta?',
		en: 'Remove this account?',
		fr: 'Supprimer ce compte ?',
		es: '¿Eliminar esta cuenta?'
	},
	'accounts.confirm_remove_desc': {
		pt: '{0} deixa de entrar e de editar o mapa.',
		en: '{0} will no longer be able to sign in or edit the map.',
		fr: '{0} ne pourra plus se connecter ni modifier la carte.',
		es: '{0} ya no podrá entrar ni editar el mapa.'
	},
	'accounts.error.load': {
		pt: 'Não foi possível carregar as contas.',
		en: 'Could not load the accounts.',
		fr: 'Impossible de charger les comptes.',
		es: 'No se pudieron cargar las cuentas.'
	},
	'accounts.error.save': {
		pt: 'Não foi possível salvar a conta.',
		en: 'Could not save the account.',
		fr: "Impossible d'enregistrer le compte.",
		es: 'No se pudo guardar la cuenta.'
	},
	'accounts.error.remove': {
		pt: 'Não foi possível remover a conta.',
		en: 'Could not remove the account.',
		fr: 'Impossible de supprimer le compte.',
		es: 'No se pudo eliminar la cuenta.'
	},
	'accounts.error.email_taken': {
		pt: 'Já existe uma conta com este email.',
		en: 'An account with this email already exists.',
		fr: 'Un compte existe déjà avec cet e-mail.',
		es: 'Ya existe una cuenta con este correo.'
	},
	'accounts.error.password': {
		pt: 'A senha precisa de ao menos 8 caracteres.',
		en: 'The password needs at least 8 characters.',
		fr: 'Le mot de passe doit comporter au moins 8 caractères.',
		es: 'La contraseña necesita al menos 8 caracteres.'
	},

	// ──────────────────────────────────────────────
	// SETUP (/setup, the project's first boot)
	// ──────────────────────────────────────────────
	'setup.title': {
		pt: 'Configurar projeto',
		en: 'Set up project',
		fr: 'Configurer le projet',
		es: 'Configurar proyecto'
	},
	'setup.identity': {
		pt: 'Diga como este mapa se chama. Tudo aqui muda depois em Configurações.',
		en: 'Say what this map is called. Everything here can change later in Settings.',
		fr: 'Indiquez le nom de cette carte. Tout cela se modifie ensuite dans Paramètres.',
		es: 'Indique cómo se llama este mapa. Todo esto se puede cambiar luego en Configuración.'
	},
	'setup.lede': {
		pt: 'O PocketBase deste projeto ainda não tem dados. Isto cria as coleções, as categorias base e o primeiro mapa.',
		en: "This project's PocketBase has no data yet. This creates the collections, the base categories and the first map.",
		fr: "Le PocketBase de ce projet n'a pas encore de données. Ceci crée les collections, les catégories de base et la première carte.",
		es: 'El PocketBase de este proyecto aún no tiene datos. Esto crea las colecciones, las categorías base y el primer mapa.'
	},
	'setup.button': {
		pt: 'Configurar projeto',
		en: 'Set up project',
		fr: 'Configurer le projet',
		es: 'Configurar proyecto'
	},
	'setup.running': {
		pt: 'Configurando…',
		en: 'Setting up…',
		fr: 'Configuration…',
		es: 'Configurando…'
	},
	'setup.error': {
		pt: 'Falha ao configurar. Verifique as credenciais e o PocketBase.',
		en: 'Setup failed. Check the credentials and PocketBase.',
		fr: 'Échec de la configuration. Vérifiez les identifiants et PocketBase.',
		es: 'Error al configurar. Verifique las credenciales y PocketBase.'
	},
	'setup.login_required': {
		pt: 'Faça login como superuser para configurar.',
		en: 'Sign in as superuser to configure.',
		fr: 'Connectez-vous en superutilisateur pour configurer.',
		es: 'Inicie sesión como superusuario para configurar.'
	},
	'setup.configured': {
		pt: 'Projeto configurado.',
		en: 'Project configured.',
		fr: 'Projet configuré.',
		es: 'Proyecto configurado.'
	},
	'setup.go_to_app': {
		pt: 'Ir para o app',
		en: 'Go to the app',
		fr: "Aller à l'app",
		es: 'Ir a la app'
	},
	'setup.danger_title': {
		pt: 'Zona de perigo',
		en: 'Danger zone',
		fr: 'Zone de danger',
		es: 'Zona de peligro'
	},
	'setup.danger_desc': {
		pt: 'Resetar apaga TODAS as coleções e dados do projeto — volta ao estado de instalação nova. Não dá pra desfazer.',
		en: 'Resetting deletes ALL project collections and data — back to a fresh install. This cannot be undone.',
		fr: 'La réinitialisation supprime TOUTES les collections et données du projet — retour à une installation neuve. Irréversible.',
		es: 'Resetear elimina TODAS las colecciones y datos del proyecto — vuelve a una instalación nueva. No se puede deshacer.'
	},
	// {0} = confirmation phrase
	'setup.reset_confirm': {
		pt: 'Digite {0} para confirmar',
		en: 'Type {0} to confirm',
		fr: 'Tapez {0} pour confirmer',
		es: 'Escriba {0} para confirmar'
	},
	'setup.reset_button': {
		pt: 'Resetar projeto',
		en: 'Reset project',
		fr: 'Réinitialiser le projet',
		es: 'Resetear proyecto'
	},
	'setup.reset_error': {
		pt: 'Falha ao resetar. Verifique o PocketBase.',
		en: 'Reset failed. Check PocketBase.',
		fr: 'Échec de la réinitialisation. Vérifiez PocketBase.',
		es: 'Error al resetear. Verifique PocketBase.'
	},

	// ──────────────────────────────────────────────
	// I18N (UI meta)
	// ──────────────────────────────────────────────
	'i18n.fallback_mark': {
		pt: 'Sem tradução no idioma atual — exibindo fallback',
		en: 'No translation in current locale — showing fallback',
		fr: 'Pas de traduction dans la langue actuelle — affichage de la version de secours',
		es: 'Sin traducción en el idioma actual — mostrando alternativa'
	},

	// ──────────────────────────────────────────────
	// HOME
	// ──────────────────────────────────────────────
	'home.title_b': {
		pt: 'da infraestrutura digital de',
		en: 'of the digital infrastructure of',
		fr: "de l'infrastructure numérique de",
		es: 'de la infraestructura digital de'
	},
	'home.title_b_generic': {
		pt: 'da infraestrutura digital',
		en: 'of the digital infrastructure',
		fr: "de l'infrastructure numérique",
		es: 'de la infraestructura digital'
	},
	'home.lede_generic': {
		pt: 'Mapeamento do ecossistema de identidade, credenciais, sistemas de informação e serviços públicos.',
		en: 'Mapping the ecosystem of identity, credentials, information systems and public services.',
		fr: "Cartographie de l'écosystème d'identité, d'identifiants, de systèmes d'information et de services publics.",
		es: 'Mapeo del ecosistema de identidad, credenciales, sistemas de información y servicios públicos.'
	},
	// {0} = the deploy's name (settings); with none, the *_generic key
	'home.lede': {
		pt: 'Mapeamento do ecossistema de identidade, credenciais, sistemas de informação e serviços públicos do Estado de {0}.',
		en: 'Mapping the ecosystem of identity, credentials, information systems and public services of the State of {0}.',
		fr: "Cartographie de l'écosystème d'identité, d'identifiants, de systèmes d'information et de services publics de l'État de {0}.",
		es: 'Mapeo del ecosistema de identidad, credenciales, sistemas de información y servicios públicos del Estado de {0}.'
	},

	// ──────────────────────────────────────────────
	// ERROR
	// ──────────────────────────────────────────────
	'error.label': { pt: 'erro', en: 'error', fr: 'erreur', es: 'error' },
	'error.not_found': {
		pt: 'Página não encontrada.',
		en: 'Page not found.',
		fr: 'Page introuvable.',
		es: 'Página no encontrada.'
	},
	'error.generic': {
		pt: 'Algo correu mal.',
		en: 'Something went wrong.',
		fr: "Une erreur s'est produite.",
		es: 'Algo salió mal.'
	},
	'error.unexpected': {
		pt: 'Erro inesperado.',
		en: 'Unexpected error.',
		fr: 'Erreur inattendue.',
		es: 'Error inesperado.'
	},

	// ──────────────────────────────────────────────
	// LOGIN
	// ──────────────────────────────────────────────
	'login.title': { pt: 'Entrar.', en: 'Sign in.', fr: 'Connexion.', es: 'Iniciar sesión.' },
	'login.lede': {
		pt: 'Acesso restrito a curadores. Entre como superuser ou com uma conta criada em Contas.',
		en: 'Restricted access to curators. Sign in as the superuser or with an account created in Accounts.',
		fr: 'Accès réservé aux curateurs. Connectez-vous en tant que superutilisateur ou avec un compte créé dans Comptes.',
		es: 'Acceso restringido a curadores. Entre como superusuario o con una cuenta creada en Cuentas.'
	},
	'login.email': { pt: 'Email', en: 'Email', fr: 'E-mail', es: 'Correo' },
	'login.password': { pt: 'Senha', en: 'Password', fr: 'Mot de passe', es: 'Contraseña' },
	'login.submit': { pt: 'Entrar', en: 'Sign in', fr: 'Se connecter', es: 'Iniciar sesión' },
	'login.invalid': {
		pt: 'Credenciais inválidas.',
		en: 'Invalid credentials.',
		fr: 'Identifiants invalides.',
		es: 'Credenciales inválidas.'
	},
	'login.too_many': {
		pt: 'Tentativas demais. Aguarde um minuto e tente de novo.',
		en: 'Too many attempts. Wait a minute and try again.',
		fr: 'Trop de tentatives. Attendez une minute et réessayez.',
		es: 'Demasiados intentos. Espere un minuto e inténtelo de nuevo.'
	},

	// ──────────────────────────────────────────────
	// ENTITIES (/admin/entities)
	// ──────────────────────────────────────────────
	'entities.title': { pt: 'Entidades.', en: 'Entities.', fr: 'Entités.', es: 'Entidades.' },
	'entities.lede': {
		pt: 'Esta é a página de catalogação das peças que compõem o grafo: órgãos reguladores, domínios, hospedagens, ambientes de desenvolvimento, repositórios, credenciais, serviços e pessoas.',
		en: 'This is the catalog of the pieces that make up the graph: regulators, domains, hosting, dev environments, repositories, credentials, services and people.',
		fr: "Voici la page de catalogage des éléments qui composent le graphe : organismes de régulation, domaines, hébergements, environnements de développement, dépôts, identifiants, services et personnes.",
		es: 'Esta es la página de catalogación de las piezas que componen el grafo: organismos reguladores, dominios, alojamientos, entornos de desarrollo, repositorios, credenciales, servicios y personas.'
	},
	'entities.new': { pt: 'Nova entidade', en: 'New entity', fr: 'Nouvelle entité', es: 'Nueva entidad' },
	'entities.search_placeholder': {
		pt: 'Buscar por rótulo ou nome completo…',
		en: 'Search by label or full name…',
		fr: 'Rechercher par libellé ou nom complet…',
		es: 'Buscar por etiqueta o nombre completo…'
	},
	'entities.empty': {
		pt: 'Nenhuma entidade ainda. Crie a primeira no botão acima.',
		en: 'No entities yet. Create the first one with the button above.',
		fr: "Aucune entité pour l'instant. Créez la première avec le bouton ci-dessus.",
		es: 'Aún no hay entidades. Cree la primera con el botón de arriba.'
	},
	'entities.empty_no_types': {
		pt: 'Crie ao menos uma categoria antes de cadastrar entidades.',
		en: 'Create at least one category before adding entities.',
		fr: "Créez au moins une catégorie avant d'ajouter des entités.",
		es: 'Cree al menos una categoría antes de registrar entidades.'
	},
	'entities.requires_category': {
		pt: 'Crie uma categoria primeiro',
		en: 'Create a category first',
		fr: "Créez d'abord une catégorie",
		es: 'Cree primero una categoría'
	},
	'entities.no_results': {
		pt: 'Nenhum resultado para o filtro atual.',
		en: 'No results for the current filter.',
		fr: 'Aucun résultat pour le filtre actuel.',
		es: 'Sin resultados para el filtro actual.'
	},
	'entities.col_type': { pt: 'Tipo', en: 'Type', fr: 'Type', es: 'Tipo' },
	'entities.col_label': { pt: 'Rótulo', en: 'Label', fr: 'Libellé', es: 'Etiqueta' },
	'entities.confirm_remove_title': {
		pt: 'Remover entidade?',
		en: 'Remove entity?',
		fr: "Supprimer l'entité ?",
		es: '¿Eliminar entidad?'
	},
	'entities.confirm_remove_desc': {
		pt: '"{0}" será removida. Conexões serão removidas em cascata.',
		en: '"{0}" will be removed. Connections will be cascade-deleted.',
		fr: "« {0} » sera supprimée. Les connexions seront supprimées en cascade.",
		es: '"{0}" será eliminada. Las conexiones se eliminarán en cascada.'
	},

	// ──────────────────────────────────────────────
	// RICH TEXT EDITOR
	// ──────────────────────────────────────────────
	'editor.bold': { pt: 'Negrito', en: 'Bold', fr: 'Gras', es: 'Negrita' },
	'editor.italic': { pt: 'Itálico', en: 'Italic', fr: 'Italique', es: 'Cursiva' },
	'editor.link': { pt: 'Link', en: 'Link', fr: 'Lien', es: 'Enlace' },
	'editor.bullet_list': { pt: 'Lista', en: 'Bullet list', fr: 'Liste à puces', es: 'Lista' },
	'editor.ordered_list': { pt: 'Lista numerada', en: 'Numbered list', fr: 'Liste numérotée', es: 'Lista numerada' },

	// ──────────────────────────────────────────────
	// NODE DIALOG
	// ──────────────────────────────────────────────
	'node.dialog.title.new': {
		pt: 'Nova entidade',
		en: 'New entity',
		fr: 'Nouvelle entité',
		es: 'Nueva entidad'
	},
	'node.dialog.title.edit': {
		pt: 'Editar entidade',
		en: 'Edit entity',
		fr: "Modifier l'entité",
		es: 'Editar entidad'
	},
	'node.field.type': { pt: 'Tipo', en: 'Type', fr: 'Type', es: 'Tipo' },
	'node.field.label': { pt: 'Rótulo curto', en: 'Short label', fr: 'Libellé court', es: 'Etiqueta corta' },
	'node.field.label_placeholder': { pt: 'ex: DNS', en: 'e.g. DNS', fr: 'ex : DNS', es: 'ej: DNS' },
	'node.field.label_full': {
		pt: 'Rótulo completo',
		en: 'Full label',
		fr: 'Libellé complet',
		es: 'Etiqueta completa'
	},
	'node.field.label_full_placeholder': {
		pt: 'ex: Sistema de Nomes de Domínio',
		en: 'e.g. Domain Name System',
		fr: 'ex : Système de noms de domaine',
		es: 'ej: Sistema de Nombres de Dominio'
	},
	'node.field.description': { pt: 'Descrição', en: 'Description', fr: 'Description', es: 'Descripción' },
	'node.field.description_placeholder': {
		pt: 'Texto livre…',
		en: 'Free text…',
		fr: 'Texte libre…',
		es: 'Texto libre…'
	},
	'node.field.links': {
		pt: 'Links relacionados',
		en: 'Related links',
		fr: 'Liens associés',
		es: 'Enlaces relacionados'
	},
	'node.field.link_label': { pt: 'Rótulo', en: 'Label', fr: 'Libellé', es: 'Etiqueta' },
	'node.field.link_label_placeholder': {
		pt: 'Texto do link',
		en: 'Link text',
		fr: 'Texte du lien',
		es: 'Texto del enlace'
	},
	'node.field.link_url': { pt: 'URL', en: 'URL', fr: 'URL', es: 'URL' },
	'node.field.link_add': {
		pt: '+ Adicionar link',
		en: '+ Add link',
		fr: '+ Ajouter un lien',
		es: '+ Añadir enlace'
	},
	'node.field.link_remove': {
		pt: 'Remover link',
		en: 'Remove link',
		fr: 'Supprimer le lien',
		es: 'Eliminar enlace'
	},
	'node.field.maps': { pt: 'Mapas', en: 'Maps', fr: 'Cartes', es: 'Mapas' },
	'node.field.required_label': {
		pt: 'O rótulo em {0} é obrigatório.',
		en: 'The label in {0} is required.',
		fr: 'Le libellé en {0} est obligatoire.',
		es: 'La etiqueta en {0} es obligatoria.'
	},
	'node.field.maps_required': {
		pt: 'Selecione ao menos um mapa.',
		en: 'Select at least one map.',
		fr: 'Sélectionnez au moins une carte.',
		es: 'Seleccione al menos un mapa.'
	},
	'node.error.save': {
		pt: 'Erro ao salvar entidade.',
		en: 'Failed to save entity.',
		fr: "Échec de l'enregistrement de l'entité.",
		es: 'Error al guardar la entidad.'
	},

	// ──────────────────────────────────────────────
	// EDGE DIALOG / CONNECTIONS
	// ──────────────────────────────────────────────
	'edge.dialog.title.new': {
		pt: 'Nova conexão',
		en: 'New connection',
		fr: 'Nouvelle connexion',
		es: 'Nueva conexión'
	},
	'edge.dialog.title.edit': {
		pt: 'Editar conexão',
		en: 'Edit connection',
		fr: 'Modifier la connexion',
		es: 'Editar conexión'
	},
	'edge.field.source': { pt: 'Source', en: 'Source', fr: 'Source', es: 'Origen' },
	'edge.field.target': { pt: 'Target', en: 'Target', fr: 'Cible', es: 'Destino' },
	'edge.submit_create': {
		pt: 'Criar conexão',
		en: 'Create connection',
		fr: 'Créer la connexion',
		es: 'Crear conexión'
	},
	'edge.error.duplicate': {
		pt: 'Essa conexão já existe.',
		en: 'This connection already exists.',
		fr: 'Cette connexion existe déjà.',
		es: 'Esta conexión ya existe.'
	},
	'edge.error.save': {
		pt: 'Erro ao salvar conexão.',
		en: 'Failed to save connection.',
		fr: "Échec de l'enregistrement de la connexion.",
		es: 'Error al guardar la conexión.'
	},
	'connections.title': {
		pt: 'Conexões.',
		en: 'Connections.',
		fr: 'Connexions.',
		es: 'Conexiones.'
	},
	'connections.lede': {
		pt: 'As conexões são o tecido que liga as entidades do mapa, cada uma documentando uma dependência real entre dois pontos: hospedagem, custódia, autoria, responsabilidade.',
		en: 'Connections are the fabric linking entities in the map, each documenting a real dependency between two points: hosting, custody, authorship, accountability.',
		fr: "Les connexions sont le tissu qui relie les entités de la carte, chacune documentant une dépendance réelle entre deux points : hébergement, garde, paternité, responsabilité.",
		es: 'Las conexiones son el tejido que une las entidades del mapa, cada una documentando una dependencia real entre dos puntos: alojamiento, custodia, autoría, responsabilidad.'
	},
	'connections.new': {
		pt: 'Nova conexão',
		en: 'New connection',
		fr: 'Nouvelle connexion',
		es: 'Nueva conexión'
	},
	'connections.search_placeholder': {
		pt: 'Buscar por entidade conectada…',
		en: 'Search by connected entity…',
		fr: 'Rechercher par entité connectée…',
		es: 'Buscar por entidad conectada…'
	},
	'connections.empty_no_nodes': {
		pt: 'Crie ao menos 2 entidades antes de conectar.',
		en: 'Create at least 2 entities before connecting.',
		fr: 'Créez au moins 2 entités avant de connecter.',
		es: 'Cree al menos 2 entidades antes de conectar.'
	},
	'connections.empty': {
		pt: 'Nenhuma conexão ainda. Crie a primeira no botão acima.',
		en: 'No connections yet. Create the first one with the button above.',
		fr: "Aucune connexion pour l'instant. Créez la première avec le bouton ci-dessus.",
		es: 'Aún no hay conexiones. Cree la primera con el botón de arriba.'
	},
	'connections.no_results': {
		pt: 'Nenhum resultado para "{0}".',
		en: 'No results for "{0}".',
		fr: 'Aucun résultat pour « {0} ».',
		es: 'Sin resultados para "{0}".'
	},
	'connections.col_source': { pt: 'Source', en: 'Source', fr: 'Source', es: 'Origen' },
	'connections.col_target': { pt: '→ Target', en: '→ Target', fr: '→ Cible', es: '→ Destino' },
	'connections.confirm_remove_title': {
		pt: 'Remover conexão?',
		en: 'Remove connection?',
		fr: 'Supprimer la connexion ?',
		es: '¿Eliminar conexión?'
	},
	'connections.dup_banner': {
		pt: '{0} conexão(ões) duplicada(s) encontrada(s) — clique para ver',
		en: '{0} duplicate connection(s) found — click to inspect',
		fr: '{0} connexion(s) en double trouvée(s) — cliquez pour voir',
		es: '{0} conexión(es) duplicada(s) encontrada(s) — clic para ver'
	},
	'connections.dup_title': {
		pt: 'Conexões duplicadas',
		en: 'Duplicate connections',
		fr: 'Connexions en double',
		es: 'Conexiones duplicadas'
	},
	'connections.dup_intro': {
		pt: '{0} par(es) com duplicatas — {1} registro(s) extra(s) no total.',
		en: '{0} pair(s) with duplicates — {1} extra record(s) in total.',
		fr: '{0} paire(s) avec doublons — {1} enregistrement(s) supplémentaire(s) au total.',
		es: '{0} par(es) con duplicados — {1} registro(s) extra(s) en total.'
	},
	'connections.dup_extras_col': { pt: 'Extras', en: 'Extras', fr: 'Extras', es: 'Extras' },
	'connections.dup_remove_all': {
		pt: 'Remover todas as {0} duplicatas',
		en: 'Remove all {0} duplicates',
		fr: 'Supprimer les {0} doublons',
		es: 'Eliminar los {0} duplicados'
	},

	// ──────────────────────────────────────────────
	// CATEGORIES (/admin/categories)
	// ──────────────────────────────────────────────
	'categories.title': { pt: 'Categorias.', en: 'Categories.', fr: 'Catégories.', es: 'Categorías.' },
	'categories.lede': {
		pt: 'Gerencie as categorias (tipos de nó) do grafo. A ordem define a camada vertical na visualização. Cada categoria tem um slot de cor associado.',
		en: 'Manage the graph categories (node types). Order defines the vertical layer in the visualization. Each category has an associated color slot.',
		fr: "Gérez les catégories (types de nœud) du graphe. L'ordre définit la couche verticale dans la visualisation. Chaque catégorie a un emplacement de couleur associé.",
		es: 'Gestione las categorías (tipos de nodo) del grafo. El orden define la capa vertical en la visualización. Cada categoría tiene un espacio de color asociado.'
	},
	'categories.empty': {
		pt: 'Nenhuma categoria encontrada.',
		en: 'No categories found.',
		fr: 'Aucune catégorie trouvée.',
		es: 'No se encontraron categorías.'
	},
	'categories.new': { pt: 'Nova categoria', en: 'New category', fr: 'Nouvelle catégorie', es: 'Nueva categoría' },
	'categories.dialog.title.new': {
		pt: 'Nova categoria',
		en: 'New category',
		fr: 'Nouvelle catégorie',
		es: 'Nueva categoría'
	},
	'categories.dialog.title.edit': {
		pt: 'Editar categoria',
		en: 'Edit category',
		fr: 'Modifier la catégorie',
		es: 'Editar categoría'
	},
	'categories.field.label': { pt: 'Rótulo', en: 'Label', fr: 'Libellé', es: 'Etiqueta' },
	'categories.field.label_placeholder': {
		pt: 'ex: Órgão',
		en: 'e.g. Agency',
		fr: 'ex : Organisme',
		es: 'ej: Organismo'
	},
	'categories.field.label_plural': { pt: 'Plural', en: 'Plural', fr: 'Pluriel', es: 'Plural' },
	'categories.field.label_plural_placeholder': {
		pt: 'ex: Órgãos',
		en: 'e.g. Agencies',
		fr: 'ex : Organismes',
		es: 'ej: Organismos'
	},
	'categories.field.slug': { pt: 'Slug', en: 'Slug', fr: 'Slug', es: 'Slug' },
	'categories.field.slug_hint': {
		pt: 'Apenas letras minúsculas, números e hifens',
		en: 'Only lowercase letters, numbers and hyphens',
		fr: "Uniquement lettres minuscules, chiffres et traits d'union",
		es: 'Solo letras minúsculas, números y guiones'
	},
	'categories.field.color': { pt: 'Cor', en: 'Color', fr: 'Couleur', es: 'Color' },
	'categories.field.color_swatch': { pt: 'Cor {0}', en: 'Color {0}', fr: 'Couleur {0}', es: 'Color {0}' },
	'categories.field.base_size': {
		pt: 'Tamanho base',
		en: 'Base size',
		fr: 'Taille de base',
		es: 'Tamaño base'
	},
	'categories.error.save': {
		pt: 'Erro ao salvar categoria.',
		en: 'Failed to save category.',
		fr: "Échec de l'enregistrement de la catégorie.",
		es: 'Error al guardar la categoría.'
	},
	'categories.error.remove': {
		pt: 'Erro ao remover categoria.',
		en: 'Failed to remove category.',
		fr: 'Échec de la suppression de la catégorie.',
		es: 'Error al eliminar la categoría.'
	},
	'categories.confirm_remove_title': {
		pt: 'Remover categoria?',
		en: 'Remove category?',
		fr: 'Supprimer la catégorie ?',
		es: '¿Eliminar categoría?'
	},
	'categories.confirm_remove_desc': {
		pt: '"{0}" será removida.',
		en: '"{0}" will be removed.',
		fr: '« {0} » sera supprimée.',
		es: '"{0}" será eliminada.'
	},
	'categories.reassign.title': {
		pt: 'Reatribuir nós',
		en: 'Reassign nodes',
		fr: 'Réattribuer les nœuds',
		es: 'Reasignar nodos'
	},
	'categories.reassign.desc': {
		pt: '"{0}" tem {1} nó(s) associado(s). Escolha a categoria de destino para mover esses nós antes de excluir a categoria atual.',
		en: '"{0}" has {1} associated node(s). Choose a target category to move these nodes to before removing the current category.',
		fr: "« {0} » a {1} nœud(s) associé(s). Choisissez la catégorie de destination pour déplacer ces nœuds avant de supprimer la catégorie actuelle.",
		es: '"{0}" tiene {1} nodo(s) asociado(s). Elija la categoría de destino para mover esos nodos antes de eliminar la categoría actual.'
	},
	'categories.reassign.field_target': {
		pt: 'Categoria de destino',
		en: 'Target category',
		fr: 'Catégorie de destination',
		es: 'Categoría de destino'
	},
	'categories.reassign.action': {
		pt: 'Mover nós e excluir',
		en: 'Move nodes and remove',
		fr: 'Déplacer les nœuds et supprimer',
		es: 'Mover nodos y eliminar'
	},
	'categories.col_order': { pt: '#', en: '#', fr: '#', es: '#' },

	// ──────────────────────────────────────────────
	// MAPS (/admin/maps)
	// ──────────────────────────────────────────────
	'maps_admin.title': { pt: 'Mapas.', en: 'Maps.', fr: 'Cartes.', es: 'Mapas.' },
	'maps_admin.lede': {
		pt: 'Gerencie os mapas de visualização. O mapa principal (posição 1) é protegido e não pode ser removido ou reordenado por aqui.',
		en: 'Manage visualization maps. The main map (position 1) is protected and cannot be removed or reordered here.',
		fr: 'Gérez les cartes de visualisation. La carte principale (position 1) est protégée et ne peut pas être supprimée ni réorganisée ici.',
		es: 'Gestione los mapas de visualización. El mapa principal (posición 1) está protegido y no se puede eliminar ni reordenar aquí.'
	},
	'maps_admin.new': { pt: 'Novo mapa', en: 'New map', fr: 'Nouvelle carte', es: 'Nuevo mapa' },
	'maps_admin.empty': {
		pt: 'Nenhum mapa ainda. Crie o primeiro no botão acima.',
		en: 'No maps yet. Create the first one with the button above.',
		fr: "Aucune carte pour l'instant. Créez la première avec le bouton ci-dessus.",
		es: 'Aún no hay mapas. Cree el primero con el botón de arriba.'
	},
	'maps_admin.dialog.title.new': {
		pt: 'Novo mapa',
		en: 'New map',
		fr: 'Nouvelle carte',
		es: 'Nuevo mapa'
	},
	'maps_admin.dialog.title.edit': {
		pt: 'Editar mapa',
		en: 'Edit map',
		fr: 'Modifier la carte',
		es: 'Editar mapa'
	},
	'maps_admin.field.label': { pt: 'Rótulo', en: 'Label', fr: 'Libellé', es: 'Etiqueta' },
	'maps_admin.field.label_placeholder': {
		pt: 'ex: Mapa principal',
		en: 'e.g. Main map',
		fr: 'ex : Carte principale',
		es: 'ej: Mapa principal'
	},
	'maps_admin.field.slug': { pt: 'Slug', en: 'Slug', fr: 'Slug', es: 'Slug' },
	'maps_admin.field.slug_hint': {
		pt: 'Apenas letras minúsculas, números e hifens',
		en: 'Only lowercase letters, numbers and hyphens',
		fr: "Uniquement lettres minuscules, chiffres et traits d'union",
		es: 'Solo letras minúsculas, números y guiones'
	},
	'maps_admin.badge_main': { pt: 'principal', en: 'main', fr: 'principale', es: 'principal' },
	'maps_admin.confirm_remove_title': {
		pt: 'Remover mapa?',
		en: 'Remove map?',
		fr: 'Supprimer la carte ?',
		es: '¿Eliminar mapa?'
	},
	'maps_admin.confirm_remove_desc': {
		pt: '"{0}" será removido. Nós associados ao mapa serão desvinculados.',
		en: '"{0}" will be removed. Nodes associated with the map will be unlinked.',
		fr: "« {0} » sera supprimée. Les nœuds associés à la carte seront dissociés.",
		es: '"{0}" será eliminado. Los nodos asociados al mapa se desvincularán.'
	},
	'maps_admin.error.save': {
		pt: 'Erro ao salvar mapa.',
		en: 'Failed to save map.',
		fr: "Échec de l'enregistrement de la carte.",
		es: 'Error al guardar el mapa.'
	},
	'maps_admin.error.has_journeys': {
		pt: 'Este mapa tem jornadas: remova-as ou troque o mapa delas antes.',
		en: 'This map has journeys: remove them or change their map first.',
		fr: "Cette carte a des parcours : supprimez-les ou changez leur carte d'abord.",
		es: 'Este mapa tiene recorridos: elimínelos o cambie su mapa antes.'
	},

	// ──────────────────────────────────────────────
	// MAP VIEW (/maps/[slug])
	// ──────────────────────────────────────────────
	'map_view.title': { pt: 'Mapas.', en: 'Maps.', fr: 'Cartes.', es: 'Mapas.' },
	'map_view.lede_generic': {
		pt: 'Cada mapa é um recorte temático do ecossistema digital: faixas horizontais agrupam entidades do mesmo tipo, da autoridade institucional no topo ao responsável humano embaixo, e as arestas que cruzam essas camadas revelam como órgãos, sistemas, credenciais e pessoas se sustentam mutuamente.',
		en: 'Each map is a thematic slice of the digital ecosystem: horizontal bands group entities of the same type, from institutional authority at the top to human responsibility at the bottom, and the edges crossing these layers reveal how agencies, systems, credentials and people sustain each other.',
		fr: "Chaque carte est une coupe thématique de l'écosystème numérique : des bandes horizontales regroupent les entités de même type, de l'autorité institutionnelle en haut au responsable humain en bas, et les arêtes qui traversent ces couches révèlent comment organismes, systèmes, identifiants et personnes se soutiennent mutuellement.",
		es: 'Cada mapa es un recorte temático del ecosistema digital: franjas horizontales agrupan entidades del mismo tipo, desde la autoridad institucional arriba hasta el responsable humano abajo, y las aristas que cruzan esas capas revelan cómo organismos, sistemas, credenciales y personas se sostienen mutuamente.'
	},
	// {0} = the deploy's name (settings); with none, the *_generic key
	'map_view.lede': {
		pt: 'Cada mapa é um recorte temático do ecossistema digital de {0}: faixas horizontais agrupam entidades do mesmo tipo, da autoridade institucional no topo ao responsável humano embaixo, e as arestas que cruzam essas camadas revelam como órgãos, sistemas, credenciais e pessoas se sustentam mutuamente.',
		en: 'Each map is a thematic slice of the digital ecosystem of {0}: horizontal bands group entities of the same type, from institutional authority at the top to human responsibility at the bottom, and the edges crossing these layers reveal how agencies, systems, credentials and people sustain each other.',
		fr: "Chaque carte est une coupe thématique de l'écosystème numérique de {0} : des bandes horizontales regroupent les entités de même type, de l'autorité institutionnelle en haut au responsable humain en bas, et les arêtes qui traversent ces couches révèlent comment organismes, systèmes, identifiants et personnes se soutiennent mutuellement.",
		es: 'Cada mapa es un recorte temático del ecosistema digital de {0}: franjas horizontales agrupan entidades del mismo tipo, desde la autoridad institucional arriba hasta el responsable humano abajo, y las aristas que cruzan esas capas revelan cómo organismos, sistemas, credenciales y personas se sostienen mutuamente.'
	},
	'map_view.loading': {
		pt: 'Carregando mapa…',
		en: 'Loading map…',
		fr: 'Chargement de la carte…',
		es: 'Cargando mapa…'
	},
	'map_view.empty': {
		pt: 'Nenhuma entidade associada a este mapa.',
		en: 'No entities associated with this map.',
		fr: 'Aucune entité associée à cette carte.',
		es: 'Ninguna entidad asociada a este mapa.'
	},
	'map_view.aria_main': {
		pt: 'Mapa de entidades e conexões',
		en: 'Map of entities and connections',
		fr: 'Carte des entités et des connexions',
		es: 'Mapa de entidades y conexiones'
	},
	'map_view.connection_btn': { pt: 'conexão', en: 'connection', fr: 'connexion', es: 'conexión' },
	'map_view.related_links': {
		pt: 'links relacionados',
		en: 'related links',
		fr: 'liens associés',
		es: 'enlaces relacionados'
	},
	'map_view.connects_to': { pt: '→ conecta a', en: '→ connects to', fr: '→ se connecte à', es: '→ conecta con' },
	'map_view.receives_from': { pt: '← recebe de', en: '← receives from', fr: '← reçoit de', es: '← recibe de' },
	'map_view.unpin': {
		pt: 'soltar posição',
		en: 'release position',
		fr: 'libérer la position',
		es: 'soltar posición'
	},

	// ──────────────────────────────────────────────
	// JOURNEYS
	// ──────────────────────────────────────────────
	'journeys.title': { pt: 'Jornadas', en: 'Journeys', fr: 'Parcours', es: 'Recorridos' },
	'journeys.lede_generic': {
		pt: 'Percursos guiados pelo ecossistema digital — descubra como os cidadãos navegam pelos serviços públicos para alcançar objectivos concretos.',
		en: 'Guided paths through the digital ecosystem — discover how citizens navigate public services to reach concrete objectives.',
		fr: "Parcours guidés à travers l'écosystème numérique — découvrez comment les citoyens naviguent dans les services publics pour atteindre des objectifs concrets.",
		es: 'Recorridos guiados por el ecosistema digital — descubra cómo los ciudadanos navegan por los servicios públicos para alcanzar objetivos concretos.'
	},
	// {0} = the deploy's name (settings); with none, the *_generic key
	'journeys.lede': {
		pt: 'Percursos guiados pelo ecossistema digital de {0} — descubra como os cidadãos navegam pelos serviços públicos para alcançar objectivos concretos.',
		en: 'Guided paths through the digital ecosystem of {0} — discover how citizens navigate public services to reach concrete objectives.',
		fr: "Parcours guidés à travers l'écosystème numérique de {0} — découvrez comment les citoyens naviguent dans les services publics pour atteindre des objectifs concrets.",
		es: 'Recorridos guiados por el ecosistema digital de {0} — descubra cómo los ciudadanos navegan por los servicios públicos para alcanzar objetivos concretos.'
	},
	'journeys.empty': {
		pt: 'Nenhuma jornada publicada ainda.',
		en: 'No journeys published yet.',
		fr: "Aucun parcours publié pour l'instant.",
		es: 'Aún no hay recorridos publicados.'
	},
	'journeys.phases_n': { pt: '{0} fases', en: '{0} phases', fr: '{0} phases', es: '{0} fases' },
	'journeys.steps_n': { pt: '{0} etapas', en: '{0} steps', fr: '{0} étapes', es: '{0} pasos' },
	'journeys.loading': {
		pt: 'A carregar o grafo…',
		en: 'Loading graph…',
		fr: 'Chargement du graphe…',
		es: 'Cargando el grafo…'
	},
	'journeys.introduction': {
		pt: 'Introdução',
		en: 'Introduction',
		fr: 'Introduction',
		es: 'Introducción'
	},

	// JOURNEYS: DOCUMENT INVENTORY
	'journeys.documents': { pt: 'Documentos', en: 'Documents', fr: 'Documents', es: 'Documentos' },

	// JOURNEYS: PHASE TRANSITIONS
	'journeys.phase_complete': {
		pt: 'Fase {0} concluída',
		en: 'Phase {0} complete',
		fr: 'Phase {0} terminée',
		es: 'Fase {0} completada'
	},
	'journeys.journey_complete': {
		pt: 'Jornada concluída',
		en: 'Journey complete',
		fr: 'Parcours terminé',
		es: 'Recorrido completado'
	},
	'journeys.obtained_docs': { pt: 'Obtido', en: 'Obtained', fr: 'Obtenu', es: 'Obtenido' },
	'journeys.needed_docs': { pt: 'Necessário', en: 'Needed', fr: 'Requis', es: 'Necesario' },
	'journeys.nav_aria': {
		pt: 'Navegação da jornada',
		en: 'Journey navigation',
		fr: 'Navigation du parcours',
		es: 'Navegación del recorrido'
	},
	'journeys.graph_aria': {
		pt: 'Grafo de entidades da jornada',
		en: 'Journey entity graph',
		fr: 'Graphe des entités du parcours',
		es: 'Grafo de entidades del recorrido'
	},
	'journeys.next_phase': { pt: 'Próxima fase', en: 'Next phase', fr: 'Phase suivante', es: 'Próxima fase' },

	// ──────────────────────────────────────────────
	// JOURNEYS ADMIN (/admin/journeys)
	// ──────────────────────────────────────────────
	'journeys_admin.title': { pt: 'Jornadas.', en: 'Journeys.', fr: 'Parcours.', es: 'Recorridos.' },
	'journeys_admin.lede': {
		pt: 'Processos contados sobre o grafo, passo a passo. Só as publicadas chegam ao visitante.',
		en: 'Processes told over the graph, step by step. Only published ones reach visitors.',
		fr: 'Des processus racontés sur le graphe, étape par étape. Seuls ceux publiés sont visibles des visiteurs.',
		es: 'Procesos contados sobre el grafo, paso a paso. Solo los publicados llegan a los visitantes.'
	},
	'journeys_admin.new': { pt: 'Nova jornada', en: 'New journey', fr: 'Nouveau parcours', es: 'Nuevo recorrido' },
	'journeys_admin.empty': {
		pt: 'Nenhuma jornada ainda.',
		en: 'No journeys yet.',
		fr: "Aucun parcours pour l'instant.",
		es: 'Aún no hay recorridos.'
	},
	'journeys_admin.col_status': { pt: 'Estado', en: 'Status', fr: 'État', es: 'Estado' },
	'journeys_admin.status.published': { pt: 'publicada', en: 'published', fr: 'publié', es: 'publicado' },
	'journeys_admin.status.draft': { pt: 'rascunho', en: 'draft', fr: 'brouillon', es: 'borrador' },
	'journeys_admin.publish': { pt: 'Publicar', en: 'Publish', fr: 'Publier', es: 'Publicar' },
	'journeys_admin.unpublish': { pt: 'Despublicar', en: 'Unpublish', fr: 'Dépublier', es: 'Despublicar' },
	'journeys_admin.publish_lower': { pt: 'publicar', en: 'publish', fr: 'publier', es: 'publicar' },
	'journeys_admin.unpublish_lower': { pt: 'despublicar', en: 'unpublish', fr: 'dépublier', es: 'despublicar' },
	'journeys_admin.discard': {
		pt: 'Descartar edição',
		en: 'Discard edit',
		fr: 'Abandonner la modification',
		es: 'Descartar edición'
	},
	'journeys_admin.discard_lower': {
		pt: 'descartar edição',
		en: 'discard edit',
		fr: 'abandonner la modification',
		es: 'descartar edición'
	},
	'journeys_admin.unpublished_changes': {
		pt: 'Mudanças não publicadas',
		en: 'Unpublished changes',
		fr: 'Modifications non publiées',
		es: 'Cambios sin publicar'
	},
	'journeys_admin.status.changed': {
		pt: 'mudanças não publicadas',
		en: 'unpublished changes',
		fr: 'modifications non publiées',
		es: 'cambios sin publicar'
	},
	'journeys_admin.view_published': {
		pt: 'ver publicada',
		en: 'view published',
		fr: 'voir la version publiée',
		es: 'ver publicado'
	},
	'journeys_admin.confirm_discard_title': {
		pt: 'Descartar a edição?',
		en: 'Discard the edit?',
		fr: 'Abandonner la modification ?',
		es: '¿Descartar la edición?'
	},
	'journeys_admin.confirm_discard_desc': {
		pt: '"{0}" volta ao que o visitante lê agora. As mudanças feitas desde a publicação, salvas ou não, se perdem.',
		en: '"{0}" goes back to what visitors read now. The changes made since it was published, saved or not, are lost.',
		fr: '« {0} » revient à ce que lisent les visiteurs maintenant. Les modifications faites depuis la publication, enregistrées ou non, sont perdues.',
		es: '"{0}" vuelve a lo que lee el visitante ahora. Los cambios hechos desde la publicación, guardados o no, se pierden.'
	},
	'journeys_admin.confirm_remove_title': {
		pt: 'Remover jornada?',
		en: 'Remove journey?',
		fr: 'Supprimer le parcours ?',
		es: '¿Eliminar recorrido?'
	},
	'journeys_admin.confirm_remove_desc': {
		pt: '"{0}" e todos os seus passos serão removidos.',
		en: '"{0}" and all its steps will be removed.',
		fr: '« {0} » et toutes ses étapes seront supprimés.',
		es: '"{0}" y todos sus pasos serán eliminados.'
	},
	'journeys_admin.field.title': { pt: 'Título', en: 'Title', fr: 'Titre', es: 'Título' },
	'journeys_admin.field.description': { pt: 'Descrição', en: 'Description', fr: 'Description', es: 'Descripción' },
	'journeys_admin.field.slug': { pt: 'Slug', en: 'Slug', fr: 'Slug', es: 'Slug' },
	'journeys_admin.field.slug_hint': {
		pt: 'Apenas letras minúsculas, números e hifens',
		en: 'Only lowercase letters, numbers and hyphens',
		fr: "Uniquement lettres minuscules, chiffres et traits d'union",
		es: 'Solo letras minúsculas, números y guiones'
	},
	'journeys_admin.field.map': { pt: 'Mapa', en: 'Map', fr: 'Carte', es: 'Mapa' },
	'journeys_admin.back': { pt: '← jornadas', en: '← journeys', fr: '← parcours', es: '← recorridos' },
	'journeys_admin.preview': { pt: 'Pré-visualizar', en: 'Preview', fr: 'Aperçu', es: 'Vista previa' },
	'journeys_admin.unsaved': {
		pt: 'Alterações por salvar',
		en: 'Unsaved changes',
		fr: 'Modifications non enregistrées',
		es: 'Cambios sin guardar'
	},
	'journeys_admin.saved': { pt: 'Salvo', en: 'Saved', fr: 'Enregistré', es: 'Guardado' },
	'journeys_admin.untitled': { pt: 'Sem título', en: 'Untitled', fr: 'Sans titre', es: 'Sin título' },
	'journeys_admin.section.details': { pt: 'Dados', en: 'Details', fr: 'Détails', es: 'Datos' },
	'journeys_admin.section.phases': { pt: 'Fases', en: 'Phases', fr: 'Phases', es: 'Fases' },
	'journeys_admin.section.steps': { pt: 'Passos', en: 'Steps', fr: 'Étapes', es: 'Pasos' },
	'journeys_admin.phases_lede': {
		pt: 'As fases agrupam os passos. O resumo vira o cartão que encerra a fase; sem resumo, não há cartão.',
		en: 'Phases group the steps. The summary becomes the card that closes the phase; with no summary there is no card.',
		fr: "Les phases regroupent les étapes. Le résumé devient la carte qui clôt la phase ; sans résumé, pas de carte.",
		es: 'Las fases agrupan los pasos. El resumen se convierte en la tarjeta que cierra la fase; sin resumen no hay tarjeta.'
	},
	'journeys_admin.phases_empty': {
		pt: 'Nenhuma fase ainda.',
		en: 'No phases yet.',
		fr: "Aucune phase pour l'instant.",
		es: 'Aún no hay fases.'
	},
	'journeys_admin.add_phase': { pt: 'Adicionar fase', en: 'Add phase', fr: 'Ajouter une phase', es: 'Añadir fase' },
	'journeys_admin.phase_n': { pt: 'Fase {0}', en: 'Phase {0}', fr: 'Phase {0}', es: 'Fase {0}' },
	'journeys_admin.field.phase_summary': {
		pt: 'Resumo ao concluir',
		en: 'Summary at the end',
		fr: 'Résumé à la fin',
		es: 'Resumen al concluir'
	},
	'journeys_admin.field.phase_needed': {
		pt: 'Documentos necessários para seguir',
		en: 'Documents needed to continue',
		fr: 'Documents requis pour continuer',
		es: 'Documentos necesarios para seguir'
	},
	'journeys_admin.phase_in_use': {
		pt: 'Há passos nesta fase: mude-os antes de removê-la.',
		en: 'This phase has steps: move them before removing it.',
		fr: 'Cette phase a des étapes : déplacez-les avant de la supprimer.',
		es: 'Esta fase tiene pasos: muévalos antes de eliminarla.'
	},
	'journeys_admin.graph_hint': {
		pt: 'Arraste e use a roda do mouse para enquadrar. Clique nos nós e nas conexões para destacar.',
		en: 'Drag and use the mouse wheel to frame. Click nodes and connections to highlight them.',
		fr: 'Faites glisser et utilisez la molette pour cadrer. Cliquez sur les nœuds et les connexions pour les mettre en avant.',
		es: 'Arrastre y use la rueda del ratón para encuadrar. Haga clic en los nodos y las conexiones para destacarlos.'
	},
	'journeys_admin.select_step': {
		pt: 'Selecione um passo para enquadrar e destacar.',
		en: 'Select a step to frame and highlight.',
		fr: 'Sélectionnez une étape à cadrer et à mettre en avant.',
		es: 'Seleccione un paso para encuadrar y destacar.'
	},
	'journeys_admin.record_camera': { pt: 'Gravar câmera', en: 'Record camera', fr: 'Enregistrer la caméra', es: 'Grabar cámara' },
	'journeys_admin.auto_camera': { pt: 'Automática', en: 'Automatic', fr: 'Automatique', es: 'Automática' },
	'journeys_admin.camera_recorded': { pt: 'Câmera gravada', en: 'Camera recorded', fr: 'Caméra enregistrée', es: 'Cámara grabada' },
	'journeys_admin.camera_auto': {
		pt: 'Câmera automática: enquadra o destaque',
		en: 'Automatic camera: frames the highlight',
		fr: 'Caméra automatique : cadre la mise en avant',
		es: 'Cámara automática: encuadra el destacado'
	},
	'journeys_admin.camera_moved': {
		pt: 'Enquadramento por gravar',
		en: 'Framing not recorded',
		fr: 'Cadrage non enregistré',
		es: 'Encuadre sin grabar'
	},
	'journeys_admin.highlight_count': {
		pt: '{0} nós · {1} conexões',
		en: '{0} nodes · {1} connections',
		fr: '{0} nœuds · {1} connexions',
		es: '{0} nodos · {1} conexiones'
	},
	'journeys_admin.add_step': { pt: 'Adicionar passo', en: 'Add step', fr: 'Ajouter une étape', es: 'Añadir paso' },
	'journeys_admin.steps_empty': {
		pt: 'Nenhum passo ainda.',
		en: 'No steps yet.',
		fr: "Aucune étape pour l'instant.",
		es: 'Aún no hay pasos.'
	},
	'journeys_admin.field.phase': { pt: 'Fase', en: 'Phase', fr: 'Phase', es: 'Fase' },
	'journeys_admin.field.duration': { pt: 'Duração', en: 'Duration', fr: 'Durée', es: 'Duración' },
	'journeys_admin.field.body': { pt: 'Texto', en: 'Text', fr: 'Texte', es: 'Texto' },
	'journeys_admin.documents_lede': {
		pt: 'O inventário que o visitante vê crescer ao longo da jornada.',
		en: 'The inventory the visitor watches grow along the journey.',
		fr: "L'inventaire que le visiteur voit grandir au fil du parcours.",
		es: 'El inventario que el visitante ve crecer a lo largo del recorrido.'
	},
	'journeys_admin.documents_empty': {
		pt: 'Nenhum documento ainda.',
		en: 'No documents yet.',
		fr: "Aucun document pour l'instant.",
		es: 'Aún no hay documentos.'
	},
	'journeys_admin.add_document': { pt: 'Adicionar documento', en: 'Add document', fr: 'Ajouter un document', es: 'Añadir documento' },
	'journeys_admin.field.doc_label': { pt: 'Nome', en: 'Name', fr: 'Nom', es: 'Nombre' },
	'journeys_admin.field.doc_abbrev': { pt: 'Abreviação', en: 'Abbreviation', fr: 'Abréviation', es: 'Abreviatura' },
	'journeys_admin.field.doc_unlocked_at': { pt: 'Aparece no passo', en: 'Appears at step', fr: "Apparaît à l'étape", es: 'Aparece en el paso' },
	'journeys_admin.doc_held': { pt: 'Já em mãos no início', en: 'Held from the start', fr: 'Détenu dès le début', es: 'En posesión desde el inicio' },
	'journeys_admin.confirm_map_title': { pt: 'Trocar de mapa?', en: 'Change map?', fr: 'Changer de carte ?', es: '¿Cambiar de mapa?' },
	'journeys_admin.confirm_map_desc': {
		pt: 'As câmeras e os destaques de todos os passos serão limpos: as posições são de cada mapa.',
		en: "Every step's camera and highlight will be cleared: positions belong to each map.",
		fr: 'Les caméras et mises en avant de toutes les étapes seront effacées : les positions sont propres à chaque carte.',
		es: 'Las cámaras y los destacados de todos los pasos se borrarán: las posiciones son de cada mapa.'
	},
	'journeys_admin.confirm_map_action': { pt: 'Trocar', en: 'Change', fr: 'Changer', es: 'Cambiar' },
	'journeys_admin.confirm_unpublish_title': {
		pt: 'Despublicar com alterações por salvar?',
		en: 'Unpublish with unsaved changes?',
		fr: 'Dépublier avec des modifications non enregistrées ?',
		es: '¿Despublicar con cambios sin guardar?'
	},
	'journeys_admin.confirm_unpublish_desc': {
		pt: 'A jornada sai do site agora. As alterações ficam aqui no editor, por salvar.',
		en: 'The journey leaves the site now. Your changes stay here in the editor, unsaved.',
		fr: "Le parcours quitte le site maintenant. Vos modifications restent ici dans l'éditeur, non enregistrées.",
		es: 'El recorrido sale del sitio ahora. Los cambios quedan aquí en el editor, sin guardar.'
	},
	'journeys_admin.leave_title': { pt: 'Sair sem salvar?', en: 'Leave without saving?', fr: 'Quitter sans enregistrer ?', es: '¿Salir sin guardar?' },
	'journeys_admin.leave_desc': {
		pt: 'As alterações por salvar serão perdidas.',
		en: 'Unsaved changes will be lost.',
		fr: 'Les modifications non enregistrées seront perdues.',
		es: 'Los cambios sin guardar se perderán.'
	},
	'journeys_admin.leave_action': { pt: 'Sair', en: 'Leave', fr: 'Quitter', es: 'Salir' },
	'journeys_admin.preview_banner': {
		pt: 'Pré-visualização: a jornada como o visitante a vê.',
		en: 'Preview: the journey as a visitor sees it.',
		fr: 'Aperçu : le parcours tel que le visiteur le voit.',
		es: 'Vista previa: el recorrido como lo ve el visitante.'
	},
	'journeys_admin.back_to_editor': { pt: '← voltar ao editor', en: '← back to the editor', fr: "← retour à l'éditeur", es: '← volver al editor' },
	'journeys_admin.error.save': {
		pt: 'Erro ao salvar a jornada.',
		en: 'Failed to save the journey.',
		fr: "Échec de l'enregistrement du parcours.",
		es: 'Error al guardar el recorrido.'
	},
	'journeys_admin.error.load': {
		pt: 'Não foi possível abrir esta jornada.',
		en: 'This journey could not be opened.',
		fr: "Impossible d'ouvrir ce parcours.",
		es: 'No se pudo abrir este recorrido.'
	},
	'journeys_admin.error.slug_taken': {
		pt: 'Já existe uma jornada com este slug.',
		en: 'A journey with this slug already exists.',
		fr: 'Un parcours avec ce slug existe déjà.',
		es: 'Ya existe un recorrido con este slug.'
	},
	'journeys_admin.error.title_required': {
		pt: 'Falta o título em {0}.',
		en: 'The title in {0} is missing.',
		fr: 'Le titre en {0} manque.',
		es: 'Falta el título en {0}.'
	},
	'journeys_admin.error.step_title_required': {
		pt: 'Falta o título em {0} no passo selecionado.',
		en: 'The selected step is missing its title in {0}.',
		fr: "Il manque le titre en {0} de l'étape sélectionnée.",
		es: 'Falta el título en {0} en el paso seleccionado.'
	},
	'journeys_admin.error.no_steps': {
		pt: 'Uma jornada sem passos não pode ser publicada.',
		en: 'A journey with no steps cannot be published.',
		fr: 'Un parcours sans étape ne peut pas être publié.',
		es: 'Un recorrido sin pasos no se puede publicar.'
	}
} as const satisfies Record<string, Record<LocaleCode, string>>;

export type MessageKey = keyof typeof messages;
