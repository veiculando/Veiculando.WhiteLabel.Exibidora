import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PecaDetalhe, PecaListItem, PecaPayload } from '../models/peca.model';

/**
 * Consome o CRUD de Peça do BFF WhiteLabel (T1/T2 do plano tático).
 * `idLocal` sempre chega como parâmetro explícito (nunca lido do próprio
 * payload do formulário) — a rota é a única fonte do local pai.
 */
@Injectable({ providedIn: 'root' })
export class PecaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.bffUrl}/pecas`;

  listPecasByLocal(idLocal: number): Observable<PecaListItem[]> {
    return this.http.get<PecaListItem[]>(`${environment.bffUrl}/locais/${idLocal}/pecas`);
  }

  getPeca(id: number): Observable<PecaDetalhe> {
    return this.http.get<PecaDetalhe>(`${this.baseUrl}/${id}`);
  }

  createPeca(payload: PecaPayload): Observable<PecaDetalhe> {
    return this.http.post<PecaDetalhe>(this.baseUrl, payload);
  }

  updatePeca(id: number, payload: PecaPayload): Observable<PecaDetalhe> {
    return this.http.put<PecaDetalhe>(`${this.baseUrl}/${id}`, payload);
  }
}
