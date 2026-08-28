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

export interface PedidoInsercaoListItem {
  id: number;
  codigo: string;
  dataCadastro: string;
  status: string;
  agencia: string | null;
  anunciante: string | null;
  valorLiquidoVeiculacao: number | null;
  /** Montado pelo BFF a partir de `FILE_SERVER_URL`; abrir em nova aba. */
  pdfUrl: string;
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
