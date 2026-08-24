import { StatusExibicao } from './status-exibicao.enum';

/** Item da aba "Peças" do local (etapa 3 do wizard) e da listagem GET .../pecas. */
export interface PecaListItem {
  id: number;
  codigo: string;
  codigoInterno: string | null;
  fotoUrl: string | null;
  tipoSuporte: string;
  formato: string;
  valorPadrao: number;
  periodicidadePadrao: string;
  statusExibicao: StatusExibicao;
}

/**
 * Payload de PecaCadastroCommand.
 * `idLocal` vem sempre da rota (nunca de um campo editável do formulário) —
 * ver T1 do plano tático.
 *
 * O shape espelha PecaCadastroCommand do Core campo a campo — inclusive
 * onde o Core exige um objeto estruturado (Via, FormatoPeca,
 * EspecificacaoProducao) em vez do texto livre que uma primeira versão
 * deste formulário assumia. Sem isso o BFF não tem como montar os Value
 * Objects que Via/FormatoPeca exigem (com suas próprias validações:
 * Faixas 2–9, Velocidade 11–119 etc.).
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
