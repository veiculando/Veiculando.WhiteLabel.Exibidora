/**
 * Contratos de dados do BFF (`Veiculando.WhiteLabel.Api`).
 *
 * Cada interface aqui foi derivada LENDO o controller correspondente, nao o PRD
 * (diretriz 7 do TP-R4). Onde o payload do BFF divergir do que os planos
 * descrevem, o comentario registra a divergencia.
 */

// ---------------------------------------------------------------- Auth

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  expiresInMinutes: number;
  nome: string;
  email: string;
  permissoes: string[];
}

export interface MensagemResposta {
  message: string;
}

/** `POST /api/wl/auth/esqueci-senha`. */
export interface EsqueciSenhaRequest {
  email: string;
}

/** `POST /api/wl/auth/alterar-senha`. */
export interface AlterarSenhaRequest {
  email: string;
  token: string;
  novaSenha: string;
}

/** `POST /api/wl/auth/primeiro-acesso`. */
export interface PrimeiroAcessoRequest {
  email: string;
  token: string;
  novaSenha: string;
}

export interface OperadorLogado {
  id: number;
  nome: string;
  email: string;
  cargo: string | null;
  departamento: string | null;
  telefoneComercial: string | null;
  dataUltimoLogin: string | null;
  permissoes: string[];
}

/**
 * Whitelist de permissoes — espelha `WlPermissoesValidas` no dominio, item a
 * item (lista canonica, VEI-RD-93). Sao os identificadores exatos aceitos
 * pelo BFF em `POST/PUT /api/wl/usuarios`; qualquer outro valor volta como 400.
 *
 * "Checking" foi reconciliado para "CheckingGerenciar" — unico nome sem verbo
 * no repo ate entao (convencao <Entidade><Verbo>). Usuarios com a claim
 * antiga sao migrados via RenomearCheckingEGrantProgramacaoVisualizar no
 * dominio; nenhuma acao e necessaria aqui alem de nao oferecer mais
 * "Checking" na tela.
 * Whitelist de permissoes — espelha `WlPermissoesValidas` no dominio.
 * Sao os identificadores exatos aceitos pelo BFF em `POST/PUT /api/wl/usuarios`;
 * qualquer outro valor volta como 400.
 * `RelatorioExportar` (VEI-RD-92) fica FORA desta lista de propósito: é uma
 * permissão real no BFF (protege `GET /api/wl/relatorios/exportar`), mas não
 * existe uma rota própria de "exportar" para ela governar — é uma ação
 * dentro da tela de Relatórios, não uma tela. `app.routes.spec.ts` mantém a
 * whitelist e as permissões declaradas em rotas em bijeção exata; incluir
 * aqui uma permissão sem rota quebraria essa checagem sem necessidade real
 * (nenhuma tela usaria o rótulo). Atribuí-la a um operador continua possível
 * — só não é validada pela whitelist do frontend.
 * Sao os 6 identificadores exatos aceitos pelo BFF em `POST/PUT /api/wl/usuarios`
 * que já têm rota/feature nesta sprint; qualquer outro valor volta como 400.
 *
 * `CheckingGerenciar` (não `'Checking'`): reconciliado no domínio em
 * VEI-RD-93 — confirmado lendo `WlPermissoesValidas.cs` real no workspace
 * irmão `Veiculando` em 2026-09-22 (`"Checking" era a única exceção no repo
 * e foi reconciliada para "CheckingGerenciar"`). Usar o nome antigo aqui
 * fazia o `authGuard` nunca bater contra a claim real do JWT — ninguém
 * conseguia abrir `/checking` nem `/checkout`.
 * `ProgramacaoVisualizar` (VEI-RD-86e): `ProgramacaoController.cs` real já
 * exige essa policy (`[Authorize(Policy = AuthorizationSetup.ProgramacaoVisualizar)]`)
 * — a rota `/programacao` passou a declará-la também, mesmo padrão de
 * `/checking`/`/checkout` neste arquivo.
 * `WlPermissoesValidas.Lista` no domínio tem 10 entradas no total
 * (`ClienteGerenciar`, `PedidoCriar`, `FinanceiroVisualizar`,
 * `RelatorioExportar` além destas 6) — as outras 4 ainda não têm
 * rota/feature correspondente nesta sprint, então ficam de fora desta
 * whitelist por ora.
 */
