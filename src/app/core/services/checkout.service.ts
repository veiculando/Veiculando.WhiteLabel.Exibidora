import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutDetalhe, CheckoutFiltro, CheckoutListItem, PaginaFiltro, PaginaWl } from '../models/wl.models';
import { paramsDePagina } from './pedidos.service';

/**
 * Check out — VEI-RD-91 (Figma `184:2` listagem, `184:501` detalhe).
 *
 * Sem controller correspondente no BFF ainda (checado em 2026-09-22contra
 * `Veiculando.WhiteLabel.Api/Controllers`: só existe `CheckingController`,
 * que é o fluxo de upload de foto por PI/item, consumido por
 * `checking.service.ts` — uma feature diferente). As rotas abaixo seguem a
 * convenção observada nos demais controllers WL (`PedidosInsercaoController`,
 * `ProgramacaoController`): GET com filtro na query string, envelope
 * `PaginaWl<T>`, JSON camelCase.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/checkout`;

  listar(filtro?: CheckoutFiltro, pagina?: PaginaFiltro): Observable<PaginaWl<CheckoutListItem>> {
    let params = paramsDePagina(pagina);
    if (filtro?.idPeriodo) params = params.set('idPeriodo', filtro.idPeriodo);
    if (filtro?.status) params = params.set('status', filtro.status);
    if (filtro?.idCidade) params = params.set('idCidade', filtro.idCidade);
    if (filtro?.campanha) params = params.set('campanha', filtro.campanha);
    if (filtro?.anunciante) params = params.set('anunciante', filtro.anunciante);

    return this.http.get<PaginaWl<CheckoutListItem>>(this.base, { params });
  }

  obter(codigo: string): Observable<CheckoutDetalhe> {
    return this.http.get<CheckoutDetalhe>(`${this.base}/${encodeURIComponent(codigo)}`);
  }
}
