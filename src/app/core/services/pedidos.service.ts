import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PedidoInsercaoListItem,
  PedidoReservaDetalhe,
  PedidoReservaListItem,
} from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class PedidosReservaService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/pedidos-reserva`;

  listar(): Observable<PedidoReservaListItem[]> {
    return this.http.get<PedidoReservaListItem[]>(this.base);
  }

  obter(codigo: string): Observable<PedidoReservaDetalhe> {
    return this.http.get<PedidoReservaDetalhe>(`${this.base}/${encodeURIComponent(codigo)}`);
  }

  /**
   * `POST /api/wl/pedidos-reserva/resposta`.
   *
   * O contrato tem apenas `{ pedidoReservaId, aceitar }` — **sem campo de
   * motivo**, espelhando o legado. Nao adicionar o campo na UI "por
   * completude": ele nao existe no DTO e seria descartado.
   */
  responder(pedidoReservaId: number, aceitar: boolean): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/resposta`, {
      pedidoReservaId,
      aceitar,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class PedidosInsercaoService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/pedidos-insercao`;

  listar(): Observable<PedidoInsercaoListItem[]> {
    return this.http.get<PedidoInsercaoListItem[]>(this.base);
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
