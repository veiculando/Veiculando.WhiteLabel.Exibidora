/**
 * Modelos das telas comerciais e de KYC da sprint 10 — VEI-RD-79, 80, 81, 82, 51, 83.
 *
 * Os nomes espelham o JSON que o BFF devolve: camelCase, a serialização padrão do
 * ASP.NET (o BFF não configura naming policy). A única exceção são CHAVES de
 * dicionário (`KycResumo`), que o serializador não reescreve e chegam com o nome
 * do enum. As fixtures em `src/testing/contratos/` são respostas reais do preview
 * e travam este contrato nos testes.
 */

/** Página paginada devolvida por `WlPaginacao.Montar`. */
export interface Pagina<T> {
  itens: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPaginas: number;
}

/** `StatusVinculoEnum` do domínio: 0 = Inativo, 1 = Ativo. */
export type StatusVinculo = 0 | 1;

export interface AgenciaListItem {
  id: number;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  cidade: string;
  uf: string;
  email: string;
  telefone: string;
  status: StatusVinculo;
  /** Contagem agregada no servidor — nunca somada no navegador. */
  campanhas: number;
}

/** O detalhe não traz a contagem de campanhas — só a lista agrega. */
export interface AgenciaDetalhe extends Omit<AgenciaListItem, 'campanhas'> {
  site: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  logoUrl: string;
  bonificacaoVolume: number;
  observacoesAfiliada: string;
  dataVinculo: string;
  /** Espelho de venda direta: a ação de inativar não é desenhada para ela. */
  vendaDireta: boolean;
  anunciantesVinculados: {
    id: number;
    nome: string;
    razaoSocial: string;
    comissaoAgencia: number;
    dataInicioContrato: string;
    dataExpiracaoContrato: string;
  }[];
}

export interface AgenciaPorCnpj {
  id: number;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  jaVinculadaAEstaAfiliada: boolean;
  propostaDeVinculo: boolean;
}

/**
 * Campos do formulário de Agência.
 *
 * ⚠️ NÃO existe prazo de pagamento. O PRD §5.5 é explícito e o código confirma:
 * `AgenciaCadastroCommand` e a entidade `Agencia` não têm o campo — diferente de
 * `Cliente`, que tem. Um campo aqui não teria onde ser gravado.
 */
export interface AgenciaForm {
  nome: string;
  razaoSocial: string;
  cnpj: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  site: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  bonificacaoVolume: number;
  observacoesAfiliada: string;
}

/** `EstadoOnboardingEnum`. A fila enxerga 5 dos 7. */
export enum EstadoOnboarding {
  Rascunho = 0,
  PendenteVerificacao = 1,
  EmAnalise = 2,
  AjustesSolicitados = 3,
  Aprovado = 4,
  Rejeitado = 5,
  Suspenso = 6,
}

/** `TipoOrganizacaoEnum`. */
export enum TipoOrganizacao {
  Agencia = 0,
  Cliente = 1,
}

export interface KycFilaItem {
  id: number;
  tipo: TipoOrganizacao;
  estado: EstadoOnboarding;
  dataEnvio: string | null;
  analistaId: number | null;
  analistaNome: string | null;
  /**
   * `null` enquanto o KYC não foi aprovado — ver a lacuna de modelo documentada em
   * `KycController`. É `null`, e não string vazia, exatamente para a tela distinguir
   * "ainda não existe" de "veio em branco".
   */
  nome: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  responsavel: { nome: string; cpf: string; email: string } | null;
}

/** Contagem por estado, chaveada pelo nome do enum. */
export type KycResumo = Record<string, number>;

export interface KycDocumento {
  id: number;
  /** `TipoDocumentoOnboardingEnum`: 0 ContratoSocial, 1 Identificacao, 2 Procuracao. */
  tipo: number;
  /** `StatusDocumentoOnboardingEnum`: 0 Pendente, 1 Aprovado, 2 Rejeitado. */
  status: number;
  motivoPendencia: string | null;
}

export interface KycDecisaoHistorico {
  id: number;
  estado: EstadoOnboarding;
  justificativa: string | null;
  camposPendentesJson: string | null;
  dataHora: string;
  usuario: string | null;
}

export interface KycDetalhe {
  id: number;
  tipo: TipoOrganizacao;
  estado: EstadoOnboarding;
  dataEnvio: string | null;
  dataDecisao: string | null;
  idOrganizacao: number | null;
  analistaId: number | null;
  analistaNome: string | null;
  responsavelLegal: {
    nome: string;
    cpf: string;
    cargo: string;
    email: string;
    celular: string;
    declaracaoPoderes: string;
  } | null;
  documentos: KycDocumento[];
  usuariosEConvites: {
    id: number;
    email: string;
    papel: number | null;
    estado: number;
    audience: number;
    dataExpiracao: string;
  }[];
  historico: KycDecisaoHistorico[];
}

export interface KycDecisao {
  justificativa: string;
  /** Obrigatório em `/ajustes` — validado no servidor, não só no formulário. */
  camposPendentes?: string[];
}

export interface CampanhaPeriodo {
  id: number;
  codigo: string;
  /** `PeriodicidadeEnum`. Mensal formata diferente de bissemana. */
  periodicidade: number;
  dataInicio: string;
  dataFim: string;
}

export interface CampanhaListItem {
  id: number;
  codigo: string;
  nome: string;
  /** `StatusCampanhaEnum`. */
  status: number;
  dataInicioPrevisto: string;
  dataFimPrevisto: string;
  anunciante: string;
  /** Vazio vira "Venda Direta (Sem Agência)" na tela — nunca travessão. */
  agencia: string | null;
  periodo: CampanhaPeriodo | null;
  pecas: number;
  valorTotal: number;
}

export interface CampanhaPedido {
  id: number;
  codigo: string;
  status: number;
  statusPagamento: number;
  periodo: CampanhaPeriodo | null;
  pecas: number;
  valor: number;
}

/** Detalhe de campanha (`GET /campanhas/{id}`): os valores ficam nos pedidos. */
export interface CampanhaDetalhe {
  id: number;
  codigo: string;
  nome: string;
  produto: string | null;
  job: string | null;
  status: number;
  dataInicioPrevisto: string;
  dataFimPrevisto: string;
  verba: number | null;
  anunciante: string;
  agencia: string | null;
  pedidos: CampanhaPedido[];
}

export interface CadastroAcessoConfig {
  exigirEmailCorporativoNoCadastro: boolean;
  /** Servida pelo backend. O frontend só lê e exibe. */
  dominiosBloqueados: string[];
  dominiosEditaveis: boolean;
  historico: {
    id: number;
    valorAnterior: string;
    valorNovo: string;
    dataHora: string;
    usuario: string | null;
  }[];
}

export interface ProspeccaoSessao {
  appUrl: string;
  token: string;
  expiraEm: string;
  ttlSegundos: number;
  fonteOrigem: string;
  fonteAgenciaId: number;
  fonteUsuarioId: number;
}
