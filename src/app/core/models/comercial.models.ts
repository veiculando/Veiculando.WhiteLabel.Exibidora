/**
 * Modelos das telas comerciais e de KYC da sprint 10 — VEI-RD-79, 80, 81, 82, 51, 83.
 *
 * Os nomes espelham o que o BFF devolve, em PascalCase, porque é assim que o
 * ASP.NET serializa os tipos anônimos destes endpoints. Renomear no cliente criaria
 * um mapa de tradução que precisaria ser mantido em sincronia com o servidor — o
 * mesmo tipo de duplicação que a lista de domínios bloqueados já custou uma vez.
 */

/** Página paginada devolvida por `WlPaginacao.Montar`. */
export interface Pagina<T> {
  Itens: T[];
  Page: number;
  PageSize: number;
  Total: number;
  TotalPaginas: number;
}

/** `StatusVinculoEnum` do domínio: 0 = Inativo, 1 = Ativo. */
export type StatusVinculo = 0 | 1;

export interface AgenciaListItem {
  Id: number;
  Nome: string;
  RazaoSocial: string;
  Cnpj: string;
  Cidade: string;
  Uf: string;
  Email: string;
  Telefone: string;
  Status: StatusVinculo;
  /** Contagem agregada no servidor — nunca somada no navegador. */
  Campanhas: number;
}

export interface AgenciaDetalhe extends AgenciaListItem {
  Site: string;
  InscricaoEstadual: string;
  InscricaoMunicipal: string;
  LogoUrl: string;
  BonificacaoVolume: number;
  ObservacoesAfiliada: string;
  DataVinculo: string;
  /** Espelho de venda direta: a ação de inativar não é desenhada para ela. */
  VendaDireta: boolean;
  AnunciantesVinculados: {
    Id: number;
    Nome: string;
    RazaoSocial: string;
    ComissaoAgencia: number;
    DataInicioContrato: string;
    DataExpiracaoContrato: string;
  }[];
}

export interface AgenciaPorCnpj {
  Id: number;
  Nome: string;
  RazaoSocial: string;
  Cnpj: string;
  JaVinculadaAEstaAfiliada: boolean;
  PropostaDeVinculo: boolean;
}

/**
 * Campos do formulário de Agência.
 *
 * ⚠️ NÃO existe prazo de pagamento. O PRD §5.5 é explícito e o código confirma:
 * `AgenciaCadastroCommand` e a entidade `Agencia` não têm o campo — diferente de
 * `Cliente`, que tem. Um campo aqui não teria onde ser gravado.
 */
export interface AgenciaForm {
  Nome: string;
  RazaoSocial: string;
  Cnpj: string;
  Cidade: string;
  Uf: string;
  Telefone: string;
  Email: string;
  Site: string;
  Logradouro: string;
  Numero: string;
  Complemento: string;
  Bairro: string;
  Cep: string;
  InscricaoEstadual: string;
  InscricaoMunicipal: string;
  BonificacaoVolume: number;
  ObservacoesAfiliada: string;
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
  Id: number;
  Tipo: TipoOrganizacao;
  Estado: EstadoOnboarding;
  DataEnvio: string | null;
  AnalistaId: number | null;
  AnalistaNome: string | null;
  /**
   * `null` enquanto o KYC não foi aprovado — ver a lacuna de modelo documentada em
   * `KycController`. É `null`, e não string vazia, exatamente para a tela distinguir
   * "ainda não existe" de "veio em branco".
   */
  Nome: string | null;
  RazaoSocial: string | null;
  Cnpj: string | null;
  Responsavel: { Nome: string; Cpf: string; Email: string } | null;
}

/** Contagem por estado, chaveada pelo nome do enum. */
export type KycResumo = Record<string, number>;

export interface KycDocumento {
  Id: number;
  /** `TipoDocumentoOnboardingEnum`: 0 ContratoSocial, 1 Identificacao, 2 Procuracao. */
  Tipo: number;
  /** `StatusDocumentoOnboardingEnum`: 0 Pendente, 1 Aprovado, 2 Rejeitado. */
  Status: number;
  MotivoPendencia: string | null;
}

export interface KycDecisaoHistorico {
  Id: number;
  Estado: EstadoOnboarding;
  Justificativa: string | null;
  CamposPendentesJson: string | null;
  DataHora: string;
  Usuario: string | null;
}

export interface KycDetalhe {
  Id: number;
  Tipo: TipoOrganizacao;
  Estado: EstadoOnboarding;
  DataEnvio: string | null;
  DataDecisao: string | null;
  IdOrganizacao: number | null;
  AnalistaId: number | null;
  AnalistaNome: string | null;
  ResponsavelLegal: {
    Nome: string;
    Cpf: string;
    Cargo: string;
    Email: string;
    Celular: string;
    DeclaracaoPoderes: string;
  } | null;
  Documentos: KycDocumento[];
  UsuariosEConvites: {
    Id: number;
    Email: string;
    Papel: number | null;
    Estado: number;
    Audience: number;
    DataExpiracao: string;
  }[];
  Historico: KycDecisaoHistorico[];
}

export interface KycDecisao {
  Justificativa: string;
  /** Obrigatório em `/ajustes` — validado no servidor, não só no formulário. */
  CamposPendentes?: string[];
}

export interface CampanhaPeriodo {
  Id: number;
  Codigo: string;
  /** `PeriodicidadeEnum`. Mensal formata diferente de bissemana. */
  Periodicidade: number;
  DataInicio: string;
  DataFim: string;
}

export interface CampanhaListItem {
  Id: number;
  Codigo: string;
  Nome: string;
  /** `StatusCampanhaEnum`. */
  Status: number;
  DataInicioPrevisto: string;
  DataFimPrevisto: string;
  Anunciante: string;
  /** Vazio vira "Venda Direta (Sem Agência)" na tela — nunca travessão. */
  Agencia: string | null;
  Periodo: CampanhaPeriodo | null;
  Pecas: number;
  ValorTotal: number;
}

export interface CadastroAcessoConfig {
  ExigirEmailCorporativoNoCadastro: boolean;
  /** Servida pelo backend. O frontend só lê e exibe. */
  DominiosBloqueados: string[];
  DominiosEditaveis: boolean;
  Historico: {
    Id: number;
    ValorAnterior: string;
    ValorNovo: string;
    DataHora: string;
    Usuario: string | null;
  }[];
}

export interface ProspeccaoSessao {
  AppUrl: string;
  Token: string;
  ExpiraEm: string;
  TtlSegundos: number;
  FonteOrigem: string;
  FonteAgenciaId: number;
  FonteUsuarioId: number;
}