export const PERMISSOES_WL = [
  'PecaGerenciar',
  'CheckingGerenciar',
  'PedidoReservaGerenciar',
  'PedidoInsercaoGerenciar',
  'UsuarioAfiliadaGerenciar',
  // VEI-RD-79/80/51 (Agências, Análise KYC, Campanhas) e VEI-RD-83 (Prospecção).
  // Os dois já existem em WlPermissoesValidas no domínio — o teste
  // WlPermissoesCanonicasTests documenta, em comentário, que ClienteGerenciar é
  // de VEI-RD-46 *e* VEI-RD-79, e que PedidoCriar seria o de Prospecção. Esta
  // lista precisa espelhar aquela item a item; o que faltava era este lado.
  'ClienteGerenciar',
  'PedidoCriar',
  'ProgramacaoVisualizar',
  'FinanceiroVisualizar',
  'RelatorioExportar',
] as const;

export type PermissaoWl = (typeof PERMISSOES_WL)[number];

export const PERMISSOES_WL_ROTULOS: Record<PermissaoWl, string> = {
  PecaGerenciar: 'Gerenciar locais e peças',
  CheckingGerenciar: 'Enviar checking',
  PedidoReservaGerenciar: 'Gerenciar pedidos de reserva',
  PedidoInsercaoGerenciar: 'Consultar pedidos de inserção',
  UsuarioAfiliadaGerenciar: 'Gerenciar operadores',
  ClienteGerenciar: 'Gerenciar anunciantes, agências e análises de KYC',
  PedidoCriar: 'Abrir sessão de prospecção',
  ProgramacaoVisualizar: 'Visualizar programação',
  FinanceiroVisualizar: 'Visualizar financeiro',
  RelatorioExportar: 'Exportar relatórios',
};

// ---------------------------------------------------------------- Dashboard

/**
 * `GET /api/wl/dashboard/kpis`.
 *
 * ATENCAO ao nome `alertasAprovaçãoPendente`: o `DashboardController` declara a
 * propriedade anonima como `AlertasAprovaçãoPendente` (com cedilha e til) e o
 * `AddControllers()` do BFF usa a policy camelCase padrao do System.Text.Json,
 * que apenas minuscula a primeira letra. O acento portanto CHEGA no JSON.
 * Nao "corrigir" para `alertasAprovacaoPendente` — o campo viria undefined.
 */
export interface DashboardKpis {
  locaisAtivos: number;
  pecasEmExibicao: number;
  pedidosPendentes: number;
  'alertasAprovaçãoPendente': number;
}

// ---------------------------------------------------------------- Locais e pecas

/**
 * `StatusExibicao` do core. O BFF nao devolve esse campo nas listagens de local
 * hoje; ver `LocalListItem.statusExibicao`.
 */
export enum StatusExibicao {
  Deletado = -1,
  Inativo = 0,
  Ativo = 1,
  AprovacaoPendente = 2,
}

export const STATUS_EXIBICAO_ROTULOS: Record<number, string> = {
  [StatusExibicao.Deletado]: 'Excluído',
  [StatusExibicao.Inativo]: 'Inativo',
  [StatusExibicao.Ativo]: 'Ativo',
  [StatusExibicao.AprovacaoPendente]: 'Aguardando aprovação',
};

export interface LocalListItem {
  id: number;
  codigo: string;
  descricao: string;
  cidade: string | null;
  uf: string | null;
  fonteOrigem: number | null;
  fonteTimestamp: string | null;
  /**
   * Opcional porque depende da versao do BFF: o `GetAll` original projetava
   * apenas locais Ativos e nao expunha o status. A UI trata `undefined` como
   * Ativo para nao rotular errado contra um BFF antigo.
   */
  statusExibicao?: number;
}

/**
 * `GET /api/wl/locais/{id}` — inclui todos os campos editáveis.
 *
 * Precisa trazer endereço e geolocalização porque o ramo de edição do core
 * sobrescreve esses campos com o que o command enviar, sem mesclar: preencher o
 * formulário a partir de um payload incompleto apagaria os dados ao salvar.
 */
export interface LocalDetalhe extends LocalListItem {
  idCidade: number | null;
  codigoInterno: string | null;
  palavrasChave: string | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    complemento: string | null;
    referencia: string | null;
    cep: { numero: string | null } | null;
  } | null;
  geolocalizacao: { latitude: number; longitude: number } | null;
  /** `WlUsuario.Id` do operador que originou o registro (ADR-WL-003). */
  fonteUsuarioId: number | null;
}

/**
 * Payload de `POST /api/wl/locais` e `PUT /api/wl/locais/{id}`.
 *
 * Espelha o `LocalCadastroCommand` do core, com uma diferença importante: os
 * campos que o servidor controla — `idAfiliada`, `idUsuario` e toda a trilha de
 * origem (`fonteOrigem`, `fonteAgenciaId`, `fonteUsuarioId`) — **não** entram
 * aqui. O BFF os preenche a partir do tenant e do JWT e ignora o que vier do
 * cliente; enviá-los daria a falsa impressão de que a UI os escolhe.
 */
