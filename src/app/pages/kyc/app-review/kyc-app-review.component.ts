import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppKycDetail, AppKycQueueItem, KycAppReviewService } from '../../../core/services/kyc-app-review.service';

const statuses = ['Rascunho', 'Pendente', 'Em análise', 'Ajustes solicitados', 'Aprovado', 'Rejeitado', 'Suspenso'];

@Component({
  selector: 'app-kyc-app-review',
  imports: [DatePipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <header class="review-head"><div><h1>Cadastros do App</h1><p>Confira os dados e documentos antes de liberar a compra.</p></div><a routerLink="/kyc">Análises tradicionais</a></header>
    @if(error){<p class="feedback error" role="alert">{{error}}</p>}
    @if(notice){<p class="feedback" role="status">{{notice}}</p>}
    <div class="review-layout">
      <section class="review-queue" aria-label="Cadastros aguardando análise">
        <div class="queue-head"><h2>Solicitações</h2><button type="button" (click)="load()" [disabled]="loading">Atualizar</button></div>
        <label for="review-search">Buscar por CNPJ ou ID</label><input id="review-search" [(ngModel)]="search" placeholder="CNPJ ou identificação" />
        @if(loading){<p role="status">Carregando solicitações…</p>}
        @else if(!filtered().length){<p>Nenhum cadastro corresponde à busca.</p>}
        @for(item of filtered();track item.id){
          <button class="queue-item" type="button" [class.selected]="detail?.id===item.id" (click)="select(item)">
            <span class="queue-item__top"><strong>{{item.tipoConta==='ag'?'Agência':'Anunciante direto'}}</strong><span class="status" [class.ready]="item.status===4">{{status(item.status)}}</span></span>
            <span>{{item.documento}}</span><small>Atualizado {{item.atualizadoEm | date:'dd/MM/yyyy HH:mm'}}</small>
          </button>
        }
      </section>
      <section class="review-detail" aria-label="Detalhes da solicitação">
        @if(detailLoading){<p role="status">Carregando cadastro…</p>}
        @else if(detail){
          <header><div><span class="status" [class.ready]="detail.status===4">{{status(detail.status)}}</span><h2>{{field('TradeName') || 'Organização sem nome'}}</h2><p>{{field('LegalName')}} · {{detail.documento}}</p></div><small>{{detail.tipoConta==='ag'?'Agência':'Anunciante direto'}}</small></header>
          @if(detail.motivo && (detail.status===3 || detail.status===5 || detail.status===6)){<p class="feedback">Último motivo: {{detail.motivo}}</p>}
          <div class="facts"><div><h3>Organização</h3><p>{{field('Street')}}, {{field('Number')}} — {{field('District')}}</p><p>{{field('City')}} / {{field('State')}} · CEP {{field('ZipCode')}}</p><p>{{field('Phone')}} · {{field('Email')}}</p></div><div><h3>Responsável legal</h3><p>{{field('RepresentativeName')}}</p><p>CPF {{field('RepresentativeCpf')}}</p><p>{{field('RepresentativeEmail')}} · {{field('RepresentativePhone')}}</p></div></div>
          <h3>Documentos</h3><div class="documents">@for(doc of detail.documents;track doc.id){<button type="button" (click)="download(doc)" [disabled]="busy">{{documentLabel(doc.tipo)}} — {{doc.nome}}</button>}@if(!detail.documents.length){<p>Nenhum documento enviado.</p>}</div>
          <h3>Histórico da análise</h3><ol class="history">@for(event of detail.history;track event.em){<li><strong>{{status(event.para)}}</strong> · {{event.em | date:'dd/MM/yyyy HH:mm'}} @if(event.motivo){<span>{{event.motivo}}</span>}</li>}</ol>
          @if(detail.status===2 || detail.status===4){<label for="review-reason">Motivo para ajustes, rejeição ou suspensão</label><textarea id="review-reason" [(ngModel)]="reason" rows="3" placeholder="Descreva o que precisa ser corrigido ou a razão da decisão"></textarea>}
          <div class="actions">
            @if(detail.status===1 || detail.status===6){<button type="button" (click)="decide('review')" [disabled]="busy">Assumir análise</button>}
            @if(detail.status===2){<button class="primary" type="button" (click)="decide('approve')" [disabled]="busy || !requiredDocuments()">Aprovar cadastro</button><button type="button" (click)="decide('adjustments')" [disabled]="busy || !reason.trim()">Solicitar ajustes</button><button type="button" (click)="decide('reject')" [disabled]="busy || !reason.trim()">Rejeitar</button>}
            @if(detail.status===4){<button type="button" (click)="decide('suspend')" [disabled]="busy || !reason.trim()">Suspender acesso</button>}
          </div>
          @if(detail.status===2 && !requiredDocuments()){<p class="hint">Para aprovar, são necessários contrato social e identificação do responsável.</p>}
        } @else {<div class="empty"><h2>Selecione um cadastro</h2><p>Os dados empresariais, documentos e decisões aparecem aqui.</p></div>}
      </section>
    </div>
  `,
  styles: [`
    :host{display:block;color:var(--charcoal)}.review-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:20px}.review-head h1{margin:0;color:var(--primary-dark);font-size:1.7rem}.review-head p{margin:6px 0 0;color:var(--on-surface)}.review-head a{color:var(--primary-color);font-weight:700}.review-layout{display:grid;grid-template-columns:minmax(250px,340px) minmax(0,1fr);gap:20px;align-items:start}.review-queue,.review-detail{background:var(--white);border:1px solid var(--line-subtle);border-radius:18px;padding:20px}.queue-head{display:flex;justify-content:space-between;align-items:center}.queue-head h2,.review-detail h2{margin:0}.queue-head button,.actions button,.documents button{border:1px solid var(--line-search);border-radius:9px;background:var(--white);padding:9px 12px;color:var(--primary-color);font:inherit;font-weight:700;cursor:pointer}.review-queue label,.review-detail label{display:block;margin:16px 0 6px;font-weight:700;font-size:.8rem}.review-queue input,.review-detail textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--line-search);border-radius:9px;font:inherit}.queue-item{display:grid;gap:6px;width:100%;margin-top:8px;padding:14px;border:1px solid var(--line-subtle);border-radius:11px;background:var(--white);text-align:left;font:inherit;cursor:pointer}.queue-item.selected{border-color:var(--primary-color);background:var(--wine-tint)}.queue-item__top{display:flex;justify-content:space-between;gap:8px}.queue-item small{color:var(--on-surface)}.status{display:inline-block;padding:3px 8px;border-radius:99px;background:var(--gold-tint);color:var(--primary-dark);font-size:.72rem;font-weight:700}.status.ready{background:var(--success-bg);color:var(--success)}.review-detail header{display:flex;justify-content:space-between;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--line-subtle)}.review-detail header h2{margin:10px 0 2px}.review-detail header p{margin:0;color:var(--on-surface)}.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:18px 0}.facts h3,.review-detail>h3{margin:18px 0 8px;font-size:1rem}.facts p{margin:5px 0;overflow-wrap:anywhere}.documents{display:flex;flex-wrap:wrap;gap:8px}.history{padding-left:22px}.history li{margin:7px 0}.history span{display:block;color:var(--on-surface)}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.actions .primary{background:var(--primary-color);color:var(--white)}button:disabled{opacity:.5;cursor:not-allowed}.feedback{padding:11px 14px;border:1px solid var(--warning-border);border-radius:9px;background:var(--warning-bg)}.feedback.error{color:var(--danger)}.hint,.empty p{color:var(--on-surface)}.empty{padding:54px 10px;text-align:center}:focus-visible{outline:3px solid var(--secondary-color);outline-offset:2px}@media(max-width:900px){.review-layout{grid-template-columns:1fr}.facts{grid-template-columns:1fr}.review-head{align-items:start;flex-direction:column}}
  `],
})
export class KycAppReviewComponent implements OnInit {
  private readonly service = inject(KycAppReviewService);
  queue: AppKycQueueItem[] = [];
  detail: AppKycDetail | null = null;
  search = '';
  reason = '';
  error = '';
  notice = '';
  loading = false;
  detailLoading = false;
  busy = false;

  ngOnInit() { this.load(); }
  status(value: number) { return statuses[value] ?? 'Desconhecido'; }
  filtered() { const term = this.search.trim().toLowerCase(); return this.queue.filter(item => !term || item.documento?.includes(term) || item.id.toLowerCase().includes(term)); }
  field(key: string) { return this.detail?.business?.[key[0].toLowerCase() + key.slice(1)] ?? this.detail?.business?.[key] ?? ''; }
  documentLabel(type: string) { return ({ corporate: 'Contrato social', representative: 'Identificação', address: 'Comprovante de endereço' } as Record<string,string>)[type] ?? type; }
  requiredDocuments() { return ['corporate','representative'].every(type => this.detail?.documents.some(doc => doc.tipo === type)); }
  load() {
    this.loading = true; this.error = '';
    this.service.queue().subscribe({next: items => { this.queue = items; this.loading = false; }, error: () => { this.loading = false; this.error = 'Não foi possível carregar a fila. Tente novamente.'; }});
  }
  select(item: AppKycQueueItem) {
    this.detailLoading = true; this.error = ''; this.reason = '';
    this.service.detail(item.id).subscribe({next: detail => { this.detail = detail; this.detailLoading = false; }, error: () => { this.detailLoading = false; this.error = 'Não foi possível abrir o cadastro.'; }});
  }
  download(doc: AppKycDetail['documents'][number]) {
    if (!this.detail) return;
    this.service.document(this.detail.id, doc.id).subscribe({next: blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = doc.nome; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, error: () => this.error = 'Não foi possível baixar o documento.'});
  }
  decide(action: 'review' | 'approve' | 'adjustments' | 'reject' | 'suspend') {
    if (!this.detail || this.busy) return;
    const id = this.detail.id;
    this.busy = true; this.error = ''; this.notice = '';
    this.service.decide(id, action, this.reason.trim()).subscribe({next: () => {
      this.busy = false; this.notice = 'Decisão registrada.'; this.load(); this.select({ id } as AppKycQueueItem);
    }, error: () => { this.busy = false; this.error = 'Não foi possível registrar a decisão. Confira o estado do cadastro e tente novamente.'; }});
  }
}
