import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalService } from './services/local.service';
import { LocalListItem } from './models/local.model';
import { STATUS_EXIBICAO_LABEL, StatusExibicao } from './models/status-exibicao.enum';

/**
 * Listagem de Locais (Inventário).
 *
 * A afiliada exibida é sempre a resolvida pelo Host — este componente
 * jamais filtra ou envia um AfiliadaId próprio (ADR-WL-008). O status
 * "Aguardando aprovação" reflete StatusExibicao.AprovacaoPendente,
 * único indicador de fila de aprovação disponível (ADR-WL-004: não há
 * tela de aprovação nem AprovacaoLog na Exibidora).
 */
@Component({
  selector: 'app-locais',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './locais.component.html',
})
export class LocaisComponent implements OnInit {
  private readonly localService = inject(LocalService);

  readonly locais = signal<LocalListItem[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal(false);
  readonly statusLabel = STATUS_EXIBICAO_LABEL;
  readonly StatusExibicao = StatusExibicao;

  private buscaAtual = '';

  ngOnInit(): void {
    this.carregar();
  }

  buscar(termo: string): void {
    this.buscaAtual = termo;
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);

    this.localService.listLocais({ busca: this.buscaAtual || undefined }).subscribe({
      next: (resposta) => {
        this.locais.set(resposta.items);
        this.carregando.set(false);
      },
      error: () => {
        // Nunca exibe dados parciais/estado anterior em caso de falha.
        this.locais.set([]);
        this.carregando.set(false);
        this.erro.set(true);
      },
    });
  }
}
