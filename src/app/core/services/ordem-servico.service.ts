import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OsCriadaResultado, OsCriarPayload, OsDetalhe, OsFiltro, PaginaFiltro, PaginaWl, OsListItem } from '../models/wl.models';
import { paramsDePagina } from './pedidos.service';

/**
 * Ordem de Serviço — VEI-RD-88 (5 telas: listagem `198:2`, geração `186:86`,
 * modal de entrega `187:1364`, detalhe `198:546`, planilha PDF `188:220`).
 *
 * Rotas confirmadas lendo `OrdensServicoController.cs` real no workspace
 * irmão `Veiculando.WhiteLabel.Api` (commit `2a0c521`, 2026-09-22) — só as 5
 * do card, nenhuma a mais:
 *  - `GET /api/wl/ordens-servico` (listagem)
 *  - `POST /api/wl/ordens-servico` (cria a OS direto — não há uma etapa de
 *    "gerar" separada de "criar"; a tela de geração só lista peças via
 *    `ProgramacaoService.listar`, já existente para VEI-RD-86)
 *  - `GET /api/wl/ordens-servico/{id}` (detalhe, com peças e histórico)
 *  - `GET /api/wl/ordens-servico/{id}/historico`
 *  - `GET /api/wl/ordens-servico/{id}/pdf` (binário, não `/planilha-pdf`)
 *
 * **Não existem `/pecas-elegiveis` nem `/{id}/entregar`.** A "entrega" do
 * modal (VEI-RD-88c) não é uma mutação de estado — como só sobrou a opção
 * PDF (a de colador foi removida), entregar é só baixar `{id}/pdf`, igual
 * ao padrão de "Baixar PI". Este service não tem (e não deve ganhar) um
 * método `entregar`.
 *
 * **Nenhum endpoint de atribuição/reatribuição de colador** — regra dura,
 * decisão humana 2026-09-17: a opção "Atribuir a um Colador" não é
 * renderizada nesta sprint, e não existe rota `/atribuir` nem `/reatribuir`
 * no roteador Angular.
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

  /** Espelha `OrdemServicoCriarRequest` — só `idPeriodo`/`idPecas`, sem campo de opções (o backend não as recebe). */
  criar(payload: OsCriarPayload): Observable<OsCriadaResultado> {
    return this.http.post<OsCriadaResultado>(this.base, payload);
  }

  /** `GET /api/wl/ordens-servico/{id}/pdf` — mesmo padrão do PDF de PI: sai do BFF, em mesma origem, como blob. */
  pdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' });
  }
}
