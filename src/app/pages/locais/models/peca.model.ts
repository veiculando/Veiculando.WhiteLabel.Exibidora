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
 */
export interface PecaPayload {
  idLocal: number;
  idTipoSuporte: number;
  codigoInterno: string | null;
  periodicidadePadrao: number;
  valorPadrao: number;
  idFormato: number;
  especificacaoProducao: string | null;
  substratos: string | null;
  iluminacao: boolean;
  semaforo: boolean;
  anguloDeVisao: string | null;
  via: string | null;
  roteiroComercial: string | null;
  alvara: string | null;
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
