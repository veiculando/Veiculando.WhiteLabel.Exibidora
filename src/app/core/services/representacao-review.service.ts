import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CarteiraStatus } from './carteira-review.service';

/** Mesmo formato do BFF (RepresentacaoReviewController), em camelCase. */
export interface RepresentacaoFilaItem {
  id: string;
  clienteId: number;
  agenciaId: number;
  agencia: string | null;
  status: CarteiraStatus;
  origem: 'Cadastro' | 'Solicitacao';
  motivo: string | null;
  /** Percentual inteiro (12 = 12%). */
  comissaoAgencia: number;
  inicioContrato: string;
  fimContrato: string;
  atualizadoEm: string;
  nome: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
}

export interface RepresentacaoDetalhe {
  id: string;
  clienteId: number;
  status: CarteiraStatus;
  origem: 'Cadastro' | 'Solicitacao';
  motivo: string | null;
  comissaoAgencia: number;
  inicioContrato: string;
  fimContrato: string;
  solicitante: string | null;
  agencia: { id: number; nome: string; cnpj: string };
  cliente: { nome: string; razaoSocial: string; cnpj: string; cidade: string; uf: string };
  documentos: Array<{ id: string; tipo: string; nome: string; contentType: string; tamanho: number }>;
  historico: Array<{ evento: string; usuario: string | null; statusDe: string | null; statusPara: string; motivo: string | null; em: string }>;
}

/** Pedidos das agências para representar anunciantes (VEI-RD-67d/67i). */
@Injectable({ providedIn: 'root' })
export class RepresentacaoReviewService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/kyc/app/representacoes`;

  fila(status: CarteiraStatus) { return this.http.get<RepresentacaoFilaItem[]>(this.base, { params: { status } }); }
  detalhe(id: string) { return this.http.get<RepresentacaoDetalhe>(`${this.base}/${id}`); }
  documento(id: string, documentoId: string) {
    return this.http.get(`${this.base}/${id}/documentos/${documentoId}`, { responseType: 'blob' });
  }
  aprovar(id: string) { return this.http.post(`${this.base}/${id}/aprovar`, {}); }
  decidir(id: string, acao: 'ajustes' | 'reprovar', reason: string) { return this.http.post(`${this.base}/${id}/${acao}`, { reason }); }
}
