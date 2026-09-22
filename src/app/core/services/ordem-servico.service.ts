import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OsCriadaResultado,
  OsCriarPayload,
  OsDetalhe,
  OsEntregaResultado,
  OsFiltro,
  OsGeracaoFiltro,
  OsPecaElegivel,
  PaginaFiltro,
  PaginaWl,
  OsListItem,
} from '../models/wl.models';
import { paramsDePagina } from './pedidos.service';

/**
 * Ordem de Serviço — VEI-RD-88 (5 telas: listagem `198:2`, geração `186:86`,
 * modal de entrega `187:1364`, detalhe `198:546`, planilha PDF `188:220`).
 *
 * Sem controller no BFF ainda (checado em 2026-09-22 — nenhum
 * `OrdemServicoController` existe em `Veiculando.WhiteLabel.Api/Controllers`).
 * Rotas modeladas nos moldes dos demais controllers WL: envelope
 * `PaginaWl<T>`, filtro na query string para GET, corpo JSON para POST,
 * download de PDF como blob pelo próprio BFF (mesmo padrão do PDF de PI —
 * nunca um link direto para um FileServer sem tenant).
 *
 * **Nenhum endpoint de atribuição/reatribuição de colador** — regra dura,
 * decisão humana 2026-09-17: a opção "Atribuir a um Colador" não é
 * renderizada nesta sprint, e não existe rota `/atribuir` nem `/reatribuir`
 * no roteador Angular. Este service não tem (e não deve ganhar) um método
 * `atribuir`/`reatribuir`.
 */
@Injectable({ providedIn: 'root' })
export class OrdemServicoService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/ordens-servico`;

  listar(filtro?: OsFiltro, pagina?: PaginaFiltro): Observable<PaginaWl<OsListItem>> {
    let params = paramsDePagina(pagina);
    if (filtro?.idPeriodoInicial) params = params.set('idPeriodoInicial', filtro.idPeriodoInicial);
    if (filtro?.idPeriodoFinal) params = params.set('idPeriodoFinal', filtro.idPeriodoFinal);
    if (filtro?.status) params = params.set('status', filtro.status);
    if (filtro?.idResponsavel) params = params.set('idResponsavel', filtro.idResponsavel);

    return this.http.get<PaginaWl<OsListItem>>(this.base, { params });
  }

  obter(id: number): Observable<OsDetalhe> {
    return this.http.get<OsDetalhe>(`${this.base}/${id}`);
  }

  /** Tela de geração (`186:86`) — lista as peças elegíveis para o período/filtro escolhido, sem criar nada ainda. */
  pecasElegiveis(filtro: OsGeracaoFiltro): Observable<OsPecaElegivel[]> {
    return this.http.post<OsPecaElegivel[]>(`${this.base}/pecas-elegiveis`, {
      periodicidade: filtro.periodicidade ?? null,
      idPeriodo: filtro.idPeriodo ?? null,
      idCidade: filtro.idCidade ?? null,
      status: filtro.status ?? null,
    });
  }

  criar(payload: OsCriarPayload): Observable<OsCriadaResultado> {
    return this.http.post<OsCriadaResultado>(this.base, payload);
  }

  /**
   * Modal de entrega (`187:1364`) — único modo aceito nesta sprint é a
   * planilha impressa; não existe um segundo `modo` para "Atribuir a um
   * Colador" (regra dura).
   */
  entregar(id: number): Observable<OsEntregaResultado> {
    return this.http.post<OsEntregaResultado>(`${this.base}/${id}/entregar`, { modo: 'impressa' });
  }

  /** `GET /ordens-servico/{id}/planilha-pdf` — mesmo padrão do PDF de PI: sai do BFF, em mesma origem, como blob. */
  planilhaPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/planilha-pdf`, { responseType: 'blob' });
  }
}
