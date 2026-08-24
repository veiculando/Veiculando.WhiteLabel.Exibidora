import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProgramacaoFiltro, ProgramacaoItem } from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class ProgramacaoService {
  private http = inject(HttpClient);

  /**
   * `POST /api/wl/programacao/listar` — e POST mesmo, seguindo o padrao legado
   * de enviar o filtro no corpo.
   *
   * O BFF ignora `idPeriodo`/`idLocal` quando ausentes ou <= 0, entao "todos"
   * e representado por `null`.
   */
  listar(filtro: ProgramacaoFiltro): Observable<ProgramacaoItem[]> {
    return this.http.post<ProgramacaoItem[]>(`${environment.bffUrl}/programacao/listar`, {
      idPeriodo: filtro.idPeriodo ?? null,
      idLocal: filtro.idLocal ?? null,
    });
  }
}
