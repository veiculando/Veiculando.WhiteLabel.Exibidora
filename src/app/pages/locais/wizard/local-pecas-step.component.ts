import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PecaService } from '../services/peca.service';
import { PecaListItem } from '../models/peca.model';
import { STATUS_EXIBICAO_LABEL, StatusExibicao } from '../models/status-exibicao.enum';

/**
 * Etapa 3 do wizard — "Peças". Lista as peças do local e encaminha o
 * cadastro/edição para as rotas dedicadas de peça (T1/T2 do plano
 * tático), que já existem independentemente do wizard.
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
  readonly StatusExibicao = StatusExibicao;

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
