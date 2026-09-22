import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KycService } from '../../core/services/comercial.service';
import { EstadoOnboarding, KycFilaItem, KycResumo, TipoOrganizacao } from '../../core/models/comercial.models';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumDropdownComponent } from '../../shared/aurum/aurum-dropdown.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';

interface Chip {
  chave: string;
  rotulo: string;
}

/**
 * Fila de triagem de KYC — VEI-RD-80, frame `154:4927` (componente `KYCFila`).
 *
 * **Cinco chips, não sete.** `Rascunho` é estado do solicitante, ainda não enviado:
 * ninguém pediu análise, então não é item de fila. `Suspenso` é ação pós-aprovação,
 * aplicada no detalhe de uma organização já ativa. Os dois seguem existindo no
 * domínio — o que muda é o que a triagem mostra.
 */
@Component({
  selector: 'app-kyc',
  imports: [
    FormsModule,
    RouterModule,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumDropdownComponent,
    AurumFilterFieldComponent,
    AurumTextInputComponent,
    AurumStatusPillComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  templateUrl: './kyc.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .kyc__chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
      .kyc__chip { background: none; border: 1px solid var(--border-color); border-radius: 999px; padding: 6px 14px; cursor: pointer; font: inherit; color: var(--on-surface); }
      .kyc__chip[aria-pressed='true'] { background: color-mix(in srgb, var(--primary-color) 12%, transparent); border-color: var(--primary-color); font-weight: 600; }
      .kyc__filtros { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
      .kyc__busca { flex: 1 1 320px; }
      .kyc__empresa { display: flex; flex-direction: column; gap: 2px; }
      .kyc__razao { font-size: 0.8rem; color: var(--on-surface); }
      .kyc__vazio { padding: 32px; text-align: center; color: var(--on-surface); }
      .kyc__pendente { font-style: italic; color: var(--on-surface); }
      input[type='date'] { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font: inherit; background: var(--surface); color: var(--on-surface); }
    `,
  ],
})
export class KycComponent implements OnInit {
  private serv = inject(KycService);

  analises: KycFilaItem[] = [];
  resumo: KycResumo = {};
  total = 0;
  carregando = false;
  erro = '';

  busca = '';
  tipo = '';
  analistaId = '';
  /**
   * Data de envio — campo de data LIVRE, e aqui isso é legítimo. A regra do
   * PRD §2.3 proíbe data livre onde o domínio exige `Periodo.Id`: período comercial
   * de veiculação. Isto é metadado do processo — não existe bissemana de envio de KYC.
   */
  dataEnvio = '';
  estadoSelecionado = '';

  readonly chips: Chip[] = [
    { chave: 'PendenteVerificacao', rotulo: 'Pendente' },
    { chave: 'EmAnalise', rotulo: 'Em análise' },
    { chave: 'AjustesSolicitados', rotulo: 'Ajustes solicitados' },
    { chave: 'Aprovado', rotulo: 'Aprovado' },
    { chave: 'Rejeitado', rotulo: 'Rejeitado' },
  ];

  readonly opcoesTipo = [
    { valor: '', rotulo: 'Todos' },
    { valor: 'Agencia', rotulo: 'Agência' },
    { valor: 'Cliente', rotulo: 'Anunciante' },
  ];

  ngOnInit(): void {
    this.carregar();
  }

  private filtros() {
    return {
      tipo: this.tipo || undefined,
      analistaId: this.analistaId ? Number(this.analistaId) : undefined,
      dataEnvio: this.dataEnvio || undefined,
      busca: this.busca || undefined,
    };
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';

    this.serv.fila({ ...this.filtros(), estado: this.estadoSelecionado || undefined }).subscribe({
      next: (pagina) => {
        this.analises = pagina.Itens;
        this.total = pagina.Total;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar a fila de análises.';
        this.carregando = false;
      },
    });

    // O resumo usa os MESMOS filtros da listagem (menos o estado, que é o eixo da
    // contagem): um chip dizendo 12 enquanto a lista filtrada mostra 3 não diz ao
    // operador qual dos dois números é o do trabalho dele.
    this.serv.resumo(this.filtros()).subscribe({
      next: (resumo) => (this.resumo = resumo),
      error: () => (this.resumo = {}),
    });
  }

  selecionarChip(chave: string): void {
    this.estadoSelecionado = this.estadoSelecionado === chave ? '' : chave;
    this.carregar();
  }

  contagem(chave: string): number {
    return this.resumo[chave] ?? 0;
  }

  rotuloTipo(tipo: TipoOrganizacao): string {
    return tipo === TipoOrganizacao.Agencia ? 'Agência' : 'Anunciante';
  }

  rotuloEstado(estado: EstadoOnboarding): string {
    const chip = this.chips.find((c) => EstadoOnboarding[estado] === c.chave);
    return chip?.rotulo ?? EstadoOnboarding[estado];
  }

  tomEstado(estado: EstadoOnboarding): AurumStatusPillTom {
    switch (estado) {
      case EstadoOnboarding.Aprovado:
        return 'sucesso';
      case EstadoOnboarding.Rejeitado:
        return 'perigo';
      case EstadoOnboarding.AjustesSolicitados:
        return 'aviso';
      case EstadoOnboarding.EmAnalise:
        return 'primario';
      default:
        return 'neutro';
    }
  }

  /** Data E hora — o Figma mostra `10/08/2026 09:12`. */
  envio(item: KycFilaItem): string {
    if (!item.DataEnvio) return '—';
    const data = new Date(item.DataEnvio);
    const d = String(data.getDate()).padStart(2, '0');
    const m = String(data.getMonth() + 1).padStart(2, '0');
    const h = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${data.getFullYear()} ${h}:${min}`;
  }

  /** Analista vazio renderiza travessão, não string vazia: confirma que ninguém assumiu. */
  analista(item: KycFilaItem): string {
    return item.AnalistaNome ?? '—';
  }

  assumir(item: KycFilaItem): void {
    this.serv.assumir(item.Id).subscribe({
      next: () => this.carregar(),
      error: (resposta) => {
        this.erro = resposta?.error?.message ?? 'Não foi possível assumir a análise.';
      },
    });
  }
}
