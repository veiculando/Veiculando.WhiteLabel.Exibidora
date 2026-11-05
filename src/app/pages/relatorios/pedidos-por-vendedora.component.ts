import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionService } from '../../core/auth/permission.service';
import { mensagemDeErro } from '../../core/http/api-error';
import { CarteiraReviewService, PedidosPorVendedora } from '../../core/services/carteira-review.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import {
  AurumTableCellComponent, AurumTableComponent, AurumTableHeaderCellComponent, AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { formatarCnpj } from '../kyc/app-review/carteira-review.component';

const isoDia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Pedidos fechados na Prospecção, por vendedora (VEI-RD-157f). Base para a comissão
 * interna da vendedora; o pedido fica com quem vendeu, mesmo após troca de responsável.
 */
@Component({
  selector: 'app-pedidos-por-vendedora',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [DatePipe, FormsModule, AurumButtonComponent, AurumTableComponent, AurumTableRowComponent,
    AurumTableCellComponent, AurumTableHeaderCellComponent],
  template: `
    <section class="pv" aria-labelledby="pv-titulo">
      <h2 id="pv-titulo">Pedidos por vendedora</h2>
      <p class="pv__sub">Pedidos fechados pela Prospecção. O pedido fica com a vendedora que vendeu.</p>
      <div class="pv__filtros">
        <label>De<input type="date" [(ngModel)]="de" /></label>
        <label>Até<input type="date" [(ngModel)]="ate" /></label>
        <label>Vendedora
          <select [(ngModel)]="vendedorId">
            <option [ngValue]="null">Todas</option>
            @for (v of opcoes; track v.vendedorId) { <option [ngValue]="v.vendedorId">{{ v.vendedora || ('#' + v.vendedorId) }}</option> }
          </select>
        </label>
        <aurum-button variante="wine" [desabilitado]="carregando" (click)="carregar()">Filtrar</aurum-button>
        @if (podeExportar) {
          <aurum-button variante="outline" [desabilitado]="exportando || !dados?.totalPedidos" (click)="exportar()">{{ exportando ? 'Exportando…' : 'Exportar (CSV)' }}</aurum-button>
        }
      </div>
      @if (erro) { <p class="pv__erro" role="alert">{{ erro }}</p> }
      @if (carregando) { <div class="wl-estado wl-estado--carregando">Carregando…</div> }
      @else if (dados) {
        <p class="pv__total"><b>{{ dados.totalPedidos }}</b> pedidos · <b>{{ moeda(dados.valorBrutoTotal) }}</b> bruto</p>
        @if (!dados.totalPedidos) { <div class="wl-estado wl-estado--vazio">Nenhum pedido da Prospecção no período.</div> }
        @else {
          <table aurumTable>
            <thead><tr aurumTableRow><th aurumTableHeaderCell>Vendedora</th><th aurumTableHeaderCell>Pedidos</th><th aurumTableHeaderCell>Valor bruto</th></tr></thead>
            <tbody>@for (g of dados.porVendedora; track g.vendedorId) {
              <tr aurumTableRow><td aurumTableCell>{{ g.vendedora || ('#' + g.vendedorId) }}</td><td aurumTableCell>{{ g.pedidos }}</td><td aurumTableCell>{{ moeda(g.valorBruto) }}</td></tr>
            }</tbody>
          </table>
          <table aurumTable class="pv__detalhe">
            <thead><tr aurumTableRow><th aurumTableHeaderCell>Vendedora</th><th aurumTableHeaderCell>Pedido</th><th aurumTableHeaderCell>Data</th><th aurumTableHeaderCell>Cliente</th><th aurumTableHeaderCell>CNPJ</th><th aurumTableHeaderCell>Campanha</th><th aurumTableHeaderCell>Período</th><th aurumTableHeaderCell>Bruto</th><th aurumTableHeaderCell>Líquido</th><th aurumTableHeaderCell>Status</th></tr></thead>
            <tbody>@for (p of dados.pedidos; track p.pedido) {
              <tr aurumTableRow><td aurumTableCell>{{ p.vendedora }}</td><td aurumTableCell>{{ p.pedido }}</td><td aurumTableCell>{{ p.dataPedido | date:'dd/MM/yyyy' }}</td><td aurumTableCell>{{ p.cliente }}</td><td aurumTableCell>{{ cnpj(p.cnpjCliente) }}</td><td aurumTableCell>{{ p.campanha }}</td><td aurumTableCell>{{ p.periodo }}</td><td aurumTableCell>{{ moeda(p.valorBruto) }}</td><td aurumTableCell>{{ moeda(p.valorLiquidoAnunciante) }}</td><td aurumTableCell>{{ p.status }}</td></tr>
            }</tbody>
          </table>
        }
      }
    </section>
  `,
  styles: [`
    .pv{margin-top:32px}.pv h2{margin:0;color:var(--primary-dark)}.pv__sub{margin:4px 0 14px;color:var(--on-surface)}
    .pv__filtros{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;margin-bottom:14px}
    .pv__filtros label{display:grid;gap:4px;font-size:.8rem;font-weight:600}
    .pv__filtros input,.pv__filtros select{border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;font:inherit}
    .pv__erro{color:var(--danger)}.pv__detalhe{margin-top:20px}.pv table{display:block;overflow-x:auto}
  `],
})
export class PedidosPorVendedoraComponent implements OnInit {
  private readonly service = inject(CarteiraReviewService);
  readonly podeExportar = inject(PermissionService).has('RelatorioExportar');

  de = isoDia(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  ate = isoDia(new Date());
  vendedorId: number | null = null;
  dados: PedidosPorVendedora | null = null;
  /** Vendedoras que já aparecem no relatório; a lista completa exige outra permissão. */
  opcoes: PedidosPorVendedora['porVendedora'] = [];
  carregando = false;
  exportando = false;
  erro = '';

  ngOnInit() { this.carregar(); }
  cnpj(v: string) { return formatarCnpj(v); }
  /** `toLocaleString` como no Dashboard: o app não registra o locale pt-BR do Angular. */
  moeda(v: number) { return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  private filtro() { return { de: this.de, ate: this.ate, vendedorId: this.vendedorId }; }

  carregar() {
    this.carregando = true; this.erro = '';
    this.service.pedidosPorVendedora(this.filtro()).subscribe({
      next: d => {
        this.dados = d; this.carregando = false;
        const conhecidas = new Map(this.opcoes.map(o => [o.vendedorId, o]));
        d.porVendedora.forEach(o => conhecidas.set(o.vendedorId, o));
        this.opcoes = [...conhecidas.values()];
      },
      error: e => { this.carregando = false; this.erro = mensagemDeErro(e, 'Não foi possível carregar o relatório.'); },
    });
  }

  exportar() {
    this.exportando = true; this.erro = '';
    this.service.exportarPedidosPorVendedora(this.filtro()).subscribe({
      next: blob => {
        this.exportando = false;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `pedidos-por-vendedora-${this.de}-${this.ate}.csv`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: e => { this.exportando = false; this.erro = mensagemDeErro(e, 'Não foi possível exportar.'); },
    });
  }
}
