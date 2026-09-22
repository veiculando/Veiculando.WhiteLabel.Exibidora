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
 * Whitelist de permissoes — espelha `WlPermissoesValidas` no dominio.
 * Sao os 5 identificadores exatos aceitos pelo BFF em `POST/PUT /api/wl/usuarios`;
 * qualquer outro valor volta como 400.
 */
export const PERMISSOES_WL = [
  'PecaGerenciar',
  'Checking',
  'PedidoReservaGerenciar',
  'PedidoInsercaoGerenciar',
  'UsuarioAfiliadaGerenciar',
] as const;

export type PermissaoWl = (typeof PERMISSOES_WL)[number];

export const PERMISSOES_WL_ROTULOS: Record<PermissaoWl, string> = {
  PecaGerenciar: 'Gerenciar locais e peças',
  Checking: 'Enviar checking',
  PedidoReservaGerenciar: 'Gerenciar pedidos de reserva',
  PedidoInsercaoGerenciar: 'Consultar pedidos de inserção',
  UsuarioAfiliadaGerenciar: 'Gerenciar operadores',
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
export const TOM_STATUS_PEDIDO_INSERCAO: Record<string, 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario'> = {
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
 * Ainda sem controller no BFF (checado em 2026-09-22 contra
 * `Veiculando.WhiteLabel.Api/Controllers`: só existe `CheckingController`,
 * que é o fluxo de upload de foto por PI/item — não esta listagem
 * supervisória). Modelado aqui contra a interface que o Figma pede
 * (`184:2` listagem, `184:501` detalhe), nos moldes de
 * `PedidosInsercaoController` (mesmo envelope de paginação, mesmos nomes de
 * campo em camelCase, filtros na query string).
 *
 * SEM coluna Afiliada (regra do card — a listagem já é recortada por
 * tenant, uma coluna de afiliada não diz nada de novo aqui). `Período` é o
 * intervalo de datas de VEICULAÇÃO da PI (ex. `01/07–31/07`), não o período
 * comercial/id de período — os dois nomes (`periodoVeiculacaoInicio`/`Fim`)
 * deixam a distinção explícita no contrato.
 */
export interface CheckoutFiltro {
  idPeriodo?: number | null;
  status?: string | null;
  idCidade?: number | null;
  campanha?: string | null;
  anunciante?: string | null;
}

export interface CheckoutListItem {
  id: number;
  codigo: string;
  campanha: string | null;
  anunciante: string | null;
  cidade: string | null;
  itensPi: number;
  itensChecking: number;
  itensAprovados: number;
  itensRecebidos: number;
  periodoVeiculacaoInicio: string | null;
  periodoVeiculacaoFim: string | null;
  status: string;
}

export interface CheckoutFotoRecebida {
  url: string;
  dataEnvio: string;
}

export interface CheckoutAvaliacaoEvento {
  evento: string;
  timestamp: string;
  autor: string;
}

export interface CheckoutItemDetalhe {
  idPedidoItem: number;
  pecaCodigo: string | null;
  fotoUrl: string | null;
  endereco: string | null;
  /** Link externo para mapa (Google Maps etc.) — a UI só renderiza o link, nunca embute um mapa. */
  enderecoMapaUrl: string | null;
  statusItem: string;
  statusChecking: string | null;
  fotosRecebidas: CheckoutFotoRecebida[];
  historicoAvaliacao: CheckoutAvaliacaoEvento[];
}

/**
 * Detalhe de VEI-RD-91 (`184:501`). **VEI-RD-91d (decisão fechada): esta
 * sprint não renderiza "Aprovar Checking"/"Recusar Checking"** — nenhum
 * campo de ação de aprovação entra aqui de propósito; a tela é somente
 * leitura.
 */
export interface CheckoutDetalhe {
  id: number;
  codigo: string;
  campanha: string | null;
  anunciante: string | null;
  cidade: string | null;
  periodoVeiculacaoInicio: string | null;
  periodoVeiculacaoFim: string | null;
  status: string;
  itens: CheckoutItemDetalhe[];
}

// ---------------------------------------------------------------- Ordem de Serviço (VEI-RD-88)

/**
 * 4 valores do Figma. Nesta sprint toda OS nasce e permanece em `Aberta` —
 * não existe UI de transição de status nem rota `/atribuir`/`/reatribuir`
 * (regra dura, decisão humana 2026-09-17). Sem controller no BFF ainda
 * (checado em 2026-09-22); contrato modelado contra a interface esperada.
 */
export const STATUS_OS = ['Aberta', 'Atribuída', 'Em execução', 'Concluída'] as const;
export type StatusOs = (typeof STATUS_OS)[number];

export interface OsFiltro {
  idPeriodoInicial?: number | null;
  idPeriodoFinal?: number | null;
  status?: string | null;
  idResponsavel?: number | null;
}

/** Linha da listagem (`198:2`). `numero` alimenta o zero-padding `OS #0042`. */
export interface OsListItem {
  id: number;
  numero: number;
  periodoNome: string;
  cidades: string[];
  responsavelNome: string | null;
  responsavelAvatarUrl: string | null;
  pecasCount: number;
  status: string;
  criadaEm: string;
}

/** Filtro da tela de geração (`186:86`) — periodicidade e status reaproveitam os mesmos enums de VEI-RD-86. */
export interface OsGeracaoFiltro {
  periodicidade?: Periodicidade | null;
  idPeriodo?: number | null;
  idCidade?: number | null;
  status?: StatusPecaPeriodo | null;
}

/** As 4 opções de exibição da tela de geração — vão dentro do payload de criação, não só de UI local. */
export interface OsOpcoesExibicao {
  comQuadrosAnteriores: boolean;
  semResumoFinal: boolean;
  ordemInicial: boolean;
  ordemFinal: boolean;
}

/** Uma peça elegível para entrar na OS — colunas da tela de geração. */
export interface OsPecaElegivel {
  pecaId: number;
  codigo: string;
  tabu: string | null;
  rota: string | null;
  endereco: string | null;
  bairro: string | null;
  campanhaAtual: string | null;
  campanhaAnterior: string | null;
  outQtd: number | null;
  dataColagem: string | null;
  servico: string | null;
}

export interface OsCriarPayload {
  idPeriodo: number;
  idsPeca: number[];
  opcoes: OsOpcoesExibicao;
}

export interface OsCriadaResultado {
  id: number;
  numero: number;
  periodoNome: string;
  pecasCount: number;
}

/**
 * `POST /ordens-servico/{id}/entregar` — modo fixo `'impressa'` nesta
 * sprint. O modal de entrega (`187:1364`) só renderiza a opção "Impressa
 * (PDF)"; "Atribuir a um Colador" está fora do DOM (regra dura, decisão
 * humana 2026-09-17), então não existe um segundo `modo` para escolher.
 */
export interface OsEntregaResultado {
  message: string;
}

/** Linha da tabela "Peças incluídas nesta OS" (`198:546`). `dataColagem` e `statusColagem` são sempre "—"/"Pendente" nesta sprint — não existe tela de Colagem que os preencha. */
export interface OsPecaIncluida {
  codigo: string;
  endereco: string | null;
  bairro: string | null;
  campanhaAtual: string | null;
  dataColagem: string | null;
  statusColagem: string;
}

export interface OsHistoricoEvento {
  evento: string;
  timestamp: string;
  autor: string;
}

/**
 * Detalhe da OS (`198:546`). Sem `responsavelColador`/`podeReatribuir`: o
 * bloco "RESPONSÁVEL (COLADOR)" e o botão "REATRIBUIR COLADOR" não existem
 * nesta sprint (regra dura). `historico` é append-only, só exibição.
 */
export interface OsDetalhe {
  id: number;
  numero: number;
  status: string;
  periodoNome: string;
  cidades: string[];
  criadaEm: string;
  criadaPor: string | null;
  pecasCount: number;
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