export interface LocalFormPayload {
  idCidade: number;
  descricao: string;
  codigoInterno: string;
  palavrasChave: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    complemento: string;
    referencia: string;
    cep: { numero: string };
  };
  geolocalizacao: {
    latitude: number;
    longitude: number;
  };
}

export interface PecaListItem {
  id: number;
  codigo: string;
  idLocal: number;
  localCodigo: string | null;
  formatoDimensao: string | null;
  valorPadrao: number | null;
  fonteOrigem: number | null;
}

// ---------------------------------------------------------------- Lookups

export interface CidadeLookup {
  id: number;
  nome: string;
  sigla: string;
}

export interface PeriodoLookup {
  id: number;
  nome: string;
  dataInicio: string;
  dataFim: string;
}

export interface NomeadoLookup {
  id: number;
  nome: string;
}

/** `GET /api/wl/lookups/mapa-config` (VEI-RD-87) — `null` quando o servidor não tem chave configurada. */
export interface MapaConfig {
  googleMapsApiKey: string | null;
}

// ---------------------------------------------------------------- Programacao

/**
 * Envelope de paginação das listagens do BFF.
 *
 * As listagens de PI, reserva e programação devolviam a coleção inteira. O
 * servidor agora limita a página (teto de 100) e devolve o total para a UI
 * montar o rodapé — o `pageSize` que volta pode ser menor que o pedido.
 */
export interface PaginaWl<T> {
  itens: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPaginas: number;
}

/** Parâmetros de paginação aceitos pelas listagens. */
export interface PaginaFiltro {
  page?: number;
  pageSize?: number;
  sort?: string;
  desc?: boolean;
}

export interface ProgramacaoFiltro {
  idPeriodo?: number | null;
  idLocal?: number | null;
}

export interface ProgramacaoItem {
  pecaId: number;
  pecaCodigo: string;
  localId: number;
  localCodigo: string;
  periodoId: number;
  periodoNome: string;
  status: string;
}

/**
 * `PeriodicidadeEnum` do core (`Veiculando.Domain.Enums`) — valores numéricos,
 * porque o BFF não registra `JsonStringEnumConverter`
 * (`Veiculando.WhiteLabel.Api/Startup.cs`, `services.AddControllers()` puro):
 * o `System.Text.Json` padrão serializa/desserializa enum como número.
 */
export enum Periodicidade {
  Semanal = 1,
  Bissemanal = 2,
  Mensal = 3,
}

export const PERIODICIDADE_ROTULOS: Record<Periodicidade, string> = {
  [Periodicidade.Semanal]: 'Semanal',
  [Periodicidade.Bissemanal]: 'Bissemana',
  [Periodicidade.Mensal]: 'Mensal',
};

/**
 * `StatusPecaPeriodoEnum` do core — também numérico na ida (filtro), mas o
 * `ProgramacaoController.ListarGrade` projeta `Status = x.Status.ToString()`
 * na volta, então a grade recebe o NOME cru do enum (sem acento, com o typo
 * `Ckecking` que existe no domínio — `StatusPecaPeriodoEnum.cs`).
 *
 * `Disponivel` não tem rótulo/tom aqui porque não aparece: a query do BFF lê
 * `PecaPeriodoStatus`, que só tem linha para peça×período já tocados por um
 * pedido; a célula livre simplesmente não existe na resposta e a UI mostra
 * "—" pela ausência, não por um status "Disponível" explícito.
 */
export enum StatusPecaPeriodo {
  Indisponivel = -1,
  Disponivel = 0,
  Solicitada = 1,
  Reservada = 2,
  Autorizada = 3,
  MidiaRecebida = 4,
  Ckecking = 5,
  Faturado = 6,
}

/**
 * Rótulo de exibição por nome cru do enum (como a grade devolve) — cobre os
 * 5 status oficiais da legenda (VEI-RD-86: Solicitado, Reservado, Autorizado,
 * Faturado, Indisponível) mais os dois estados intermediários do domínio que
 * não têm entrada na legenda mas podem aparecer numa célula.
 */
export const STATUS_PECA_PERIODO_ROTULOS: Record<string, string> = {
  Indisponivel: 'Indisponível',
  Solicitada: 'Solicitado',
  Reservada: 'Reservado',
  Autorizada: 'Autorizado',
  MidiaRecebida: 'Mídia recebida',
  Ckecking: 'Checking',
  Faturado: 'Faturado',
};

/**
 * Os 5 status oficiais da legenda da grade (VEI-RD-86, PRD literal) — chave
 * é o nome cru do enum (o que a grade realmente devolve), valor é o rótulo
 * exibido. Marcador colorido + texto sempre juntos, nunca só a cor (PRD §7).
 */
