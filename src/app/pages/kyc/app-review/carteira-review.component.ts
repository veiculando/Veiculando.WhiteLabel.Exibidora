import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionService } from '../../../core/auth/permission.service';
import {
  CarteiraDetalhe, CarteiraFilaItem, CarteiraReviewService, CarteiraStatus,
} from '../../../core/services/carteira-review.service';

export const statusCarteira: Record<string, string> = {
  Rascunho: 'Rascunho', PendenteAnalise: 'Em análise', AjustesSolicitados: 'Ajustes pedidos', Aprovado: 'Aprovado', Reprovado: 'Reprovado',
};

const eventos: Record<string, string> = {
  Enviado: 'Enviado pela vendedora', AjustesSolicitados: 'Ajustes pedidos', Reenviado: 'Reenviado pela vendedora',
  Aprovado: 'Aprovado', Reprovado: 'Reprovado', ResponsavelTrocado: 'Responsável trocado', ResponsavelRemovido: 'Removido da carteira',
  Reaberto: 'Cadastro retomado', Criado: 'Criado',
};

export function formatarCnpj(digitos: string | null | undefined): string {
  const d = (digitos ?? '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d;
}

/**
 * Clientes das vendedoras na tela "Cadastros do App" (VEI-RD-157d).
 *
 * O gestor (ClienteGerenciar) aprova, pede ajustes ou reprova. O BFF recusa (403) quando quem
 * analisa é quem enviou. Com UsuarioAfiliadaGerenciar, ele também troca a vendedora responsável
 * ou tira o cliente da carteira; os pedidos já feitos continuam com quem vendeu.
 */
@Component({
  selector: 'app-carteira-review',
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    @if(error){<p class="feedback error" role="alert">{{error}}</p>}
    @if(notice){<p class="feedback" role="status">{{notice}}</p>}
    <div class="review-layout">
      <section class="review-queue" aria-label="Clientes das vendedoras">
        <div class="queue-head"><h2>Clientes das vendedoras</h2><button type="button" (click)="load()" [disabled]="loading">Atualizar</button></div>
        <label for="carteira-status">Situação</label>
        <select id="carteira-status" [(ngModel)]="filtro" (ngModelChange)="load()">
          @for(s of filtros;track s){<option [value]="s">{{rotulo(s)}}</option>}
        </select>
        <label for="carteira-busca">Buscar por CNPJ, cliente ou vendedora</label><input id="carteira-busca" [(ngModel)]="search" />
        @if(loading){<p role="status">Carregando…</p>}
        @else if(!filtered().length){<p>Nenhum cliente nesta situação.</p>}
        @for(item of filtered();track item.id){
          <button class="queue-item" type="button" [class.selected]="detail?.id===item.id" (click)="select(item.id)">
            <span class="queue-item__top"><strong>{{item.nome || item.razaoSocial}}</strong><span class="status" [class.ready]="item.status==='Aprovado'">{{rotulo(item.status)}}</span></span>
            <span>{{cnpj(item.cnpj)}} · {{item.origem==='Solicitacao'?'Solicitação de carteira':'Cadastro pela vendedora'}}</span>
            <small>Vendedora: {{item.vendedora || 'sem vendedora'}} · {{item.atualizadoEm | date:'dd/MM/yyyy HH:mm'}}</small>
          </button>
        }
      </section>
      <section class="review-detail" aria-label="Detalhes do cliente">
        @if(detailLoading){<p role="status">Carregando cliente…</p>}
        @else if(detail){
          <header><div><span class="status" [class.ready]="detail.status==='Aprovado'">{{rotulo(detail.status)}}</span><h2>{{detail.cliente.nome || detail.cliente.razaoSocial}}</h2><p>{{detail.cliente.razaoSocial}} · {{cnpj(detail.cliente.cnpj)}} · {{detail.cliente.cidade}}/{{detail.cliente.uf}}</p></div>
            <small>{{detail.origem==='Solicitacao'?'Solicitação de carteira':'Cadastro pela vendedora'}}</small></header>
          <div class="facts"><div><h3>Vendedora responsável</h3><p>{{detail.vendedora || 'Sem vendedora'}}</p></div><div><h3>Enviado por</h3><p>{{detail.solicitante || '—'}}</p></div></div>
          @if(detail.motivo){<p class="feedback">Último motivo: {{detail.motivo}}</p>}
          <h3>Documentos</h3><div class="documents">@for(doc of detail.documentos;track doc.id){<button type="button" (click)="download(doc)" [disabled]="busy">{{documentLabel(doc.tipo)}} — {{doc.nome}}</button>}@if(!detail.documentos.length){<p>Sem documentos (cliente com KYC já aprovado na exibidora).</p>}</div>
          <h3>Histórico</h3><ol class="history">@for(e of detail.historico;track $index){<li><strong>{{evento(e.evento)}}</strong> · {{e.em | date:'dd/MM/yyyy HH:mm'}} · {{e.usuario || '—'}}
            @if(e.vendedoraDe || e.vendedoraPara){<span>{{e.vendedoraDe || 'sem vendedora'}} → {{e.vendedoraPara || 'sem vendedora'}}</span>}
            @if(e.motivo){<span>{{e.motivo}}</span>}</li>}</ol>
          @if(detail.status==='PendenteAnalise' || detail.status==='AjustesSolicitados'){
            <label for="carteira-motivo">{{detail.status==='PendenteAnalise' ? 'Motivo para ajustes ou reprovação' : 'Motivo da reprovação'}}</label><textarea id="carteira-motivo" [(ngModel)]="reason" rows="3"></textarea>
            <div class="actions">
              @if(detail.status==='PendenteAnalise'){
                <button class="primary" type="button" (click)="aprovar()" [disabled]="busy">Aprovar cliente</button>
                <button type="button" (click)="decidir('ajustes')" [disabled]="busy || !reason.trim()">Pedir ajustes</button>
              }
              <button type="button" (click)="decidir('reprovar')" [disabled]="busy || !reason.trim()">Reprovar</button>
            </div>
            @if(detail.status==='PendenteAnalise'){<p class="hint">Aprovar cria o contrato de venda direta com comissão de agência zero. Quem enviou o cadastro não pode aprovar.</p>}
            @else{<p class="hint">Aguardando a vendedora reenviar. Reprove se ela não for corrigir.</p>}
          }
          @if(podeTrocar && (detail.status==='Aprovado' || detail.vendedorId)){
            <h3>{{detail.status==='Aprovado' ? 'Trocar responsável' : 'Tirar da carteira'}}</h3>
            <div class="troca">
              @if(detail.status==='Aprovado'){
                <label for="carteira-vendedora">Nova vendedora</label>
                <select id="carteira-vendedora" [(ngModel)]="novaVendedora">
                  <option [ngValue]="null">Selecione</option>
                  @for(v of vendedoras;track v.id){@if(v.id!==detail.vendedorId){<option [ngValue]="v.id">{{v.nome ? v.nome + ' (' + v.email + ')' : v.email}}</option>}}
                </select>
              }
              <label for="carteira-motivo-troca">Motivo</label><input id="carteira-motivo-troca" [(ngModel)]="motivoTroca" />
              <div class="actions">
                @if(detail.status==='Aprovado'){<button type="button" (click)="trocar()" [disabled]="busy || !novaVendedora || !motivoTroca.trim()">Trocar responsável</button>}
                @if(detail.vendedorId){<button type="button" (click)="remover()" [disabled]="busy || !motivoTroca.trim()">Tirar da carteira</button>}
              </div>
              <p class="hint">{{detail.status==='Aprovado' ? 'Pedidos já feitos continuam com a vendedora que vendeu.' : 'Só cliente aprovado troca de vendedora. Tirar da carteira libera o CNPJ para outra vendedora.'}}</p>
            </div>
          }
        } @else {<div class="empty"><h2>Selecione um cliente</h2><p>Dados, documentos e decisões aparecem aqui.</p></div>}
      </section>
    </div>
  `,
  styles: [`
    :host{display:block}.review-layout{display:grid;grid-template-columns:minmax(250px,340px) minmax(0,1fr);gap:20px;align-items:start}.review-queue,.review-detail{background:var(--white);border:1px solid var(--line-subtle);border-radius:18px;padding:20px}.queue-head{display:flex;justify-content:space-between;align-items:center}.queue-head h2,.review-detail h2{margin:0}.queue-head button,.actions button,.documents button{border:1px solid var(--line-search);border-radius:9px;background:var(--white);padding:9px 12px;color:var(--primary-color);font:inherit;font-weight:700;cursor:pointer}label{display:block;margin:16px 0 6px;font-weight:700;font-size:.8rem}input,select,textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--line-search);border-radius:9px;font:inherit;background:var(--white)}.queue-item{display:grid;gap:6px;width:100%;margin-top:8px;padding:14px;border:1px solid var(--line-subtle);border-radius:11px;background:var(--white);text-align:left;font:inherit;cursor:pointer}.queue-item.selected{border-color:var(--primary-color);background:var(--wine-tint)}.queue-item__top{display:flex;justify-content:space-between;gap:8px}.queue-item small{color:var(--on-surface)}.status{display:inline-block;padding:3px 8px;border-radius:99px;background:var(--gold-tint);color:var(--primary-dark);font-size:.72rem;font-weight:700}.status.ready{background:var(--success-bg);color:var(--success)}.review-detail header{display:flex;justify-content:space-between;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--line-subtle)}.review-detail header h2{margin:10px 0 2px}.review-detail header p{margin:0;color:var(--on-surface)}.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:18px 0}.facts h3,.review-detail h3{margin:18px 0 8px;font-size:1rem}.facts p{margin:5px 0;overflow-wrap:anywhere}.documents{display:flex;flex-wrap:wrap;gap:8px}.history{padding-left:22px}.history li{margin:7px 0}.history span{display:block;color:var(--on-surface)}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.actions .primary{background:var(--primary-color);color:var(--white)}button:disabled{opacity:.5;cursor:not-allowed}.feedback{padding:11px 14px;border:1px solid var(--warning-border);border-radius:9px;background:var(--warning-bg)}.feedback.error{color:var(--danger)}.hint,.empty p{color:var(--on-surface)}.empty{padding:54px 10px;text-align:center}.troca{padding-top:4px}@media(max-width:900px){.review-layout,.facts{grid-template-columns:1fr}}
  `],
})
export class CarteiraReviewComponent implements OnInit {
  private readonly service = inject(CarteiraReviewService);
  readonly podeTrocar = inject(PermissionService).has('UsuarioAfiliadaGerenciar');
  readonly filtros: CarteiraStatus[] = ['PendenteAnalise', 'AjustesSolicitados', 'Aprovado', 'Reprovado'];

  filtro: CarteiraStatus = 'PendenteAnalise';
  fila: CarteiraFilaItem[] = [];
  detail: CarteiraDetalhe | null = null;
  vendedoras: Array<{ id: number; nome?: string | null; email: string }> = [];
  search = '';
  reason = '';
  novaVendedora: number | null = null;
  motivoTroca = '';
  error = '';
  notice = '';
  loading = false;
  detailLoading = false;
  busy = false;

  ngOnInit() {
    this.load();
    if (this.podeTrocar) this.service.vendedoras().subscribe({ next: v => this.vendedoras = v, error: () => undefined });
  }

  rotulo(status: string) { return statusCarteira[status] ?? status; }
  evento(nome: string) { return eventos[nome] ?? nome; }
  cnpj(valor: string | null) { return formatarCnpj(valor); }
  documentLabel(type: string) { return ({ corporate: 'Contrato social', representative: 'Documento do responsável' } as Record<string, string>)[type] ?? type; }
  filtered() {
    const term = this.search.trim().toLowerCase();
    const digitos = term.replace(/\D/g, '');
    return this.fila.filter(i => !term || (digitos && i.cnpj?.includes(digitos)) ||
      [i.nome, i.razaoSocial, i.vendedora].some(t => t?.toLowerCase().includes(term)));
  }

  load() {
    this.loading = true; this.error = '';
    this.service.fila(this.filtro).subscribe({
      next: itens => { this.fila = itens; this.loading = false; },
      error: () => { this.loading = false; this.error = 'Não foi possível carregar os clientes das vendedoras.'; },
    });
  }

  select(id: string) {
    this.detailLoading = true; this.error = ''; this.reason = ''; this.motivoTroca = ''; this.novaVendedora = null;
    this.service.detalhe(id).subscribe({
      next: d => { this.detail = d; this.detailLoading = false; },
      error: () => { this.detailLoading = false; this.error = 'Não foi possível abrir o cliente.'; },
    });
  }

  download(doc: CarteiraDetalhe['documentos'][number]) {
    if (!this.detail) return;
    this.service.documento(this.detail.id, doc.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = doc.nome; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.error = 'Não foi possível baixar o documento.',
    });
  }

  aprovar() { this.executar(id => this.service.aprovar(id), 'Cliente aprovado. Ele já aparece para a vendedora no App.'); }
  decidir(acao: 'ajustes' | 'reprovar') {
    if (!this.reason.trim()) { this.error = 'Informe o motivo da decisão.'; return; }
    this.executar(id => this.service.decidir(id, acao, this.reason.trim()), 'Decisão registrada.');
  }
  trocar() {
    const para = this.novaVendedora;
    if (!para || !this.motivoTroca.trim()) return;
    this.executar(id => this.service.trocarResponsavel(id, para, this.motivoTroca.trim()), 'Responsável alterado.');
  }
  remover() {
    if (!this.motivoTroca.trim()) return;
    this.executar(id => this.service.removerResponsavel(id, this.motivoTroca.trim()), 'Cliente tirado da carteira.');
  }

  private executar(acao: (id: string) => import('rxjs').Observable<unknown>, sucesso: string) {
    if (!this.detail || this.busy) return;
    const id = this.detail.id;
    this.busy = true; this.error = ''; this.notice = '';
    acao(id).subscribe({
      next: () => { this.busy = false; this.notice = sucesso; this.load(); this.select(id); },
      error: r => { this.busy = false; this.error = r?.error?.message ?? 'Não foi possível concluir. Confira a situação do cliente e tente novamente.'; },
    });
  }
}
