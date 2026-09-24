import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlteracaoValorTipo, PecaValorListItem, PeriodoLookup } from '../../core/models/wl.models';
import { LookupsService } from '../../core/services/lookups.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumModalComponent } from '../../shared/aurum/aurum-modal.component';

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
  imports: [CommonModule, FormsModule, AurumButtonComponent, AurumModalComponent],
  template: `
    <aurum-modal [aberto]="true" titulo="Alterar Preço de Peças" posicao="lateral" (fechar)="!salvando && fechar.emit()">
      <div class="ppm-corpo">
        <p class="ppm-resumo">
          Resumo da seleção: <strong>{{ itens.length }} peça(s) selecionada(s)</strong>.
        </p>

        @if (escopo === 'todos') {
          <label class="wl-campo">
            <span class="ppm-rotulo">Tipo de Alteração de Valor</span>
            <select [(ngModel)]="modo">
              <option value="valorExato">Definir valor exato em Reais (R$)</option>
              <option value="incrementar">Acrescentar valor em Reais (R$)</option>
              <option value="reduzir">Reduzir valor em Reais (R$)</option>
              <option value="percIncrementar">Acrescentar percentual (%)</option>
              <option value="percReduzir">Reduzir percentual (%)</option>
            </select>
          </label>
        } @else {
          <p class="ppm-aviso">
            Para um período específico, o valor sazonal é sempre exato — substitui o valor vigente
            naquele período para as peças selecionadas.
          </p>
        }

        <label class="wl-campo">
          <span class="ppm-rotulo">{{ rotuloValor() }}</span>
          <input
            class="ppm-valor"
            type="number"
            min="0"
            step="0.01"
            [(ngModel)]="valorDigitado"
            [attr.aria-label]="rotuloValor()"
          />
        </label>

        <label class="wl-campo">
          <span class="ppm-rotulo">Configurar Valor Por Período Comercial</span>
          <select [(ngModel)]="escopo" (ngModelChange)="aoTrocarEscopo()">
            <option value="todos">Valor Padrão Permanente (Todos os Períodos)</option>
            @for (periodo of periodos; track periodo.id) {
              <option [ngValue]="periodo.id.toString()">{{ periodo.nome }}</option>
            }
          </select>
        </label>

        @if (previaDisponivel()) {
          <div class="ppm-previa">
            <span class="ppm-previa__titulo">Prévia do impacto financeiro</span>
            <div class="ppm-previa__linha">
              <span>Soma Total Atual:</span>
              <strong>{{ formatarMoeda(totalAtual()) }}</strong>
            </div>
            <div class="ppm-previa__linha ppm-previa__linha--nova">
              <span>Soma Total Após Ajuste:</span>
              <strong>{{ formatarMoeda(totalNovo()) }}</strong>
            </div>
            @if (variacaoMedia() !== null) {
              <p class="ppm-previa__rodape">Variação média aproximada: <strong>{{ variacaoMedia() }}%</strong></p>
            }
          </div>
        } @else if (escopo !== 'todos') {
          <div class="ppm-previa">
            <span class="ppm-previa__titulo">Prévia do impacto financeiro</span>
            <p class="ppm-previa__rodape">{{ itens.length }} peça(s) receberão o valor sazonal informado neste período.</p>
          </div>
        }

        @if (erro) {
          <p class="wl-estado wl-estado--erro" role="alert">{{ erro }}</p>
        }
      </div>

      <aurum-button aurumModalRodape class="ppm-acao" variante="ghost" [desabilitado]="salvando" (click)="fechar.emit()">Cancelar</aurum-button>
      <aurum-button aurumModalRodape class="ppm-acao" variante="gold" [desabilitado]="!podeConfirmar() || salvando" (click)="aoConfirmar()">
        {{ salvando ? 'Salvando…' : 'Confirmar Alteração' }}
      </aurum-button>
    </aurum-modal>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .ppm-corpo {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .ppm-resumo {
        margin: 0;
        padding: 12px;
        border-radius: var(--radius-search);
        background: var(--paper-bg);
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .ppm-rotulo {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--charcoal);
      }
      .ppm-valor {
        font-size: 1rem !important;
        font-weight: 700;
      }
      .ppm-aviso {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .ppm-previa {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 14px;
        border: 1px solid var(--danger-border);
        border-radius: 12px;
        background: var(--danger-bg);
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .ppm-previa__titulo {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--primary-color);
      }
      .ppm-previa__linha {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .ppm-previa__linha strong {
        color: var(--charcoal);
      }
      .ppm-previa__linha--nova strong {
        font-size: 0.9375rem;
        color: var(--primary-dark);
      }
      .ppm-previa__rodape {
        margin: 0;
        padding-top: 8px;
        border-top: 1px solid var(--danger-border);
        font-size: 0.71875rem;
      }
      .ppm-acao {
        flex: 1;
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

  /** Variação percentual entre as somas (Figma: "Variação média aproximada"). */
  variacaoMedia(): string | null {
    const atual = this.totalAtual();
    if (!atual) return null;
    return (((this.totalNovo() - atual) / atual) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  formatarMoeda(valor: number): string {
    return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