export const LEGENDA_STATUS_PROGRAMACAO: { chave: string; rotulo: string }[] = [
  { chave: 'Solicitada', rotulo: 'Solicitado' },
  { chave: 'Reservada', rotulo: 'Reservado' },
  { chave: 'Autorizada', rotulo: 'Autorizado' },
  { chave: 'Faturado', rotulo: 'Faturado' },
  { chave: 'Indisponivel', rotulo: 'Indisponível' },
];

/**
 * Filtro da grade de VEI-RD-86 — espelha `ProgramacaoFiltroDto`
 * (`ProgramacaoController.cs`). `idPeriodoInicial`/`idPeriodoFinal` são
 * sempre ids de `PeriodoLookup` (nunca uma data livre — PRD explícito). A
 * validação "período inicial deve ser anterior ou igual ao período final" é
 * feita no servidor, contra a data real do período (id de período não é
 * sequencial por data); o servidor devolve `MsgPeriodoInvertido` em 400
 * quando a ordem está errada, e é essa string exata que a UI mostra.
 */
export interface ProgramacaoGradeFiltro {
  periodicidade?: Periodicidade | null;
  idPeriodoInicial?: number | null;
  idPeriodoFinal?: number | null;
  status?: StatusPecaPeriodo | null;
  idCidade?: number | null;
  anunciante?: string | null;
}

/**
 * Mensagem exata devolvida pelo BFF quando período inicial > período final —
 * espelha `ProgramacaoController.MsgPeriodoInvertido`. O frontend compara a
 * string, então não pode divergir por um caractere.
 */
export const MSG_PERIODO_INVERTIDO = 'Período inicial deve ser anterior ou igual ao período final';

/**
 * Uma linha bruta da grade de VEI-RD-86, como o BFF devolve hoje (uma
 * célula peça×período por item — `ProgramacaoController.ListarGrade`).
 *
 * `pecaCodigoInterno`, `fotoUrl`, `endereco` e `bairro` são as colunas fixas
 * que o Figma (`184:1117`) pede além de código/local; o commit atual do BFF
 * (VEI-RD-86a) ainda não as projeta — ficam `undefined` até o backend
 * acrescentar. A UI trata a ausência como "—", nunca quebra.
 */
export interface ProgramacaoGradeItem {
  pecaId: number;
  pecaCodigo: string;
  pecaCodigoInterno?: string | null;
  fotoUrl?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  localId: number;
  localCodigo: string;
  periodoId: number;
  periodoNome: string;
  status: string;
}

// ---------------------------------------------------------------- Checking

export interface PiAutorizada {
  id: number;
  codigo: string;
  dataCadastro: string;
  valorLiquidoVeiculacao: number | null;
}

export interface PiChecking extends PiAutorizada {
  itensCount: number;
}

export interface ItemChecking {
  idPedidoItem: number;
  idPedidoInsercao: number;
  status: string;
  pecaCodigo?: string | null;
  localCodigo?: string | null;
  localDescricao?: string | null;
  statusChecking?: string | null;
}

// ---------------------------------------------------------------- Pedidos

export interface PedidoReservaListItem {
  id: number;
  codigo: string;
  status: string;
  dataCadastro: string;
  agencia: string | null;
  cliente: string | null;
  itensCount: number;
}

/** Status oficiais da reserva (PRD §5.8) nos tons do Figma: pendente âmbar, aprovada verde. */
export const TOM_STATUS_PEDIDO_RESERVA: Record<string, 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' | 'info'> = {
  Solicitado: 'aviso',
  Revisado: 'info',
  Confirmado: 'sucesso',
  'Itens Indisponíveis': 'perigo',
  Cancelado: 'perigo',
  Reservado: 'sucesso',
  Indisponível: 'perigo',
};

export interface PedidoReservaItemDetalhe {
  id: number;
  pecaCodigo: string | null;
  localCodigo: string | null;
  status: string;
}

/**
 * Decisão de um item na resposta ao pedido.
 *
 * O BFF exige uma entrada por item pendente — nem a mais, nem a menos. Omitir
 * um item o deixaria pendente para sempre com o pedido já marcado como
 * respondido, então a validação é do servidor e a UI precisa enviar todos.
 */
export interface PedidoReservaItemDecisao {
  idItemPedidoReserva: number;
  aceitar: boolean;
  /** Peças oferecidas como alternativa na recusa; precisam ser desta exibidora. */
  idsPecaSugerida?: number[];
}

export interface PedidoReservaRespostaResultado {
  message: string;
  aceitos: number;
  rejeitados: number;
}

export interface PedidoReservaDetalhe {
  id: number;
  codigo: string;
  status: string;
  dataCadastro: string;
  agencia: string | null;
  cliente: string | null;
  valorTotalBruto: number | null;
  itens: PedidoReservaItemDetalhe[];
}

