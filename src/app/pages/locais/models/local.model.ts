import { StatusExibicao } from './status-exibicao.enum';

/**
 * Item da listagem GET /api/wl/locais.
 * O backend real (sprint-9.0) não pagina nem filtra por querystring —
 * devolve um array cru dos locais da afiliada. Busca/filtro, quando
 * existirem na tela, são aplicados em memória (ver LocaisComponent).
 */
export interface LocalListItem {
  timeStamp?: string;
  id: number;
  codigo: string;
  descricao: string | null;
  cidade: string | null;
  uf: string | null;
  fonteOrigem: number | null;
  fonteTimestamp: string | null;
  statusExibicao: StatusExibicao;
}

/**
 * Payload de "Dados do Local" (etapa 1 do wizard) — shape FLAT usado
 * pelo formulário. `LocalService` traduz isso para o corpo aninhado que
 * LocalCadastroCommand (Core) realmente espera (endereco/geolocalizacao
 * como objetos próprios) — ver `LocalService.paraComando`.
 */
export interface LocalDadosPayload {
  idCidade: number;
  codigoInterno: string | null;
  descricao: string | null;
  cep: string | null;
  logradouro: string;
  numero: string | null;
  bairro: string | null;
  complemento: string | null;
  referencia: string | null;
  latitude: number;
  longitude: number;
  palavrasChave: string | null;
}

/** Detalhe completo de um Local (GET /api/wl/locais/{id}) — usado para pré-carregar o wizard. */
export interface LocalDetalhe {
  id: number;
  codigo: string;
  descricao: string | null;
  idCidade: number;
  cidade: string | null;
  uf: string | null;
  codigoInterno: string | null;
  palavrasChave: string | null;
  statusExibicao: StatusExibicao;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    complemento: string | null;
    referencia: string | null;
    cep: { numero: string | null } | null;
  } | null;
  geolocalizacao: { latitude: number; longitude: number } | null;
  fonteOrigem: number | null;
  fonteUsuarioId: number | null;
  fonteTimestamp: string | null;
}

/**
 * Corpo aninhado que POST/PUT /api/wl/locais realmente esperam —
 * espelha LocalCadastroCommand do Core.
 */
export interface LocalCadastroComando {
  idCidade: number;
  codigoInterno: string | null;
  descricao: string | null;
  palavrasChave: string | null;
  endereco: {
    bairro: string | null;
    logradouro: string;
    numero: string | null;
    complemento: string | null;
    referencia: string | null;
    cep: { numero: string | null };
  };
  geolocalizacao: { latitude: number; longitude: number };
}

/**
 * Resumo devolvido por POST/PUT após salvar — projeção estável do Core
 * (ver Veiculando#105), não o Local inteiro. Suficiente para navegar
 * para a tela de edição e refletir o status pós-aprovação (ADR-WL-004).
 */
export interface LocalCadastroResumo {
  id: number;
  codigo: string;
  codigoInterno: string | null;
  idAfiliada: number;
  idCidade: number;
  cidade: string | null;
  descricao: string | null;
  palavrasChave: string | null;
  statusExibicao: StatusExibicao;
  dataCadastro: string;
  dataAtualizacao: string;
}

export interface LocalCadastroResponse {
  success: boolean;
  data: { local: LocalCadastroResumo } | null;
}
