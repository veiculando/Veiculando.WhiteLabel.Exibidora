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
 *
 * GET /api/wl/locais não pagina nem filtra por querystring (o BFF real
 * devolve um array cru) — a busca abaixo é aplicada em memória sobre o
 * que já foi carregado.
 */
@Component({
  selector: 'app-locais',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './locais.component.html',
})
export class LocaisComponent implements OnInit {
  private readonly localService = inject(LocalService);

  private todosOsLocais: LocalListItem[] = [];

  readonly locais = signal<LocalListItem[]>([]);
  readonly carregando = signal(false);
  readonly excluindoId = signal<number | null>(null);
  readonly erro = signal(false);
  readonly statusLabel = STATUS_EXIBICAO_LABEL;
  readonly StatusExibicao = StatusExibicao;

  ngOnInit(): void {
    this.carregar();
  }

  buscar(termo: string): void {
    const termoNormalizado = termo.trim().toLowerCase();
    if (!termoNormalizado) {
      this.locais.set(this.todosOsLocais);
      return;
    }
    this.locais.set(
      this.todosOsLocais.filter((local) =>
        [local.codigo, local.descricao, local.cidade]
          .filter((campo): campo is string => !!campo)
          .some((campo) => campo.toLowerCase().includes(termoNormalizado))
      )
    );
  }

  excluir(local: LocalListItem): void {
    if (!window.confirm(`Excluir o local ${local.codigo}?`)) {
      return;
    }

    this.excluindoId.set(local.id);
    this.erro.set(false);
    this.localService.deleteLocal(local.id).subscribe({
      next: () => {
        this.excluindoId.set(null);
        this.carregar();
      },
      error: () => {
        this.excluindoId.set(null);
        this.erro.set(true);
      },
    });
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);

    this.localService.listLocais().subscribe({
      next: (locais) => {
        this.todosOsLocais = locais;
        this.locais.set(locais);
        this.carregando.set(false);
      },
      error: () => {
        // Nunca exibe dados parciais/estado anterior em caso de falha.
        this.todosOsLocais = [];
        this.locais.set([]);
        this.carregando.set(false);
        this.erro.set(true);
      },
    });
  }
}
