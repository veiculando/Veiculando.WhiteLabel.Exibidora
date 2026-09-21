import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RelatorioResumo } from '../../../core/models/wl.models';

/**
 * `GET /api/wl/relatorios/*` (VEI-RD-92).
 *
 * A exportação (`exportar`) devolve um Blob CSV — formato provisório, já que
 * o Figma (286:11255) mostra uma ação de download sem confirmar PDF ou CSV
 * (pendência deixada explícita no plano tático, seção 6).
 */
@Injectable({ providedIn: 'root' })
export class RelatoriosService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/relatorios`;

  resumo(periodoId: number): Observable<RelatorioResumo> {
    const params = new HttpParams().set('periodoId', periodoId);
    return this.http.get<RelatorioResumo>(`${this.base}/resumo`, { params });
  }

  exportarCsv(periodoId: number): Observable<Blob> {
    const params = new HttpParams().set('periodoId', periodoId);
    return this.http.get(`${this.base}/exportar`, { params, responseType: 'blob' });
  }
}
