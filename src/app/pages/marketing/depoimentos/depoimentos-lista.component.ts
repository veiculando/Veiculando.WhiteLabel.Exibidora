import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BrandingService } from '../../../core/branding/branding.service';
import { mensagemDeErro } from '../../../core/http/api-error';
import { CmsDepoimento, CmsDepoimentosResumo, CmsStatusFiltro } from '../../../core/models/cms.models';
import { CmsService, cmsIndisponivel } from '../../../core/services/cms.service';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumFilterBarComponent } from '../../../shared/aurum/aurum-filter-bar.component';
import { AurumModalComponent } from '../../../shared/aurum/aurum-modal.component';
import { AurumPageHeaderComponent } from '../../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../../shared/aurum/aurum-table.component';
import { AurumTextInputComponent } from '../../../shared/aurum/aurum-text-input.component';
import { PaginadorComponent } from '../../../shared/paginador.component';

interface Kpi {
  chave: keyof CmsDepoimentosResumo;
  rotulo: string;
  /** Mesmos ícones e cores dos contadores da tela KYC — é o desenho do Figma. */
  icone: string;
}

const KPIS: Kpi[] = [
  { chave: 'total', rotulo: 'Total de depoimentos', icone: 'pendente' },
  { chave: 'publicados', rotulo: 'Publicados', icone: 'analise' },
  { chave: 'ocultos', rotulo: 'Ocultos', icone: 'ajustes' },
  { chave: 'novosNoMes', rotulo: 'Novos este mês', icone: 'aprovado' },
  { chave: 'empresas', rotulo: 'Empresas representadas', icone: 'rejeitado' },
];

/** Tamanho do trecho do relato na tabela; o texto inteiro fica no "ver". */
const TRECHO = 60;

/** Iniciais do avatar sem foto: primeira letra do primeiro e do último nome. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/** "Cargo · Empresa", como a linha de assinatura do card na LP. */
export function assinatura(depoimento: Pick<CmsDepoimento, 'role' | 'company'>): string {
  return [depoimento.role, depoimento.company].filter((parte) => parte != null && parte.trim() !== '').join(' · ');
}

/**
 * Depoimentos — VEI-RD-8, Figma `157:1270`. Decisão do owner (30/09/2026):
 * seguir o Figma (KPIs, Empresa separada de Cargo, filtros e ordem), e os três
 * ícones ambíguos viram ver, editar e publicar/ocultar.
 *
 * Os KPIs vêm de `GET depoimentos/resumo`, numa chamada separada da lista:
 * se o resumo cair (503), os cartões dizem "indisponível" e a tabela segue.
 *
 * Desvios de copy/forma do Figma: a busca dizia "CNPJ, razão social ou
 * responsável" (resto da tela de KYC); o filtro de empresa é texto livre,
 * porque o contrato não tem uma lista de empresas para popular um select.
 */
