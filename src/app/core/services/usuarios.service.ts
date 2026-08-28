import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuarioWl, UsuarioWlCreate, UsuarioWlUpdate } from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/usuarios`;

  listar(incluirExcluidos = false): Observable<UsuarioWl[]> {
    return this.http.get<UsuarioWl[]>(this.base, {
      params: incluirExcluidos ? { incluirExcluidos: 'true' } : {},
    });
  }

  obter(id: number): Observable<UsuarioWl> {
    return this.http.get<UsuarioWl>(`${this.base}/${id}`);
  }

  reenviarConvite(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/reenviar-convite`, {});
  }

  /**
   * `POST /api/wl/usuarios`. O BFF cria o operador pendente e envia um convite
   * de primeiro acesso; a senha nunca é escolhida pelo administrador.
   */
  criar(dto: UsuarioWlCreate): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, dto);
  }

  /**
   * `PUT /api/wl/usuarios/{id}` — atualiza dados cadastrais e permissoes.
   *
   * A atualizacao e parcial por campo: o que for omitido do payload e
   * preservado no servidor, entao enviar so `permissoes` nao zera o cargo.
   */
  atualizar(id: number, dto: UsuarioWlUpdate): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto);
  }

  /** `DELETE /api/wl/usuarios/{id}` — soft delete (`StatusExibicao = -1`). */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
