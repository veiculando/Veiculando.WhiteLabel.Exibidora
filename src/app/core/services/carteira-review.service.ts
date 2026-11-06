import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export type CarteiraStatus = 'PendenteAnalise' | 'AjustesSolicitados' | 'Aprovado' | 'Reprovado';

export interface CarteiraFilaItem {
  id: string;
  clienteId: number;
  status: CarteiraStatus;
  origem: 'Cadastro' | 'Solicitacao';
  vendedorId: number | null;
  vendedora: string | null;
  motivo: string | null;
  atualizadoEm: string;
  nome: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
}

export interface CarteiraDetalhe {
  id: string;
  clienteId: number;
  status: CarteiraStatus;
  origem: 'Cadastro' | 'Solicitacao';
  motivo: string | null;
  vendedorId: number | null;
  vendedora: string | null;
  solicitante: string | null;
  cliente: { nome: string; razaoSocial: string; cnpj: string; cidade: string; uf: string };
  documentos: Array<{ id: string; tipo: string; nome: string; contentType: string; tamanho: number }>;
  historico: Array<{
    evento: string; usuario: string | null; vendedoraDe: string | null; vendedoraPara: string | null;
    statusDe: string | null; statusPara: string; motivo: string | null; em: string;
  }>;
}

export interface PedidosPorVendedora {
  de: string;
  ate: string;
  totalPedidos: number;
  valorBrutoTotal: number;
  porVendedora: Array<{ vendedorId: number; vendedora: string | null; pedidos: number; valorBruto: number }>;
  pedidos: Array<{
    vendedorId: number; vendedora: string | null; pedido: string; dataPedido: string; cliente: string;
    cnpjCliente: string; campanha: string; periodo: string; valorBruto: number; valorLiquidoAnunciante: number; status: string;
  }>;
}

/** Análise dos clientes cadastrados pelas vendedoras na Prospecção (VEI-RD-157d e 157f). */
@Injectable({ providedIn: 'root' })
export class CarteiraReviewService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/kyc/app/carteira`;
  private readonly relatorio = `${environment.bffUrl}/relatorios/pedidos-por-vendedora`;

  fila(status: CarteiraStatus) { return this.http.get<CarteiraFilaItem[]>(this.base, { params: { status } }); }
  detalhe(id: string) { return this.http.get<CarteiraDetalhe>(`${this.base}/${id}`); }
  documento(id: string, documentoId: string) {
    return this.http.get(`${this.base}/${id}/documentos/${documentoId}`, { responseType: 'blob' });
  }
  aprovar(id: string) { return this.http.post(`${this.base}/${id}/aprovar`, {}); }
  decidir(id: string, acao: 'ajustes' | 'reprovar', reason: string) { return this.http.post(`${this.base}/${id}/${acao}`, { reason }); }
  vendedoras() { return this.http.get<Array<{ id: number; nome?: string | null; email: string }>>(`${this.base}/vendedoras`); }
  trocarResponsavel(id: string, vendedorId: number, reason: string) {
    return this.http.post(`${this.base}/${id}/responsavel`, { vendedorId, reason });
  }
  removerResponsavel(id: string, reason: string) {
    return this.http.delete(`${this.base}/${id}/responsavel`, { body: { reason } });
  }

  pedidosPorVendedora(filtro: FiltroVendedora) { return this.http.get<PedidosPorVendedora>(this.relatorio, { params: params(filtro) }); }
  exportarPedidosPorVendedora(filtro: FiltroVendedora) {
    return this.http.get(`${this.relatorio}/exportar`, { params: params(filtro), responseType: 'blob' });
  }
}

export interface FiltroVendedora { de?: string; ate?: string; vendedorId?: number | null }

function params(filtro: FiltroVendedora): HttpParams {
  let p = new HttpParams();
  if (filtro.de) p = p.set('de', filtro.de);
  if (filtro.ate) p = p.set('ate', filtro.ate);
  if (filtro.vendedorId) p = p.set('vendedorId', filtro.vendedorId);
  return p;
}
