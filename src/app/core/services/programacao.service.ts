import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginaFiltro, PaginaWl, ProgramacaoFiltro, ProgramacaoItem } from '../models/wl.models';
import { paramsDePagina } from './pedidos.service';

@Injectable({ providedIn: 'root' })
export class ProgramacaoService {
  private http = inject(HttpClient);

  /**
   * `POST /api/wl/programacao/listar` — e POST mesmo, seguindo o padrao legado
   * de enviar o filtro no corpo. A paginacao vai na query string, porque e
   * transversal a todas as listagens e nao faz parte do filtro de dominio.
   *
   * O BFF ignora `idPeriodo`/`idLocal` quando ausentes ou <= 0, entao "todos"
   * e representado por `null`.
   *
   * **A pagina e de PECAS, nao de celulas.** A grade e peca (linha) x periodo
   * (coluna); paginar celulas cortaria uma peca no meio, com parte dos periodos
   * numa pagina e o resto na seguinte. O `total` do envelope conta pecas.
   */
  listar(
    filtro: ProgramacaoFiltro,
    pagina?: PaginaFiltro
  ): Observable<PaginaWl<ProgramacaoItem>> {
    return this.http.post<PaginaWl<ProgramacaoItem>>(
      `${environment.bffUrl}/programacao/listar`,
      {
        idPeriodo: filtro.idPeriodo ?? null,
        idLocal: filtro.idLocal ?? null,
      },
      { params: paramsDePagina(pagina) }
    );
  }
}
