import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import { OrdemServicoService } from '../../core/services/ordem-servico.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';

export interface OsEntregaContexto {
  id: number;
  numeroFormatado: string;
  pecasCount: number;
  periodoNome: string | null;
}

/**
 * Modal de entrega da OS — VEI-RD-88c (Figma `187:1364`, 560×512).
 *
 * **Regra dura, decisão humana fechada 2026-09-17**: só a opção "🖨 Impressa
 * (PDF) — Planilha de Programação" é renderizada. "Atribuir a um Colador"
 * NÃO existe no DOM — não é um `OptionCard` desabilitado, simplesmente não
 * está aqui. Como sobra uma única opção, o layout é o de uma confirmação com
 * uma ação primária, não uma grade de dois cards com um buraco no lugar do
 * segundo.
 *
 * **Sem mutação de estado no servidor.** `OrdensServicoController` (lido no
 * BFF real, 2026-09-22) não tem `POST /{id}/entregar` — como a única opção
 * que sobrou é o PDF, "entregar" é só abrir `GET /api/wl/ordens-servico/{id}/pdf`,
 * igual ao padrão de "Baixar PI". Nenhuma chamada POST acontece aqui.
 */
@Component({
  selector: 'app-os-entrega-modal',
  imports: [CommonModule, AurumButtonComponent],
  template: `
    @if (aberto) {
      <div class="oem-backdrop" (click)="fechar.emit()">
        <div
          class="oem-painel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="oem-titulo"
          aria-describedby="oem-subtitulo"
          (click)="$event.stopPropagation()"
          (keydown.escape)="fechar.emit()"
        >
          <h2 id="oem-titulo" class="oem-titulo">Entregar Ordem de Serviço</h2>
          @if (contexto) {
            <p id="oem-subtitulo" class="oem-subtitulo">{{ subtitulo(contexto) }}</p>
          }

          @if (erro) {
            <div class="wl-estado wl-estado--erro">{{ erro }}</div>
          }

          <button type="button" class="oem-opcao" [disabled]="baixando" (click)="baixarPdf()">
            <span class="oem-opcao__icone" aria-hidden="true">🖨</span>
            <span class="oem-opcao__texto">
              <strong>Impressa (PDF)</strong>
              <span>Planilha de Programação</span>
            </span>
          </button>

          <div class="oem-acoes">
            <aurum-button variante="ghost" [desabilitado]="baixando" (click)="fechar.emit()">Cancelar</aurum-button>
            <aurum-button variante="wine" [desabilitado]="baixando" (click)="baixarPdf()">
              {{ baixando ? 'Abrindo…' : 'Confirmar entrega' }}
            </aurum-button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .oem-backdrop {
        position: fixed;
        inset: 0;
        background: color-mix(in srgb, var(--charcoal) 55%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .oem-painel {
        width: 560px;
        max-width: calc(100vw - 32px);
        max-height: 512px;
        background: var(--white);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-hover);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      }
      .oem-titulo {
        margin: 0;
        font-size: 1.25rem;
      }
      .oem-subtitulo {
        margin: 0;
        color: var(--on-surface);
        font-size: 0.875rem;
      }
      .oem-opcao {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface-muted);
        padding: 16px;
        cursor: pointer;
        text-align: left;
        font: inherit;
        color: var(--charcoal);
      }
      .oem-opcao:not(:disabled):hover {
        border-color: var(--primary-color);
      }
      .oem-opcao:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .oem-opcao__icone {
        font-size: 1.5rem;
      }
      .oem-opcao__texto {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .oem-acoes {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: auto;
      }
    `,
  ],
})
export class OrdemServicoEntregaModalComponent {
  private service = inject(OrdemServicoService);

  @Input() aberto = false;
  @Input() contexto: OsEntregaContexto | null = null;

  @Output() fechar = new EventEmitter<void>();
  /** Emitido depois que o PDF foi aberto com sucesso. */
  @Output() entregue = new EventEmitter<void>();

  baixando = false;
  erro: string | null = null;

  /**
   * Monta o subtítulo numa única interpolação — evitar `@if` aninhado num
   * nó de texto: espaços de indentação entre nós vizinhos colapsam para um
   * espaço CADA UM, e o resultado saía com espaço duplo antes do travessão.
   */
  subtitulo(contexto: OsEntregaContexto): string {
    const pecas = contexto.pecasCount === 1 ? 'peça' : 'peças';
    const periodo = contexto.periodoNome ? ` — ${contexto.periodoNome}` : '';
    return `${contexto.numeroFormatado} gerada com ${contexto.pecasCount} ${pecas}${periodo}`;
  }

  baixarPdf(): void {
    if (this.baixando || !this.contexto) return;
    const id = this.contexto.id;

    this.baixando = true;
    this.erro = null;

    this.service.pdf(id).subscribe({
      next: (blob) => {
        this.baixando = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        this.entregue.emit();
      },
      error: (erro: unknown) => {
        this.baixando = false;
        // Erro vira mensagem no modal — nunca navega para uma página quebrada.
        this.erro = mensagemDeErro(erro, 'Não foi possível abrir a planilha desta ordem de serviço.');
      },
    });
  }
}
