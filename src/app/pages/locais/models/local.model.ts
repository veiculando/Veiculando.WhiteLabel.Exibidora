import { StatusExibicao } from './status-exibicao.enum';

/**
 * Item da listagem GET /api/wl/locais.
 * Reflete apenas o que o BFF WhiteLabel projeta — nunca AfiliadaId
 * (o tenant é resolvido pelo Host, o cliente não o vê nem o envia).
 */
export interface LocalListItem {
  id: number;
  codigo: string;
  codigoInterno: string | null;
  cidade: string;
  endereco: string;
  numeroPecas: number;
  statusExibicao: StatusExibicao;
  dataCadastro: string;
  dataAtualizacao: string;
}

/**
 * Payload de "Dados do Local" (etapa 1 do wizard).
 * Contém SOMENTE endereço/identificação — nunca campos de demografia
 * (BDD "Salvar local preserva demografia").
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

/** Detalhe completo de um Local — usado para pré-carregar o wizard. */
export interface LocalDetalhe extends LocalDadosPayload {
  id: number;
  codigo: string;
  statusExibicao: StatusExibicao;
  cidade: string;
}

export interface LocalListFiltro {
  busca?: string;
  status?: StatusExibicao;
  cidadeId?: number;
  page?: number;
  pageSize?: number;
}

export interface LocalListResponse {
  items: LocalListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
