import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuarioWl, UsuarioWlCreate, UsuarioWlUpdate } from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/usuarios`;

  listar(): Observable<UsuarioWl[]> {
    return this.http.get<UsuarioWl[]>(this.base);
  }

  obter(id: number): Observable<UsuarioWl> {
    return this.http.get<UsuarioWl>(`${this.base}/${id}`);
  }

  /**
   * `POST /api/wl/usuarios`. O BFF hasheia a senha com BCrypt e valida as
   * permissoes contra `WlPermissoesValidas` — um identificador fora da
   * whitelist volta como 400 com a lista das invalidas.
   */
  criar(dto: UsuarioWlCreate): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, dto);
  }

  /** `PUT /api/wl/usuarios/{id}` — na pratica atualiza somente permissoes. */
  atualizar(id: number, dto: UsuarioWlUpdate): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto);
  }

  /** `DELETE /api/wl/usuarios/{id}` — soft delete (`StatusExibicao = -1`). */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
