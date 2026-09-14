import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LocalDetalhe,
  LocalFormPayload,
  LocalListItem,
  PecaListItem,
} from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class LocaisService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/locais`;
  private readonly basePecas = `${environment.bffUrl}/pecas`;

  /**
   * `GET /api/wl/locais`.
   *
   * A listagem ja vem filtrada por `AfiliadaId` no servidor — por isso a UI
   * nao tem (e nao deve ter) seletor de afiliada.
   */
  listar(): Observable<LocalListItem[]> {
    return this.http.get<LocalListItem[]>(this.base);
  }

  obter(id: number): Observable<LocalDetalhe> {
    return this.http.get<LocalDetalhe>(`${this.base}/${id}`);
  }

  /**
   * `POST /api/wl/locais`.
   *
   * O local nasce **aguardando aprovação** — a liberação é feita pela equipe
   * Veiculando no Admin. Isso não é decidido pelo frontend nem pelo BFF: o
   * handler do core aplica a transição ao ver que quem cadastrou é um usuário
   * de afiliada (ADR-WL-004).
   */
  criar(payload: LocalFormPayload): Observable<unknown> {
    return this.http.post(this.base, payload);
  }

  /** `PUT /api/wl/locais/{id}` — o BFF valida a propriedade antes de repassar. */
  atualizar(id: number, payload: LocalFormPayload): Observable<unknown> {
    return this.http.put(`${this.base}/${id}`, payload);
  }

  /** `DELETE /api/wl/locais/{id}` — soft delete no core, valida tenant (anti-IDOR). */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** `GET /api/wl/pecas` — todas as pecas da afiliada; filtradas por local na UI. */
  listarPecas(): Observable<PecaListItem[]> {
    return this.http.get<PecaListItem[]>(this.basePecas);
  }

  /**
   * `POST /api/wl/pecas/locais/{idLocal}/pecas/{pecaId}/foto`.
   *
   * A rota parece redundante porque e: a action declara o template completo
   * dentro de um controller que ja tem prefixo `api/wl/[controller]`. Mantida
   * exatamente como o BFF expoe.
   *
   * Limite de 10MB neste endpoint (o de checking e 15MB) — validado no servidor
   * por `FileValidationService`.
   */
  enviarFotoPeca(idLocal: number, pecaId: number, foto: File): Observable<{ message: string; fileName: string }> {
    const corpo = new FormData();
    corpo.append('foto', foto, foto.name);
    return this.http.post<{ message: string; fileName: string }>(
      `${this.basePecas}/locais/${idLocal}/pecas/${pecaId}/foto`,
      corpo
    );
  }
}
