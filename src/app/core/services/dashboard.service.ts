import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardFinanceiroKpis,
  DashboardKpis,
  DashboardPedidoInsercaoItem,
  DashboardReservaItem,
} from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/dashboard`;

  /**
   * `GET /api/wl/dashboard/kpis`.
   *
   * A contagem de locais aguardando aprovacao vem do proprio BFF; o frontend
   * nao replica a regra (`FonteOrigem = WhiteLabel` + `StatusExibicao = 2`).
   */
  kpis(): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${this.base}/kpis`);
  }

  /**
   * `GET /api/wl/dashboard/kpis-financeiro` (VEI-RD-85, Figma 153:1265).
   *
   * `periodoId` omitido deixa o BFF resolver o período vigente (ou o próximo
   * bissemanal ativo) — usado na primeira carga da tela, antes do operador
   * escolher um período no seletor.
   */
  kpisFinanceiro(periodoId?: number | null): Observable<DashboardFinanceiroKpis> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId);
    return this.http.get<DashboardFinanceiroKpis>(`${this.base}/kpis-financeiro`, { params });
  }

  reservasDoPeriodo(periodoId: number, limite = 5): Observable<DashboardReservaItem[]> {
    const params = new HttpParams().set('periodoId', periodoId).set('limite', limite);
    return this.http.get<DashboardReservaItem[]>(`${this.base}/reservas`, { params });
  }

  pedidosInsercaoDoPeriodo(periodoId: number, limite = 5): Observable<DashboardPedidoInsercaoItem[]> {
    const params = new HttpParams().set('periodoId', periodoId).set('limite', limite);
    return this.http.get<DashboardPedidoInsercaoItem[]>(`${this.base}/pedidos-insercao`, { params });
  }
}
