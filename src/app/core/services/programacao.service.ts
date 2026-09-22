import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginaFiltro, PaginaWl, ProgramacaoGradeFiltro, ProgramacaoGradeItem } from '../models/wl.models';
import { paramsDePagina } from './pedidos.service';

@Injectable({ providedIn: 'root' })
export class ProgramacaoService {
  private http = inject(HttpClient);

  /**
   * `POST /api/wl/programacao/listar` — espelha `ProgramacaoController.ListarGrade`
   * (VEI-RD-86a). POST porque o filtro vai no corpo, seguindo o padrão legado; a
   * paginação vai na query string, transversal a todas as listagens.
   *
   * `periodicidade` e `status` são os valores NUMÉRICOS de `PeriodicidadeEnum`/
   * `StatusPecaPeriodoEnum` — o BFF não registra `JsonStringEnumConverter`, então
   * o `System.Text.Json` padrão espera número, não o nome do enum.
   *
   * **A página é de PEÇAS, não de células.** A grade é peça (linha) × período
   * (coluna); paginar células cortaria uma peça no meio, com parte dos períodos
   * numa página e o resto na seguinte. O `total` do envelope conta peças.
   *
   * Quando o servidor responde 400 com a mensagem de período invertido
   * (`MSG_PERIODO_INVERTIDO`), o erro sobe pelo Observable como qualquer outro —
   * quem chama decide se mostra como validação de formulário ou erro genérico.
   */
  listar(
    filtro: ProgramacaoGradeFiltro,
    pagina?: PaginaFiltro
  ): Observable<PaginaWl<ProgramacaoGradeItem>> {
    return this.http.post<PaginaWl<ProgramacaoGradeItem>>(
      `${environment.bffUrl}/programacao/listar`,
      {
        periodicidade: filtro.periodicidade ?? null,
        idPeriodoInicial: filtro.idPeriodoInicial ?? null,
        idPeriodoFinal: filtro.idPeriodoFinal ?? null,
        status: filtro.status ?? null,
        idCidade: filtro.idCidade ?? null,
        anunciante: filtro.anunciante ?? null,
      },
      { params: paramsDePagina(pagina) }
    );
  }
}
