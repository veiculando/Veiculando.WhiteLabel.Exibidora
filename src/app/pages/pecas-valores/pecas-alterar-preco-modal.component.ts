import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlteracaoValorTipo, PecaValorListItem, PeriodoLookup } from '../../core/models/wl.models';
import { LookupsService } from '../../core/services/lookups.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';

type ModoValor = 'valorExato' | 'incrementar' | 'reduzir' | 'percIncrementar' | 'percReduzir';

export interface AlterarPrecoConfirmacao {
  modo: 'padrao' | 'sazonal';
  /** Presente apenas quando `modo === 'padrao'`. */
  tipoValor?: AlteracaoValorTipo;
  /** Já com o sinal aplicado (negativo para "reduzir"). */
  valor: number;
  /** Presente apenas quando `modo === 'sazonal'`. */
  idPeriodo?: number;
}

/**
 * Modal "Alterar Preço" (VEI-RD-54) — plano tático Ordem 5, seção 3.
 *
 * Primeiro modal do projeto: não há um `aurum-modal`/dialog reutilizável
 * ainda (confirmações hoje usam `window.confirm` cru — ver `LocaisComponent`),
 * então este componente é autocontido (overlay + painel), estilizado com os
 * tokens Aurum já usados no resto do app.
 *
 * Cinco modos, mapeados para `AlteracaoValorTipo` (Core): valor exato ·
 * acrescentar R$ · reduzir R$ · acrescentar % · reduzir %. "Acrescentar" e
 * "reduzir" da mesma unidade mapeiam para o MESMO tipo (Incremento ou
 * Porcentagem) — a diferença é só o sinal do valor enviado, porque é assim
 * que `Peca.AlterarValorPadrao` do Core já opera (`ValorPadrao + valor`).
 *
 * Quando um período específico é selecionado, o comando sazonal do Core
 * (`PecaAlterarValoresSazonaisCommand`) só aceita um valor exato por período
 * — não tem `TipoValor`. Por isso os outros quatro modos ficam indisponíveis
 * nesse caso, e não por uma limitação desta tela.
 */
@Component({
  selector: 'app-pecas-alterar-preco-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AurumButtonComponent],
  template: `
    <div class="ppm-overlay" (click)="aoClicarNoOverlay($event)">
      <div class="ppm-painel" role="dialog" aria-modal="true" aria-labelledby="ppm-titulo">
        <h2 id="ppm-titulo" class="ppm-titulo">Alterar Preço</h2>
        <p class="ppm-subtitulo">{{ itens.length }} peça(s) selecionada(s).</p>

        <div class="ppm-campo">
          <span class="ppm-rotulo">Período</span>
          <select [(ngModel)]="escopo" (ngModelChange)="aoTrocarEscopo()">
            <option value="todos">Todos (valor padrão)</option>
            @for (periodo of periodos; track periodo.id) {
              <option [ngValue]="periodo.id.toString()">{{ periodo.nome }}</option>
            }
          </select>
        </div>

        @if (escopo === 'todos') {
          <div class="ppm-campo">
            <span class="ppm-rotulo">Modo</span>
            <select [(ngModel)]="modo">
              <option value="valorExato">Valor exato</option>
              <option value="incrementar">Acrescentar R$</option>
              <option value="reduzir">Reduzir R$</option>
              <option value="percIncrementar">Acrescentar %</option>
              <option value="percReduzir">Reduzir %</option>
            </select>
          </div>
        } @else {
          <p class="ppm-aviso">
            Para um período específico, o valor sazonal é sempre exato — substitui o valor vigente
            naquele período para as peças selecionadas.
          </p>
        }

        <div class="ppm-campo">
          <span class="ppm-rotulo">{{ rotuloValor() }}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            [(ngModel)]="valorDigitado"
            [attr.aria-label]="rotuloValor()"
          />
        </div>

        @if (previaDisponivel()) {
          <div class="ppm-previa">
            <strong>Prévia de impacto</strong>
            <p>{{ itens.length }} peça(s) afetada(s).</p>
            <p>Total atual: {{ formatarMoeda(totalAtual()) }}</p>
            <p>Total novo (estimado): {{ formatarMoeda(totalNovo()) }}</p>
          </div>
        } @else if (escopo !== 'todos') {
          <div class="ppm-previa">
            <strong>Prévia de impacto</strong>
            <p>{{ itens.length }} peça(s) receberão o valor sazonal informado neste período.</p>
          </div>
        }

        @if (erro) {
          <p class="ppm-erro" role="alert">{{ erro }}</p>
        }

        <div class="ppm-acoes">
          <aurum-button variante="ghost" [desabilitado]="salvando" (click)="fechar.emit()">Cancelar</aurum-button>
          <aurum-button [desabilitado]="!podeConfirmar() || salvando" (click)="aoConfirmar()">
            {{ salvando ? 'Salvando…' : 'Confirmar' }}
          </aurum-button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .ppm-overlay {
        position: fixed;
        inset: 0;
        background: color-mix(in srgb, var(--charcoal) 55%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 16px;
      }
      .ppm-painel {
        background: var(--white);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-hover);
        padding: 24px;
        width: 100%;
        max-width: 420px;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
      }
      .ppm-titulo {
        margin: 0 0 4px;
        font-size: 1.25rem;
      }
      .ppm-subtitulo {
        margin: 0 0 16px;
        color: var(--on-surface);
        font-size: 0.875rem;
      }
      .ppm-campo {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 14px;
      }
      .ppm-rotulo {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--on-surface);
      }
      .ppm-campo select,
      .ppm-campo input {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 8px 10px;
        font: inherit;
      }
      .ppm-aviso {
        font-size: 0.8125rem;
        color: var(--on-surface);
        background: var(--surface-muted);
        border-radius: var(--radius-sm);
        padding: 10px 12px;
        margin: 0 0 14px;
      }
      .ppm-previa {
        background: var(--surface-muted);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
        margin-bottom: 14px;
        font-size: 0.875rem;
      }
      .ppm-previa p {
        margin: 4px 0 0;
      }
      .ppm-erro {
        color: var(--danger);
        font-size: 0.875rem;
        margin: 0 0 12px;
      }
      .ppm-acoes {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    `,
  ],
})
export class PecasAlterarPrecoModalComponent implements OnInit {
  private readonly lookups = inject(LookupsService);

