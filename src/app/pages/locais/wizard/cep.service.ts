import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface EnderecoPorCep {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

interface ViaCepResposta {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

/**
 * Consulta pública de CEP (ViaCEP) — mesma fonte externa que o Admin usa
 * (`Veiculando.Admin — Mapa de Serviços`, seção 3: "CepService — Consulta
 * externa de CEPs brasileiros (Correios/ViaCEP)"). Chamada direto do
 * navegador, sem passar pelo BFF: não há dado de tenant envolvido, é
 * consulta pública de endereço por CEP.
 *
 * Falha (CEP inexistente, erro de rede) é sempre tratada por quem chama como
 * "não preencheu automaticamente" — nunca bloqueia o formulário.
 */
@Injectable({ providedIn: 'root' })
export class CepService {
  private readonly http = inject(HttpClient);

  consultar(cep: string): Observable<EnderecoPorCep | null> {
    const numeros = cep.replace(/\D/g, '');
    return this.http.get<ViaCepResposta>(`https://viacep.com.br/ws/${numeros}/json/`).pipe(
      map((resposta) => {
        if (!resposta || resposta.erro || !resposta.logradouro) return null;
        return {
          logradouro: resposta.logradouro ?? '',
          bairro: resposta.bairro ?? '',
          localidade: resposta.localidade ?? '',
          uf: resposta.uf ?? '',
        };
      })
    );
  }
}
