import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { paramsDePagina } from '../../../core/services/pedidos.service';
import {
  PaginaFiltro,
  PaginaWl,
  PecaValorListItem,
  PecaValoresFiltro,
  PecasAlterarValoresRequest,
  PecasAlterarValoresResultado,
  PecasAlterarValoresSazonaisRequest,
} from '../../../core/models/wl.models';

/**
 * `GET/POST /api/wl/pecas/valores*` (VEI-RD-54).
 *
 * O quarto filtro do PRD §5.4 (período) não é enviado por este serviço: o
 * Figma (154:3004) só mostra busca textual, e o significado de "período"
 * numa grade de VALOR — filtraria peças vendáveis? mostraria o sazonal em
 * vez do padrão? — não está definido. Pendência deixada explícita no plano
 * tático (Ordem 5, seção 6) em vez de resolvida por suposição; os outros
 * três filtros (cidade, suporte, status) têm semântica inequívoca e estão
 * implementados.
 */
@Injectable({ providedIn: 'root' })
export class PecaValoresService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/pecas/valores`;

  listar(filtroValores?: PecaValoresFiltro, pagina?: PaginaFiltro): Observable<PaginaWl<PecaValorListItem>> {
    let params = paramsDePagina(pagina);
    if (filtroValores?.idCidade) params = params.set('idCidade', filtroValores.idCidade);
    if (filtroValores?.idTipoSuporte) params = params.set('idTipoSuporte', filtroValores.idTipoSuporte);
    if (filtroValores?.status !== null && filtroValores?.status !== undefined) {
      params = params.set('status', filtroValores.status);
    }
    if (filtroValores?.busca) params = params.set('busca', filtroValores.busca);

    return this.http.get<PaginaWl<PecaValorListItem>>(this.base, { params });
  }

  alterar(request: PecasAlterarValoresRequest): Observable<PecasAlterarValoresResultado> {
    return this.http.post<PecasAlterarValoresResultado>(`${this.base}/alterar`, request);
  }

  alterarSazonais(request: PecasAlterarValoresSazonaisRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/sazonais`, request);
  }
}
