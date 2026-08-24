import { StatusExibicao } from './status-exibicao.enum';

/**
 * Item de GET /api/wl/pecas — o backend real não tem rota escopada por
 * local (nem pagina): devolve TODAS as peças da afiliada. A aba "Peças"
 * do wizard de Local filtra por `idLocal` em memória (ver PecaService).
 */
export interface PecaListItem {
  id: number;
  codigo: string;
  idLocal: number;
  localCodigo: string | null;
  formatoDimensao: string | null;
  valorPadrao: number;
  fonteOrigem: number | null;
}

/**
 * Payload de PecaCadastroCommand — shape FLAT usado pelo formulário.
 * `idLocal` vem sempre da rota (nunca de um campo editável do formulário) —
 * ver T1 do plano tático.
 *
 * O shape espelha PecaCadastroCommand do Core campo a campo — inclusive
 * onde o Core exige um objeto estruturado (Via, FormatoPeca,
 * EspecificacaoProducao) em vez do texto livre que uma primeira versão
 * deste formulário assumia. `PecaService` traduz isso para o corpo
 * aninhado que o comando realmente espera.
 */
export interface PecaPayload {
  idLocal: number;
  idTipoSuporte: number;
  codigoInterno: string | null;
  periodicidadePadrao: number;
  valorPadrao: number;

  idFormato: number;
  formatoLargura: number;
  formatoAltura: number;
  /** JuncaoTipoEnum do Core: 0=Não, 1=Dupla, 2=Tripla. */
  formatoJuncao: number;

  especificacaoLargura: number | null;
  especificacaoAltura: number | null;
  /** MaterialProducaoEnum do Core: 1=Papel, 2=Lona, 3=Adesivo. */
  especificacaoMaterial: number | null;
  especificacaoTexto: string | null;

  idsSubstratoTipo: number[];

  iluminacao: boolean;
  semaforo: boolean;
  anguloDeVisao: number;

  /** ViaTipoEnum do Core: 0=Simples, 1=Dupla, 2=Provisória. */
  viaTipo: number;
  viaFaixas: number;
  viaVelocidade: number;
  /** ViaPedestreEnum do Core: 0=Não, 1=Sim, 2=ApenasPedestre. */
  viaPedestre: number;

  roteiroComercial: boolean;
  alvara: boolean;
  streetView: string | null;
  descricao: string | null;
  restricao: string | null;
}

export interface PecaDetalhe extends PecaPayload {
  id: number;
  codigo: string;
  statusExibicao: StatusExibicao;
  fotoUrl: string | null;
}

/** Corpo aninhado que POST/PUT /api/wl/pecas realmente esperam — espelha PecaCadastroCommand. */
export interface PecaCadastroComando {
  idLocal: number;
  idTipoSuporte: number;
  codigoInterno: string | null;
  periodicidadePadrao: number;
  valorPadrao: number;
  idFormato: number;
  formato: { largura: number; altura: number; juncao: number };
  especificacaoProducao: {
    largura: number | null;
    altura: number | null;
    material: number | null;
    especificacao: string | null;
  };
  idsSubstratoTipo: number[];
  iluminacao: boolean;
  semaforo: boolean;
  anguloDeVisao: number;
  via: { viaTipo: number; faixas: number; velociade: number; pedestre: number };
  roteiroComercial: boolean;
  alvara: boolean;
  streetView: { url: string };
  descricao: string | null;
  restricao: string | null;
}

/** GET /api/wl/pecas/{id} — shape real (aninhado), enriquecido para alimentar o form de edição. */
export interface PecaApiDetalhe {
  id: number;
  codigo: string;
  codigoInterno: string | null;
  idLocal: number;
  localCodigo: string | null;
  idTipoSuporte: number;
  tipoSuporte: string | null;
  idFormato: number | null;
  formatoDimensao: string | null;
  formato: { largura: number; altura: number; juncao: number } | null;
  especificacaoProducao: {
    largura: number | null;
    altura: number | null;
    material: number | null;
    especificacao: string | null;
  } | null;
  periodicidadePadrao: number;
  valorPadrao: number;
  iluminacao: boolean;
  semaforo: boolean;
  anguloDeVisao: number;
  via: { viaTipo: number; faixas: number; velociade: number; pedestre: number } | null;
  roteiroComercial: boolean;
  alvara: boolean;
  streetView: string | null;
  descricao: string | null;
  restricao: string | null;
  statusExibicao: StatusExibicao;
  fonteOrigem: number | null;
}
