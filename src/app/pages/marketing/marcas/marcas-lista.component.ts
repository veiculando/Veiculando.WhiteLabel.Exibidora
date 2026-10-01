import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BrandingService } from '../../../core/branding/branding.service';
import { mensagemDeErro } from '../../../core/http/api-error';
import { CmsMarca, CmsStatusFiltro } from '../../../core/models/cms.models';
import { CmsService, cmsIndisponivel } from '../../../core/services/cms.service';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumChipGroupComponent } from '../../../shared/aurum/aurum-chip-group.component';
import { AurumFilterBarComponent } from '../../../shared/aurum/aurum-filter-bar.component';
import { AurumModalComponent } from '../../../shared/aurum/aurum-modal.component';
import { AurumPageHeaderComponent } from '../../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../../shared/aurum/aurum-status-pill.component';
import { AurumTextInputComponent } from '../../../shared/aurum/aurum-text-input.component';
import { PaginadorComponent } from '../../../shared/paginador.component';
import { OPCOES_STATUS } from '../banners/banners-lista.component';

/**
 * Marcas Parceiras — VEI-RD-12, Figma `157:636`.
 *
 * Mesmo esqueleto de Banners (busca, chips e paginação no servidor; power com
 * confirmação). Dois desvios de copy do Figma, ambos restos de outras telas:
 * o subtítulo citava "Outdoor Premium" fixo (usa a marca da instância) e a
 * busca falava em "Anunciante, Razão Social, CNPJ" (a API busca só por nome).
 *
 * O logo fica em `object-fit: contain` sobre fundo papel: logomarca não pode
 * ser cortada, ao contrário da miniatura de banner.
 */
@Component({
  selector: 'app-marcas-lista',
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
  templateUrl: './marcas-lista.component.html',
  styleUrls: ['../marketing-lista.css'],
  styles: [
    `
      .mc-logo { display: flex; align-items: center; justify-content: center; height: 130px; padding: 16px; border: 1px dashed var(--secondary-color); border-radius: 12px; background: var(--paper-bg); color: var(--primary-color); }
      .mc-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .mc-logo .aurum-ico { width: 32px; height: 32px; }
      .mc-topo { padding-top: 8px; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MarcasListaComponent implements OnInit, OnDestroy {
  private readonly cms = inject(CmsService);
  private readonly router = inject(Router);
  private readonly branding = inject(BrandingService).branding;

  readonly opcoesStatus = OPCOES_STATUS;
  readonly pageSize = 12;

  readonly itens = signal<CmsMarca[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPaginas = signal(0);
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly indisponivel = signal(false);

  readonly busca = signal('');
  readonly status = signal<CmsStatusFiltro>('todos');

  readonly confirmando = signal<CmsMarca | null>(null);
  readonly alterando = signal(false);
  readonly erroStatus = signal('');

  /** Marca da instância no subtítulo — nunca o "Outdoor Premium" do Figma. */
  readonly subtitulo = computed(() => {
    const nome = this.branding()?.nomeExibicao;
    const sufixo = nome ? ` da ${nome}` : '';
    return `Logomarcas exibidas no carrossel de parceiros do site institucional${sufixo}.`;
  });

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
      .listar('marcas', { busca: this.busca(), status: this.status(), page, pageSize: this.pageSize })
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
          this.erro.set(mensagemDeErro(erro, 'Não foi possível carregar as marcas.'));
          this.carregando.set(false);
        },
      });
  }

  nova(): void {
    this.router.navigate(['/marketing/marcas/nova']);
  }

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

  pedirAlteracao(marca: CmsMarca): void {
    this.erroStatus.set('');
    this.confirmando.set(marca);
  }

  cancelarAlteracao(): void {
    if (this.alterando()) return;
    this.confirmando.set(null);
  }

  confirmarAlteracao(): void {
    const marca = this.confirmando();
    if (!marca) return;
    this.alterando.set(true);
    this.cms.alterarStatus('marcas', marca.id, !marca.ativo).subscribe({
      next: ({ item }) => {
        this.itens.update((itens) => itens.map((m) => (m.id === item.id ? item : m)));
        this.alterando.set(false);
        this.confirmando.set(null);
      },
      error: (erro) => {
        this.erroStatus.set(mensagemDeErro(erro, 'Não foi possível alterar o status da marca.'));
        this.alterando.set(false);
      },
    });
  }
}
