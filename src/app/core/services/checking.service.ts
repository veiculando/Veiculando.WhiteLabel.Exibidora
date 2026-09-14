import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ItemChecking, PiAutorizada, PiChecking } from '../models/wl.models';

/** Limite aceito pelo `CheckingController` (`maxBytes = 15 * 1024 * 1024`). */
export const LIMITE_FOTO_CHECKING_BYTES = 15 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class CheckingService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/checking`;

  /** Tela 1: `GET /api/wl/checking/pis-autorizadas`. */
  pisAutorizadas(): Observable<PiAutorizada[]> {
    return this.http.get<PiAutorizada[]>(`${this.base}/pis-autorizadas`);
  }

  pi(codigo: string): Observable<PiChecking> {
    return this.http.get<PiChecking>(`${this.base}/pi/${encodeURIComponent(codigo)}`);
  }

  /**
   * Tela 2: `GET /api/wl/checking/pi/{codigo}/itens`.
   *
   * Endpoint adicionado ao BFF durante o TP-R4 — o `GetPiByCodigo` original
   * devolvia apenas `ItensCount`, sem os ids dos itens, e sem eles a tela de
   * itens (e portanto o upload, que e por `idItemPI`) era inalcancavel.
   */
  itensDaPi(codigo: string): Observable<ItemChecking[]> {
    return this.http.get<ItemChecking[]>(`${this.base}/pi/${encodeURIComponent(codigo)}/itens`);
  }

  item(id: number): Observable<ItemChecking> {
    return this.http.get<ItemChecking>(`${this.base}/item/${id}`);
  }

  /** Tela 3: `POST /api/wl/checking/enviar-foto/{idItemPI}` (multipart, campo `foto`). */
  enviarFoto(idItemPi: number, foto: File): Observable<{ message: string; fileName: string }> {
    const corpo = new FormData();
    corpo.append('foto', foto, foto.name);
    return this.http.post<{ message: string; fileName: string }>(
      `${this.base}/enviar-foto/${idItemPi}`,
      corpo
    );
  }
}
