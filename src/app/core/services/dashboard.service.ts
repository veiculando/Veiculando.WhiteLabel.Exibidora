import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardKpis } from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  /**
   * `GET /api/wl/dashboard/kpis`.
   *
   * A contagem de locais aguardando aprovacao vem do proprio BFF; o frontend
   * nao replica a regra (`FonteOrigem = WhiteLabel` + `StatusExibicao = 2`).
   */
  kpis(): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${environment.bffUrl}/dashboard/kpis`);
  }
}