/**
 * `StatusPedidoInsercaoEnum` do core — os 6 status oficiais do domínio
 * (VEI-RD-94). Literal do enum: nenhum rótulo do Figma (`Faturado`,
 * `Aguardando Assinatura`, `Confirmado`, `Em Produção`, `Veiculando`) existe
 * aqui — o `PedidosInsercaoController.GetAll` rejeita com 400 qualquer valor
 * fora desta lista.
 */
export const STATUS_PEDIDO_INSERCAO = [
  'Novo',
  'Aprovado',
  'Checking',
  'Veiculado',
  'Rejeitado',
  'Cancelado',
] as const;

export type StatusPedidoInsercao = (typeof STATUS_PEDIDO_INSERCAO)[number];

/**
 * Tom do `aurum-status-pill` por status oficial de PI — reaproveitado por
 * VEI-RD-94 (listagem de PIs) e VEI-RD-91 (Check out, que também trabalha em
 * cima do status da PI). O rótulo é sempre o nome cru do enum (já em
 * português, sem acento faltando) — não existe mapeamento de texto aqui.
 */
export const TOM_STATUS_PEDIDO_INSERCAO: Record<string, 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' | 'info'> = {
  Novo: 'neutro',
  Aprovado: 'primario',
  Checking: 'aviso',
  Veiculado: 'sucesso',
  Rejeitado: 'perigo',
  Cancelado: 'perigo',
};

/**
 * `GET /api/wl/pedidos-insercao` — espelha `PedidosInsercaoController.GetAll`.
 *
 * `cidade` e as datas de veiculação (`periodoInicio`/`periodoFim`) são pedidas
 * pelo Figma (`154:7083`) mas o commit atual do BFF ainda não as projeta na
 * listagem (só filtra por `idPeriodoInicial`/`idPeriodoFinal`, sem devolver o
 * período nem a cidade da PI) — a UI mostra "—" até o backend acrescentar.
 * `agencia` já vem sempre preenchida pelo servidor (nunca null): PI sem
 * agência real recebe o nome da agência-espelho
 * `AgenciaVendaDiretaProvisionamento.NomeFantasia` = "Venda Direta (Sem Agência)".
 */
export interface PedidoInsercaoListItem {
  id: number;
  codigo: string;
  dataCadastro: string;
  /** `Pedido.DataCadastro` — data do pedido original, distinta da data da PI. */
  dataPedido: string;
  status: string;
  campanha: string | null;
  agencia: string;
  anunciante: string | null;
  valorLiquidoVeiculacao: number | null;
  itensCount: number;
  cidade?: string | null;
  periodoInicio?: string | null;
  periodoFim?: string | null;
}

/** Uma entrada de `resumo.porStatus` — sempre os 6 status oficiais, mesmo com quantidade 0. */
export interface PedidoInsercaoResumoStatus {
  status: string;
  quantidade: number;
  valor: number;
}

/**
 * `resumo` da mesma resposta de `GET /api/wl/pedidos-insercao` (não um
 * `/resumo` separado — `PedidosInsercaoController.MontarResumoAsync` calcula
 * sobre a MESMA query filtrada, antes do Skip/Take, para nunca divergir da
 * lista). Os agregados mudam com o filtro; o cliente nunca soma em memória.
 *
 * `afiliadaId` é o que alimentaria o badge "Afiliada #4821" do cabeçalho
 * (`154:7083`) — o commit atual de `MontarResumoAsync` ainda não o projeta.
 * O frontend nunca inventa esse número: o badge só renderiza quando o campo
 * vier preenchido (ADR-WL-008 — a UI não conhece o tenant por conta própria,
 * o Host/JWT nunca expõe o id ao cliente hoje).
 */
export interface PedidosInsercaoResumo {
  afiliadaId?: number | null;
  totalPIs: number;
  totalPecas: number;
  valorLiquidoTotal: number;
  porStatus: PedidoInsercaoResumoStatus[];
}

/** Envelope de `GET /api/wl/pedidos-insercao`: página + resumo lado a lado. */
export interface PaginaPedidosInsercao extends PaginaWl<PedidoInsercaoListItem> {
  resumo: PedidosInsercaoResumo;
}

export type PedidosInsercaoOrdenacao =
  | 'dataPedido'
  | 'periodo'
  | 'cidade'
  | 'anunciante'
  | 'agencia'
  | 'campanha'
  | 'codigo'
  | 'status'
  | 'valor';

export interface PedidosInsercaoFiltro {
  busca?: string | null;
  status?: StatusPedidoInsercao | null;
  idPeriodoInicial?: number | null;
  idPeriodoFinal?: number | null;
}

// ---------------------------------------------------------------- Check out (VEI-RD-91)

/**
 * `StatusCheckingEnum` do core — 5 status oficiais. Nomes já limpos (sem
 * acento faltando), o `ToString()` cru serve como rótulo direto.
 */
