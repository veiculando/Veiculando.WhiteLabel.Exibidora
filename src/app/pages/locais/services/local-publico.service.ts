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

  savePublico(idLocal: number, payload: LocalPublicoPayload): Observable<LocalPublicoPayload> {
    return this.http.put<LocalPublicoPayload>(this.urlFor(idLocal), payload);
  }
}
