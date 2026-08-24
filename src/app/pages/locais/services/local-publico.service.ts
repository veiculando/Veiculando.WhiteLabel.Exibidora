import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LocalPublicoPayload } from '../models/local-publico.model';

/**
 * Etapa "Dados Demográficos" do wizard de Local (T4 do plano tático).
 *
 * Usa endpoints próprios (GET/PUT /api/wl/locais/{id}/publico) que o BFF
 * delega ao Core via LocalPublicoCadastroCommand / POST /api/local/publico.
 * Propositalmente NÃO reaproveita LocalService: misturar os dois contratos
 * no mesmo PUT é o risco de perda de dado descrito no plano tático (uma
 * aba sobrescrevendo a outra).
 */
@Injectable({ providedIn: 'root' })
export class LocalPublicoService {
  private readonly http = inject(HttpClient);

  private urlFor(idLocal: number): string {
    return `${environment.bffUrl}/locais/${idLocal}/publico`;
  }

  getPublico(idLocal: number): Observable<LocalPublicoPayload> {
    return this.http.get<LocalPublicoPayload>(this.urlFor(idLocal));
  }

  /**
   * PUT devolve `{success, data:{local:{...}}}` — a mesma projeção de
   * Local usada por LocalService, não um LocalPublicoPayload (ver
   * LocaisController.PutPublico no BFF). Nada aqui usa o corpo da
   * resposta hoje, então o tipo fica deliberadamente `unknown`.
   */
  savePublico(idLocal: number, payload: LocalPublicoPayload): Observable<unknown> {
    return this.http.put<unknown>(this.urlFor(idLocal), payload);
  }
}