export const STATUS_CHECKING = ['Iniciado', 'Finalizado', 'Aprovado', 'Recusado', 'Cancelado'] as const;
export type StatusChecking = (typeof STATUS_CHECKING)[number];

export const TOM_STATUS_CHECKING: Record<string, 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' | 'info'> = {
  // Tons do Figma `184:2`: Iniciado azul, Finalizado ouro, Aprovado verde.
  Iniciado: 'info',
  Finalizado: 'aviso',
  Aprovado: 'sucesso',
  Recusado: 'perigo',
  Cancelado: 'neutro',
};

/**
 * `GET /api/wl/checking` — espelha `CheckingController.GetAll` (lido no
 * código real do BFF em 2026-09-22, workspace irmão
 * `Veiculando.WhiteLabel.Api`). A rota é `api/wl/checking`, não
 * `api/wl/checkout` — `CheckingController` cobre as duas features
 * (upload de foto, já consumido por `checking.service.ts`, e esta listagem
 * supervisória de VEI-RD-91); a Angular ROUTE continua `/checkout` (nome do
 * card), só a URL do BFF é `checking`.
 *
 * SEM coluna Afiliada (a listagem já é recortada por tenant no servidor).
 *
 * O controller só tem UM campo de busca textual (`busca`, contra
 * Campanha.Nome OU Cliente.Nome) — não dois campos independentes de
 * campanha/anunciante como o Figma sugeria; a UI usa um único campo de
 * busca.
 */
export interface CheckoutFiltro {
  busca?: string | null;
  status?: string | null;
  idCidade?: number | null;
  idPeriodoInicial?: number | null;
  idPeriodoFinal?: number | null;
}

/**
 * Item da listagem. As 4 colunas numéricas (VEI-RD-91c, commit `e15a1d1`,
 * lido no BFF real em 2026-09-22): `itensPi` é o total de itens da PI
 * (comprados, tenham ou não entrado em checking); `itensChecados` é quantos
 * já entraram no fluxo (têm ao menos uma foto enviada — o antigo
 * `itensCount` renomeado); `itensAprovados`/`itensRecebidos` são o recorte
 * por status dentro desse subconjunto. `StatusCheckingItemEnum` só tem
 * Recusado/ErroGeolocalizacao/Recebido/Aprovado — não existe um terceiro
 * estado "em checking" distinto do "recebido"/"aprovado".
 *
 * Sem `periodo`: a listagem não projeta um intervalo de veiculação
 * agregado (só filtra por ele) — a coluna Período fica "—".
 */
export interface CheckoutListItem {
  id: number;
  status: string;
  dataCadastro: string;
  dataAtualizacao: string | null;
  piCodigo: string | null;
  campanha: string | null;
  anunciante: string | null;
  itensPi: number;
  itensChecados: number;
  itensAprovados: number;
  itensRecebidos: number;
  cidades: string[];
}

export interface CheckoutGeolocalizacao {
  latitude: number;
  longitude: number;
}

/**
 * Uma foto de checking, com seu estado ATUAL de avaliação —
 * `CheckingFoto.AvaliarFoto` sobrescreve o estado anterior no domínio, não
 * existe log append-only de avaliações passadas (documentado no
 * `CheckingController.GetById`). Por isso o detalhe renderiza um card por
 * foto (estado corrente), não uma timeline de eventos.
 */
export interface CheckoutFoto {
  id: number;
  downloadUrl: string;
  status: string;
  nota: number | null;
  observacaoAvaliacao: string | null;
  observacaoPublicacao: string | null;
  geolocalizacao: CheckoutGeolocalizacao | null;
  distanciaPeca: number | null;
  enviadaEm: string;
  avaliadaEm: string | null;
}

export interface CheckoutItemDetalhe {
  idPedidoItem: number;
  pecaCodigo: string | null;
  localCodigo: string | null;
  localDescricao: string | null;
  cidade: string | null;
  periodo: string | null;
  status: string;
  fotos: CheckoutFoto[];
}

/**
 * Detalhe de VEI-RD-91 (`184:501`). **VEI-RD-91d (decisão fechada): esta
 * sprint não renderiza "Aprovar Checking"/"Recusar Checking"** — nenhum
 * campo de ação de aprovação entra aqui de propósito; a tela é somente
 * leitura. `id` é sempre o int do checking (`GET /api/wl/checking/{id:int}`),
 * não um código de PI.
 */
export interface CheckoutDetalhe {
  id: number;
  status: string;
  dataCadastro: string;
  dataAtualizacao: string | null;
  piCodigo: string | null;
  campanha: string | null;
  anunciante: string | null;
  itens: CheckoutItemDetalhe[];
}

