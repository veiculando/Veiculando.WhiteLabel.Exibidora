import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PecaService } from '../services/peca.service';
import { PecaListItem } from '../models/peca.model';
import { STATUS_EXIBICAO_LABEL } from '../models/status-exibicao.enum';

/**
 * Etapa 3 do wizard — "Peças". Lista as peças do local e encaminha o
 * cadastro/edição para as rotas dedicadas de peça (T1/T2 do plano
 * tático), que já existem independentemente do wizard.
 *
 * GET /api/wl/pecas real não tem rota escopada por local — a listagem
 * inteira da afiliada é filtrada em memória por idLocal em
 * PecaService.listPecasByLocal — nem status/tipoSuporte/foto (a
 * listagem real é enxuta; só o detalhe de uma peça específica traz
 * esses campos).
 */
@Component({
  selector: 'app-local-pecas-step',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './local-pecas-step.component.html',
})
export class LocalPecasStepComponent implements OnInit {
  @Input({ required: true }) idLocal!: number;

  private readonly pecaService = inject(PecaService);

  readonly pecas = signal<PecaListItem[]>([]);
  readonly carregando = signal(false);
  readonly statusLabel = STATUS_EXIBICAO_LABEL;

  ngOnInit(): void {
    if (!this.idLocal) return;
    this.carregando.set(true);
    this.pecaService.listPecasByLocal(this.idLocal).subscribe({
      next: (pecas) => {
        this.pecas.set(pecas);
        this.carregando.set(false);
      },
      error: () => {
        this.pecas.set([]);
        this.carregando.set(false);
      },
    });
  }
}
