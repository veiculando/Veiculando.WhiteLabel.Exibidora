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
            <aurum-button variante="outline" tamanho="sm" [desabilitado]="baixando" (click)="fechar.emit()">Cancelar</aurum-button>
            <aurum-button variante="wine" tamanho="sm" [desabilitado]="baixando" (click)="baixarPdf()">
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
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: color-mix(in srgb, var(--charcoal) 55%, transparent);
      }
      /* Figma 187:1364: painel 18px de raio, 36×40 de respiro. */
      .oem-painel {
        display: flex;
        flex-direction: column;
        gap: 24px;
        width: 560px;
        max-width: 100%;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
        padding: 36px 40px;
        background: var(--white);
        border-radius: 18px;
        box-shadow: 0 20px 48px rgba(38, 5, 5, 0.28);
      }
      .oem-titulo {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--primary-dark);
      }
      .oem-subtitulo {
        margin: -18px 0 0;
        font-size: 0.84375rem;
        color: rgba(84, 67, 65, 0.75);
      }
      .oem-opcao {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 18px 20px;
        border: 2px solid var(--primary-color);
        border-radius: 14px;
        background: color-mix(in srgb, var(--primary-color) 6%, var(--white));
        color: var(--charcoal);
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .oem-opcao:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .oem-opcao__icone {
        display: grid;
        place-items: center;
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: var(--gold-tint);
        font-size: 1.125rem;
      }
      .oem-opcao__texto {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.78125rem;
        color: rgba(84, 67, 65, 0.75);
      }
      .oem-opcao__texto strong {
        font-size: 0.90625rem;
        font-weight: 600;
        color: var(--primary-dark);
      }
      .oem-acoes {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
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