// ---------------------------------------------------------------- Ordem de Serviço (VEI-RD-88)

/**
 * `StatusOrdemServicoEnum` do core — 4 valores. Nesta sprint toda OS nasce e
 * permanece em `Aberta`: não existe, em nenhuma classe do domínio, gatilho
 * que transicione para os outros três (comentário do próprio enum no core).
 * Sem UI de transição nem rota `/atribuir`/`/reatribuir` (regra dura,
 * decisão humana 2026-09-17). Nomes crus do enum (sem espaço/acento — é o
 * que `Status.ToString()` devolve: `EmExecucao`, não `Em execução`).
 */
export const STATUS_OS = ['Aberta', 'Atribuida', 'EmExecucao', 'Concluida'] as const;
export type StatusOs = (typeof STATUS_OS)[number];

export const STATUS_OS_ROTULOS: Record<string, string> = {
  Aberta: 'Aberta',
  Atribuida: 'Atribuída',
  EmExecucao: 'Em execução',
  Concluida: 'Concluída',
};

/** Lido em `OrdensServicoController.GetAll` (workspace irmão do BFF, 2026-09-22). */
export interface OsFiltro {
  idPeriodoInicial?: number | null;
  idPeriodoFinal?: number | null;
  status?: string | null;
  idResponsavel?: number | null;
}

/**
 * Linha da listagem (`198:2`). `numeroFormatado` já vem pronto do domínio
 * (`OrdemServico.NumeroFormatado => $"OS #{Numero:D4}"`) — a UI renderiza
 * direto, sem zero-padding no cliente. Sem `responsavelAvatarUrl`: o BFF só
 * devolve o nome (`Responsavel?.Nome`); como não há atribuição de colador
 * nesta sprint, o campo é sempre `null` na prática.
 */
export interface OsListItem {
  id: number;
  numeroFormatado: string;
  periodo: string | null;
  cidades: string[];
  responsavel: string | null;
  pecasCount: number;
  status: string;
  dataCadastro: string;
}

/**
 * `POST /api/wl/ordens-servico` — espelha `OrdemServicoCriarRequest`
 * (`IdPeriodo`/`IdPecas`, sem campo de opções: o backend não recebe nem usa
 * as 4 opções de exibição da tela de geração — o PDF é gerado de forma fixa
 * pelo servidor). As opções continuam na UI por fidelidade ao Figma, mas
 * não fazem parte deste payload.
 */
export interface OsCriarPayload {
  idPeriodo: number;
  idPecas: number[];
}

/** Resposta de `POST /api/wl/ordens-servico`. Sem `periodo`: quem chama já conhece o período escolhido (é o mesmo enviado no payload). */
export interface OsCriadaResultado {
  id: number;
  numeroFormatado: string;
  pecasCount: number;
}

/** Linha da tabela "Peças incluídas nesta OS" (`198:546`), como `OrdensServicoController.MontarPecasDto` projeta. `dataColagem`/`statusColagem` são sempre `null`/"Pendente" nesta sprint. Sem `bairro`/`campanhaAtual`: o BFF não os projeta neste endpoint — a UI mostra "—". `localDescricao` é o que mais se aproxima de um endereço textual disponível. */
export interface OsPecaIncluida {
  codigo: string;
  localCodigo: string | null;
  localDescricao: string | null;
  cidade: string | null;
  dataColagem: string | null;
  statusColagem: string;
}

/** Espelha `OrdensServicoController.MontarHistoricoDto` (`Evento`/`DataHora`/`Usuario`). */
export interface OsHistoricoEvento {
  evento: string;
  dataHora: string;
  usuario: string | null;
}

/**
 * Detalhe da OS (`198:546`). Sem `responsavelColador`/`podeReatribuir`: o
 * bloco "RESPONSÁVEL (COLADOR)" e o botão "REATRIBUIR COLADOR" não existem
 * nesta sprint (regra dura). Sem `pecasCount` própria — o BFF não a projeta
 * em `GetById`; a UI usa `pecas.length`. `historico` é append-only, só
 * exibição.
 */
export interface OsDetalhe {
  id: number;
  numeroFormatado: string;
  status: string;
  periodo: string | null;
  cidades: string[];
  responsavel: string | null;
  criadaPor: string | null;
  dataCadastro: string;
  pecas: OsPecaIncluida[];
  historico: OsHistoricoEvento[];
}

// ---------------------------------------------------------------- Usuarios

export interface UsuarioWl {
  id: number;
  nome: string;
  email: string;
  cargo: string | null;
  departamento: string | null;
  telefoneComercial: string | null;
  dataUltimoLogin: string | null;
  statusConvite: 'Pendente' | 'Aceito';
  excluido: boolean;
  dataExclusao: string | null;
  permissoes: string[];
}