  @Input() itens: PecaValorListItem[] = [];
  @Input() salvando = false;
  @Input() erro: string | null = null;

  @Output() confirmar = new EventEmitter<AlterarPrecoConfirmacao>();
  @Output() fechar = new EventEmitter<void>();

  periodos: PeriodoLookup[] = [];

  /** `'todos'` ou o id do período, como string (necessário para `<select>` nativo). */
  escopo: 'todos' | string = 'todos';
  modo: ModoValor = 'valorExato';
  valorDigitado: number | null = null;

  ngOnInit(): void {
    this.lookups.periodos().subscribe({ next: (p) => (this.periodos = p), error: () => (this.periodos = []) });
  }

  aoTrocarEscopo(): void {
    if (this.escopo !== 'todos') this.modo = 'valorExato';
  }

  aoClicarNoOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.fechar.emit();
  }

  rotuloValor(): string {
    switch (this.modo) {
      case 'incrementar':
        return 'Valor a acrescentar (R$)';
      case 'reduzir':
        return 'Valor a reduzir (R$)';
      case 'percIncrementar':
        return 'Percentual a acrescentar (%)';
      case 'percReduzir':
        return 'Percentual a reduzir (%)';
      default:
        return this.escopo === 'todos' ? 'Novo valor (R$)' : 'Valor sazonal (R$)';
    }
  }

  previaDisponivel(): boolean {
    return this.escopo === 'todos' && this.valorDigitado !== null && this.valorDigitado >= 0;
  }

  totalAtual(): number {
    return this.itens.reduce((soma, item) => soma + item.valorPadrao, 0);
  }

  totalNovo(): number {
    if (this.valorDigitado === null) return this.totalAtual();
    return this.itens.reduce((soma, item) => soma + this.calcularNovoValor(item.valorPadrao), 0);
  }

  private calcularNovoValor(valorAtual: number): number {
    const valor = this.valorDigitado ?? 0;
    switch (this.modo) {
      case 'incrementar':
        return Math.max(0, valorAtual + valor);
      case 'reduzir':
        return Math.max(0, valorAtual - valor);
      case 'percIncrementar':
        return Math.max(0, valorAtual + valorAtual * (valor / 100));
      case 'percReduzir':
        return Math.max(0, valorAtual - valorAtual * (valor / 100));
      default:
        return valor;
    }
  }

  podeConfirmar(): boolean {
    if (this.valorDigitado === null || this.valorDigitado < 0) return false;
    if (this.escopo !== 'todos' && this.valorDigitado === 0) return false;
    return this.itens.length > 0;
  }

  aoConfirmar(): void {
    if (!this.podeConfirmar() || this.valorDigitado === null) return;

    if (this.escopo === 'todos') {
      const { tipoValor, valor } = this.tipoEValorPadrao(this.valorDigitado);
      this.confirmar.emit({ modo: 'padrao', tipoValor, valor });
      return;
    }

    this.confirmar.emit({ modo: 'sazonal', valor: this.valorDigitado, idPeriodo: Number(this.escopo) });
  }

  private tipoEValorPadrao(valorDigitado: number): { tipoValor: AlteracaoValorTipo; valor: number } {
    switch (this.modo) {
      case 'incrementar':
        return { tipoValor: AlteracaoValorTipo.Incremento, valor: valorDigitado };
      case 'reduzir':
        return { tipoValor: AlteracaoValorTipo.Incremento, valor: -valorDigitado };
      case 'percIncrementar':
        return { tipoValor: AlteracaoValorTipo.Porcentagem, valor: valorDigitado };
      case 'percReduzir':
        return { tipoValor: AlteracaoValorTipo.Porcentagem, valor: -valorDigitado };
      default:
        return { tipoValor: AlteracaoValorTipo.ValorExato, valor: valorDigitado };
    }
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
