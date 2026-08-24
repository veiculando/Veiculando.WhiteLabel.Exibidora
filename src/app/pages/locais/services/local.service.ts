import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LocalDadosPayload, LocalDetalhe, LocalListFiltro, LocalListResponse } from '../models/local.model';

/**
 * Consome o CRUD de Local do BFF WhiteLabel (GET/POST/PUT /api/wl/locais).
 *
 * Nunca envia AfiliadaId/tenant: o BFF resolve o tenant pelo Host
 * (ADR-WL-008) e o Core decide AprovacaoPendente vs Ativo pelo tipo da
 * conta de serviço (ADR-WL-004). Este serviço só transporta os campos de
 * "Dados do Local" — demografia é responsabilidade de LocalPublicoService.
 */
@Injectable({ providedIn: 'root' })
export class LocalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.bffUrl}/locais`;

  listLocais(filtro: LocalListFiltro = {}): Observable<LocalListResponse> {
    let params = new HttpParams();
    if (filtro.busca) params = params.set('busca', filtro.busca);
    if (filtro.status !== undefined) params = params.set('status', filtro.status);
    if (filtro.cidadeId !== undefined) params = params.set('cidadeId', filtro.cidadeId);
    if (filtro.page !== undefined) params = params.set('page', filtro.page);
    if (filtro.pageSize !== undefined) params = params.set('pageSize', filtro.pageSize);

    return this.http.get<LocalListResponse>(this.baseUrl, { params });
  }

  getLocal(id: number): Observable<LocalDetalhe> {
    return this.http.get<LocalDetalhe>(`${this.baseUrl}/${id}`);
  }

  createLocal(payload: LocalDadosPayload): Observable<LocalDetalhe> {
    return this.http.post<LocalDetalhe>(this.baseUrl, payload);
  }

  updateLocal(id: number, payload: LocalDadosPayload): Observable<LocalDetalhe> {
    return this.http.put<LocalDetalhe>(`${this.baseUrl}/${id}`, payload);
  }
}
