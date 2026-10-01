import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../../core/http/api-error';
import { CmsBanner, CmsStatusFiltro } from '../../../core/models/cms.models';
import { CmsService, cmsIndisponivel } from '../../../core/services/cms.service';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumChipGroupComponent, AurumChipOpcao } from '../../../shared/aurum/aurum-chip-group.component';
import { AurumFilterBarComponent } from '../../../shared/aurum/aurum-filter-bar.component';
import { AurumModalComponent } from '../../../shared/aurum/aurum-modal.component';
import { AurumPageHeaderComponent } from '../../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../../shared/aurum/aurum-status-pill.component';
import { AurumTextInputComponent } from '../../../shared/aurum/aurum-text-input.component';
import { PaginadorComponent } from '../../../shared/paginador.component';

/** Chips de status do Figma 157:2. */
export const OPCOES_STATUS: AurumChipOpcao<CmsStatusFiltro>[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativo', rotulo: 'Ativo' },
  { valor: 'inativo', rotulo: 'Inativo' },
];

/**
 * Gestão de Banners — VEI-RD-14, Figma `157:2`.
 *
 * Busca, status e paginação vão para o servidor (o BFF filtra no PostgREST);
 * nada é filtrado aqui. O subtítulo do Figma dizia "app WhiteLabel", mas os
 * banners aparecem no site institucional — a copy foi corrigida no card.
 *
 * Não há exclusão: o ícone power ativa/inativa pelo PATCH `/status`, sempre
 * depois de uma confirmação, porque ativar publica no site de produção.
 */
@Component({
  selector: 'app-banners-lista',
  imports: [
    RouterLink,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumFilterBarComponent,
    AurumTextInputComponent,
    AurumChipGroupComponent,
    AurumStatusPillComponent,
    AurumModalComponent,
    PaginadorComponent,
  ],
  templateUrl: './banners-lista.component.html',
  styleUrls: ['../marketing-lista.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class BannersListaComponent implements OnInit, OnDestroy {
  private readonly cms = inject(CmsService);
  private readonly router = inject(Router);

  readonly opcoesStatus = OPCOES_STATUS;
  readonly pageSize = 12;

  readonly itens = signal<CmsBanner[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPaginas = signal(0);
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly indisponivel = signal(false);

  readonly busca = signal('');
  readonly status = signal<CmsStatusFiltro>('todos');

  /** Banner aguardando confirmação do power. */
  readonly confirmando = signal<CmsBanner | null>(null);
  readonly alterando = signal(false);
  readonly erroStatus = signal('');

  private buscaTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    clearTimeout(this.buscaTimer);
  }

  carregar(page = this.page()): void {
    this.carregando.set(true);
    this.erro.set('');
    this.indisponivel.set(false);
    this.cms
      .listar('banners', { busca: this.busca(), status: this.status(), page, pageSize: this.pageSize })
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
          this.erro.set(mensagemDeErro(erro, 'Não foi possível carregar os banners.'));
          this.carregando.set(false);
        },
      });
  }

  novo(): void {
    this.router.navigate(['/marketing/banners/novo']);
  }

  /** Busca ao digitar, com espera curta — o Figma não tem botão "Aplicar". */
  buscar(termo: string): void {
    this.busca.set(termo);
    clearTimeout(this.buscaTimer);
    this.buscaTimer = setTimeout(() => this.carregar(1), 300);
  }

  selecionarStatus(status: CmsStatusFiltro): void {
    this.status.set(status);
    this.carregar(1);
  }

  irParaPagina(page: number): void {
    this.carregar(page);
  }

  rotuloTipo(banner: CmsBanner): string {
    return banner.tipoDestino === 'html' ? 'Arquivo HTML' : 'Link Externo';
  }

  /** "URL: …" para link; "Arquivo: …" com o nome do arquivo no bucket para html. */
  linhaDestino(banner: CmsBanner): string {
    if (banner.tipoDestino === 'html') {
      return `Arquivo: ${banner.htmlPath != null ? banner.htmlPath.split('/').pop() : '—'}`;
    }
    return `URL: ${banner.destino != null ? banner.destino.replace(/^https:\/\//i, '') : '—'}`;
  }

  pedirAlteracao(banner: CmsBanner): void {
    this.erroStatus.set('');
    this.confirmando.set(banner);
  }

  cancelarAlteracao(): void {
    if (this.alterando()) return;
    this.confirmando.set(null);
  }

  confirmarAlteracao(): void {
    const banner = this.confirmando();
    if (!banner) return;
    this.alterando.set(true);
    this.cms.alterarStatus('banners', banner.id, !banner.ativo).subscribe({
      next: ({ item }) => {
        this.itens.update((itens) => itens.map((b) => (b.id === item.id ? item : b)));
        this.alterando.set(false);
        this.confirmando.set(null);
      },
      error: (erro) => {
        this.erroStatus.set(mensagemDeErro(erro, 'Não foi possível alterar o status do banner.'));
        this.alterando.set(false);
      },
    });
  }
}