@Component({
  selector: 'app-depoimentos-lista',
  imports: [
    DatePipe,
    RouterLink,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumFilterBarComponent,
    AurumTextInputComponent,
    AurumStatusPillComponent,
    AurumModalComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
    PaginadorComponent,
  ],
  templateUrl: './depoimentos-lista.component.html',
  styleUrls: ['../marketing-lista.css', './depoimentos.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class DepoimentosListaComponent implements OnInit, OnDestroy {
  private readonly cms = inject(CmsService);
  private readonly router = inject(Router);
  private readonly branding = inject(BrandingService).branding;

  readonly kpis = KPIS;
  readonly pageSize = 10;
  readonly iniciais = iniciais;
  readonly assinatura = assinatura;

  readonly itens = signal<CmsDepoimento[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPaginas = signal(0);
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly indisponivel = signal(false);

  readonly resumo = signal<CmsDepoimentosResumo | null>(null);
  readonly resumoIndisponivel = signal(false);

  readonly busca = signal('');
  readonly status = signal<CmsStatusFiltro>('todos');
  readonly empresa = signal('');
  /** `yyyy-MM-dd`, direto do `<input type="date">` — o mesmo formato do `desde` do BFF. */
  readonly desde = signal('');

  readonly vendo = signal<CmsDepoimento | null>(null);
  readonly confirmando = signal<CmsDepoimento | null>(null);
  readonly alterando = signal(false);
  readonly erroStatus = signal('');

  readonly subtitulo = computed(() => {
    const nome = this.branding()?.nomeExibicao;
    return `Depoimentos de clientes e parceiros exibidos como prova social no site institucional${nome ? ` da ${nome}` : ''}.`;
  });

  private filtroTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregar();
    this.carregarResumo();
  }

  ngOnDestroy(): void {
    clearTimeout(this.filtroTimer);
  }

  carregar(page = this.page()): void {
    this.carregando.set(true);
    this.erro.set('');
    this.indisponivel.set(false);
    this.cms
      .listar('depoimentos', {
        busca: this.busca(),
        status: this.status(),
        empresa: this.empresa(),
        desde: this.desde() || undefined,
        page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (pagina) => {
          this.itens.set(pagina.itens);
          this.total.set(pagina.total);
          this.page.set(pagina.page);
          this.totalPaginas.set(pagina.totalPaginas);
          this.carregando.set(false);
        },
        error: (erro) => {
          this.itens.set([]);
          this.indisponivel.set(cmsIndisponivel(erro));
          this.erro.set(mensagemDeErro(erro, 'Não foi possível carregar os depoimentos.'));
          this.carregando.set(false);
        },
      });
  }

  carregarResumo(): void {
    this.cms.resumoDepoimentos().subscribe({
      next: (resumo) => {
        this.resumo.set(resumo);
        this.resumoIndisponivel.set(false);
      },
      error: () => {
        this.resumo.set(null);
        this.resumoIndisponivel.set(true);
      },
    });
  }

  valorKpi(kpi: Kpi): string {
    const resumo = this.resumo();
    return resumo != null ? String(resumo[kpi.chave]) : '—';
  }

  novo(): void {
    this.router.navigate(['/marketing/depoimentos/novo']);
  }

  /** Texto (busca e empresa) espera o operador parar de digitar. */
  digitar(campo: 'busca' | 'empresa', valor: string): void {
    this[campo].set(valor);
    clearTimeout(this.filtroTimer);
    this.filtroTimer = setTimeout(() => this.carregar(1), 300);
  }

  selecionarStatus(status: CmsStatusFiltro): void {
    this.status.set(status);
    this.carregar(1);
  }

  selecionarDesde(data: string): void {
    this.desde.set(data);
    this.carregar(1);
  }

  irParaPagina(page: number): void {
    this.carregar(page);
  }

  trecho(conteudo: string): string {
    const limpo = conteudo.trim();
    return limpo.length > TRECHO ? `${limpo.slice(0, TRECHO).trimEnd()}…` : limpo;
  }

  ver(depoimento: CmsDepoimento): void {
    this.vendo.set(depoimento);
  }

  pedirAlteracao(depoimento: CmsDepoimento): void {
    this.erroStatus.set('');
    this.confirmando.set(depoimento);
  }

  cancelarAlteracao(): void {
    if (this.alterando()) return;
    this.confirmando.set(null);
  }

  confirmarAlteracao(): void {
    const depoimento = this.confirmando();
    if (!depoimento) return;
    this.alterando.set(true);
    this.cms.alterarStatus('depoimentos', depoimento.id, !depoimento.ativo).subscribe({
      next: ({ item }) => {
        this.itens.update((itens) => itens.map((d) => (d.id === item.id ? item : d)));
        this.alterando.set(false);
        this.confirmando.set(null);
        // Publicados/Ocultos mudaram: os KPIs acompanham.
        this.carregarResumo();
      },
      error: (erro) => {
        this.erroStatus.set(mensagemDeErro(erro, 'Não foi possível alterar o status do depoimento.'));
        this.alterando.set(false);
      },
    });
  }
}