export interface UsuarioWlCreate {
  nome: string;
  email: string;
  cargo?: string | null;
  departamento?: string | null;
  telefoneComercial?: string | null;
  permissoes: string[];
}

/**
 * `PUT /api/wl/usuarios/{id}`.
 *
 * Atualização **parcial por campo**: o que for omitido preserva o valor atual no
 * servidor. Por isso todos os campos são opcionais — uma tela que edite apenas
 * permissões não zera o cargo do operador.
 *
 */
export interface UsuarioWlUpdate {
  nome?: string;
  cargo?: string | null;
  departamento?: string | null;
  telefoneComercial?: string | null;
  permissoes?: string[];
}

// ---------------------------------------------------------------- Valores de Peças (VEI-RD-54)

/** Espelha `AlteracaoValorTipoEnum` do Core — não reordenar. */
export enum AlteracaoValorTipo {
  Incremento = 1,
  Porcentagem = 2,
  ValorExato = 3,
}

/** `GET /api/wl/pecas/valores` — item da grade. */
export interface PecaValorListItem {
  id: number;
  codigo: string;
  codigoInterno: string | null;
  suporte: string | null;
  cidade: string | null;
  endereco: string | null;
  valorPadrao: number;
  statusExibicao: StatusExibicao;
}

export interface PecaValoresFiltro {
  idCidade?: number | null;
  idTipoSuporte?: number | null;
  status?: StatusExibicao | null;
  busca?: string;
}

/** `POST /api/wl/pecas/valores/alterar`. */
export interface PecasAlterarValoresRequest {
  pecasIds: number[];
  valor: number;
  tipoValor: AlteracaoValorTipo;
}

export interface PecaValorAlteracaoAuditoria {
  id: number;
  codigo: string;
  valorAnterior: number;
  valorNovo: number;
}

export interface PecasAlterarValoresResultado {
  message: string;
  quantidadeAfetada: number;
  alteracoes: PecaValorAlteracaoAuditoria[];
}

/** `POST /api/wl/pecas/valores/sazonais`. */
export interface PecasAlterarValoresSazonaisRequest {
  pecasIds: number[];
  periodosValor: { idPeriodo: number; valor: number }[];
}

// ---------------------------------------------------------------- Dashboard financeiro (VEI-RD-85/92)

/**
 * "Faturamento Previsto" — pendência do Humano (2026-09-16): nem a fórmula
 * nem a fonte foram definidas. `disponivel: false` é a resposta honesta do
 * BFF enquanto isso — nunca renderizar `valor` como se fosse receita real
 * quando `disponivel` é falso.
 */
export interface FaturamentoPrevisto {
  disponivel: boolean;
  valor: number | null;
  variacaoPercentualVsCicloAnterior: number | null;
}

export interface TaxaOcupacaoOOH {
  disponivel: boolean;
  /** Fórmula provisória (peças ocupadas / peças ativas) — pendente confirmação. */
  formulaProvisoria: boolean;
  percentual: number;
  pecasOcupadas: number;
  pecasAtivas: number;
}

export interface DemandasPendentes {
  /** Definição provisória (reserva em Solicitado + PI em Novo) — pendente confirmação. */
  formulaProvisoria: boolean;
  reservas: number;
  pedidosInsercao: number;
}

export interface DashboardFinanceiroKpis {
  periodo: {
    id: number;
    nome: string;
    dataInicio: string;
    dataFim: string;
    vigente: boolean;
  };
  faturamentoPrevisto: FaturamentoPrevisto;
  taxaOcupacaoOOH: TaxaOcupacaoOOH;
  campanhasAtivas: number;
  demandasPendentes: DemandasPendentes;
}

export interface DashboardReservaItem {
  id: number;
  codigo: string;
  status: string;
  agencia: string | null;
  cliente: string | null;
  campanha: string | null;
  itensCount: number;
  valorTotalBruto: number | null;
}

export interface DashboardPedidoInsercaoItem {
  id: number;
  codigo: string;
  status: string;
  anunciante: string | null;
  cidade: string | null;
  numeroDePecas: number;
  valorLiquidoVeiculacao: number | null;
}

// ---------------------------------------------------------------- Relatórios (VEI-RD-92)

export interface RelatorioContagemPorStatus {
  status: string;
  quantidade: number;
  valorLiquido?: number;
}

export interface RelatorioResumo {
  periodoId: number;
  faturamentoPrevisto: FaturamentoPrevisto;
  valorLiquidoVeiculacaoTotal: number;
  pedidosInsercao: {
    total: number;
    porStatus: RelatorioContagemPorStatus[];
  };
  reservas: {
    total: number;
    porStatus: RelatorioContagemPorStatus[];
  };
  pecasVeiculadas: number;
}
