import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PaginaFiltro,
  PaginaPedidosInsercao,
  PedidoInsercaoListItem,
  PedidoReservaDetalhe,
  PedidoReservaItemDecisao,
  PedidoReservaListItem,
  PedidoReservaRespostaResultado,
  PedidosInsercaoFiltro,
  PaginaWl,
} from '../models/wl.models';

/** Monta a query string de paginação, omitindo o que não foi informado. */
export function paramsDePagina(filtro?: PaginaFiltro): HttpParams {
  let params = new HttpParams();
  if (filtro?.page) params = params.set('page', filtro.page);
  if (filtro?.pageSize) params = params.set('pageSize', filtro.pageSize);
  if (filtro?.sort) params = params.set('sort', filtro.sort);
  if (filtro?.desc !== undefined) params = params.set('desc', filtro.desc);
  return params;
}

@Injectable({ providedIn: 'root' })
export class PedidosReservaService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/pedidos-reserva`;

  listar(filtro?: PaginaFiltro): Observable<PaginaWl<PedidoReservaListItem>> {
    return this.http.get<PaginaWl<PedidoReservaListItem>>(this.base, {
      params: paramsDePagina(filtro),
    });
  }

  obter(codigo: string): Observable<PedidoReservaDetalhe> {
    return this.http.get<PedidoReservaDetalhe>(`${this.base}/${encodeURIComponent(codigo)}`);
  }

  /**
   * `POST /api/wl/pedidos-reserva/resposta`.
   *
   * O contrato passou a ser **por item**: uma decisão para cada item pendente
   * do pedido. O campo `aceitar` de nível superior deixou de existir — ele
   * aplicava a mesma decisão a todos e conviveria mal com `itens`, criando duas
   * fontes de verdade para a mesma pergunta.
   *
   * A rejeição pode carregar `idsPecaSugerida` como alternativa; é o mecanismo
   * de "motivo" que o domínio tem (o core grava a primeira em
   * `IdPecaRecomendada`). Peça de outra exibidora é recusada pelo BFF.
   */
  responder(
    pedidoReservaId: number,
    itens: PedidoReservaItemDecisao[]
  ): Observable<PedidoReservaRespostaResultado> {
    return this.http.post<PedidoReservaRespostaResultado>(`${this.base}/resposta`, {
      pedidoReservaId,
      itens,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class PedidosInsercaoService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/pedidos-insercao`;

  /**
   * `GET /api/wl/pedidos-insercao` — espelha `PedidosInsercaoController.GetAll`
   * (VEI-RD-94).
   *
   * `resumo` vem NA MESMA resposta, ao lado da página — não existe
   * `/pedidos-insercao/resumo` separado. O servidor calcula os agregados
   * (mini-dashboard: total de pedidos, peças, valor líquido, e quantidade por
   * cada um dos 6 status oficiais) sobre a MESMA query já filtrada, antes do
   * Skip/Take, então o card e a lista nunca divergem — o cliente nunca soma
   * em memória.
   *
   * `status` vai como o NOME do enum (`StatusPedidoInsercaoEnum`), não um
   * número: o controller faz `Enum.TryParse<StatusPedidoInsercaoEnum>(status, …)`
   * a partir de `[FromQuery] string status`. Só os 6 status oficiais são
   * aceitos — qualquer outro valor volta 400.
   */
  listar(filtro?: PedidosInsercaoFiltro, pagina?: PaginaFiltro): Observable<PaginaPedidosInsercao> {
    let params = paramsDePagina(pagina);
    if (filtro?.busca) params = params.set('busca', filtro.busca);
    if (filtro?.status) params = params.set('status', filtro.status);
    if (filtro?.idPeriodoInicial) params = params.set('idPeriodoInicial', filtro.idPeriodoInicial);
    if (filtro?.idPeriodoFinal) params = params.set('idPeriodoFinal', filtro.idPeriodoFinal);

    return this.http.get<PaginaPedidosInsercao>(this.base, { params });
  }

  obter(codigo: string): Observable<PedidoInsercaoListItem> {
    return this.http.get<PedidoInsercaoListItem>(`${this.base}/${encodeURIComponent(codigo)}`);
  }

  /**
   * `GET /api/wl/pedidos-insercao/{codigo}/pdf`.
   *
   * O PDF vem pelo BFF, em mesma origem. Nao existe mais `pdfUrl` no payload:
   * aquele campo carregava o host do FileServer ate o browser, e o FileServer
   * nao autentica ninguem nem filtra por afiliada. O recorte de tenant so
   * existe no BFF, entao e por ele que o arquivo tem de passar.
   */
  pdf(codigo: string): Observable<Blob> {
    return this.http.get(`${this.base}/${encodeURIComponent(codigo)}/pdf`, {
      responseType: 'blob',
    });
  }
}
