import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutDetalhe, CheckoutFiltro, CheckoutListItem, PaginaFiltro, PaginaWl } from '../models/wl.models';
import { paramsDePagina } from './pedidos.service';

/**
 * Check out — VEI-RD-91 (Figma `184:2` listagem, `184:501` detalhe).
 *
 * A URL do BFF é `api/wl/checking` — não `api/wl/checkout`.
 * `CheckingController` cobre as duas features: o fluxo de upload de foto
 * (`checking.service.ts`) e esta listagem supervisória. Confirmado lendo o
 * controller real no workspace irmão `Veiculando.WhiteLabel.Api` em
 * 2026-09-22 (commit `2a8b341`, VEI-RD-91). A rota Angular continua
 * `/checkout` — é o nome do card, independente da URL do BFF.
 *
 * O detalhe é por `id` numérico (`GET /api/wl/checking/{id:int}`), não por
 * código de PI.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/checking`;

  listar(filtro?: CheckoutFiltro, pagina?: PaginaFiltro): Observable<PaginaWl<CheckoutListItem>> {
    let params = paramsDePagina(pagina);
    if (filtro?.busca) params = params.set('busca', filtro.busca);
    if (filtro?.status) params = params.set('status', filtro.status);
    if (filtro?.idCidade) params = params.set('idCidade', filtro.idCidade);
    if (filtro?.idPeriodoInicial) params = params.set('idPeriodoInicial', filtro.idPeriodoInicial);
    if (filtro?.idPeriodoFinal) params = params.set('idPeriodoFinal', filtro.idPeriodoFinal);

    return this.http.get<PaginaWl<CheckoutListItem>>(this.base, { params });
  }

  obter(id: number): Observable<CheckoutDetalhe> {
    return this.http.get<CheckoutDetalhe>(`${this.base}/${id}`);
  }

  /**
   * `downloadUrl` já vem completo do BFF (`/api/wl/checking/item/{id}/fotos/{fotoId}/arquivo`
   * — não concatenar com `base`). Passa pelo `HttpClient` (interceptor de
   * JWT) e volta como blob, igual ao padrão do PDF de PI: um `<img src>`
   * direto não carregaria o Bearer e voltaria 401.
   */
  baixarFoto(downloadUrl: string): Observable<Blob> {
    return this.http.get(downloadUrl, { responseType: 'blob' });
  }
}
