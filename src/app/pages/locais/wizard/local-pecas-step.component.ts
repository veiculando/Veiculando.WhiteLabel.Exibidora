import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PecaService } from '../services/peca.service';
import { PecaListItem } from '../models/peca.model';
import { STATUS_EXIBICAO_LABEL } from '../models/status-exibicao.enum';
import { PhotoUploadComponent } from '../../../shared/photo-upload.component';
import { environment } from '../../../../environments/environment';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumStatusPillComponent } from '../../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../../shared/aurum/aurum-table.component';

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
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PhotoUploadComponent,
    AurumButtonComponent,
    AurumStatusPillComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  templateUrl: './local-pecas-step.component.html',
  styles: [
    `
      .local-pecas-step__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .local-pecas-step__acoes {
        display: flex;
        align-items: center;
        gap: 12px;
        white-space: nowrap;
      }
      .local-pecas-step__link {
        color: var(--primary-color);
        text-decoration: none;
      }
      .local-pecas-step__link:hover {
        text-decoration: underline;
      }
      .local-pecas-step__link-primario {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-pill);
        padding: 10px 20px;
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        background: var(--primary-color);
        color: var(--white);
        text-decoration: none;
        box-shadow: var(--shadow-base);
      }
      .local-pecas-step__link-primario:hover {
        background: var(--primary-dark);
        box-shadow: var(--shadow-hover);
      }
    `,
  ],
})
export class LocalPecasStepComponent implements OnInit {
  readonly bffUrl = environment.bffUrl;
  readonly fotoPecaId = signal<number | null>(null);
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
