import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BrandingService } from '../../../core/branding/branding.service';
import { mensagemDeErro } from '../../../core/http/api-error';
import { CmsBanner, CmsTipoDestino } from '../../../core/models/cms.models';
import { CmsService } from '../../../core/services/cms.service';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumDropzoneComponent } from '../../../shared/aurum/aurum-dropzone.component';

const MB = 1024 * 1024;

/** `https://…` (com host) ou âncora `#secao` — as duas formas que o BFF aceita. */
export const DESTINO_VALIDO = /^(https:\/\/[^\s/]+\S*|#\S+)$/i;

export const TOAST_SALVO = 'Salvo. O site é atualizado em até 5 minutos.';

/**
 * Novo/editar banner — VEI-RD-14, Figma `173:2`.
 *
 * Desvios do Figma, registrados no card:
 * - **Ordem de exibição** é um campo: o Figma mostra a ordem na lista mas não
 *   diz onde editá-la. Em branco no novo = fim da fila (o BFF usa `max + 1`).
 * - **Status nasce Inativo** no novo: o preview escreve no Supabase de
 *   produção (ADR-CMS-004). Mudar o default exige decisão do owner.
 * - Formatos: o Figma diz "PNG ou JPG"; o BFF aceita também WebP.
 *
 * Link ↔ HTML limpa o campo que deixou de valer, para nunca mandar ao BFF uma
 * URL junto de um hotsite. Depois de salvar, a tela fica no formulário para
 * mostrar os `avisos` do BFF (URLs relativas no HTML) e o link do hotsite.
 */
@Component({
  selector: 'app-banners-form',
  imports: [AurumButtonComponent, AurumDropzoneComponent],
  templateUrl: './banners-form.component.html',
  styleUrls: ['../marketing-form.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class BannersFormComponent implements OnInit, OnDestroy {
  private readonly cms = inject(CmsService);
  private readonly router = inject(Router);
  private readonly branding = inject(BrandingService).branding;

  /** `:id` da rota (withComponentInputBinding); ausente em `/novo`. */
  @Input() id?: string;

  readonly limiteImagem = 5 * MB;
  readonly limiteHtml = 2 * MB;

  readonly existente = signal<CmsBanner | null>(null);
  readonly carregando = signal(false);
  readonly erroCarga = signal('');

  readonly titulo = signal('');
  readonly tipo = signal<CmsTipoDestino>('link');
  readonly destino = signal('');
  readonly ordem = signal<number | null>(null);
  readonly ativo = signal(false);
  readonly imagem = signal<File | null>(null);
  readonly html = signal<File | null>(null);

  readonly tentouSalvar = signal(false);
  readonly salvando = signal(false);
  readonly erroServidor = signal('');
  readonly avisos = signal<string[]>([]);
  readonly salvo = signal<CmsBanner | null>(null);
  readonly toast = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly edicao = computed(() => this.existente() != null);

  /** O banner já tem hotsite salvo? Então o PUT pode seguir sem novo `.html`. */
  private readonly temHotsiteSalvo = computed(() => {
    const atual = this.existente();
    return atual != null && atual.tipoDestino === 'html' && atual.htmlPath != null;
  });

  readonly erros = computed(() => {
    const erros: Partial<Record<'titulo' | 'destino' | 'html' | 'imagem' | 'ordem', string>> = {};
    if (!this.titulo().trim()) erros.titulo = 'Informe o nome do banner.';
    else if (this.titulo().trim().length > 150) erros.titulo = 'Use no máximo 150 caracteres.';
    if (this.tipo() === 'link') {
      const destino = this.destino().trim();
      if (!destino) erros.destino = 'Informe a URL de destino.';
      else if (!DESTINO_VALIDO.test(destino)) erros.destino = 'Use um endereço https:// ou uma âncora #secao.';
    } else if (this.html() == null && !this.temHotsiteSalvo()) {
      erros.html = 'Envie o arquivo .html do hotsite.';
    }
    if (!this.edicao() && this.imagem() == null) erros.imagem = 'Envie a imagem do banner.';
    const ordem = this.ordem();
    if (ordem != null && (!Number.isInteger(ordem) || ordem < 0)) erros.ordem = 'Use um número inteiro a partir de 0.';
    return erros;
  });

  /** Link do hotsite só para banner html ATIVO, e só se a instância tem site configurado. */
  readonly linkHotsite = computed(() => {
    const site = this.branding()?.cmsSiteUrl;
    const item = this.salvo();
    if (site == null || item == null || item.tipoDestino !== 'html' || item.ativo !== true) return null;
    return `${site}/ofertas/${item.id}`;
  });

  ngOnInit(): void {
    if (this.id) this.carregar(this.id);
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
  }

  trocarTipo(tipo: CmsTipoDestino): void {
    if (tipo === this.tipo()) return;
    this.tipo.set(tipo);
    if (tipo === 'html') this.destino.set('');
    else this.html.set(null);
  }

  lerOrdem(valor: string): void {
    this.ordem.set(valor.trim() === '' ? null : Number(valor));
  }

  cancelar(): void {
    this.router.navigate(['/marketing/banners']);
  }

  salvar(): void {
    this.tentouSalvar.set(true);
    this.erroServidor.set('');
    if (Object.keys(this.erros()).length > 0 || this.salvando()) return;

    this.salvando.set(true);
    const atual = this.existente();
    const requisicao = atual
      ? this.cms.atualizar('banners', atual.id, this.formData())
      : this.cms.criar('banners', this.formData());

    requisicao.subscribe({
      next: ({ item, avisos }) => {
        // Fica no formulário: em modo edição daqui em diante, para o próximo
        // salvar ser PUT e os avisos continuarem visíveis.
        this.existente.set(item);
        this.salvo.set(item);
        this.avisos.set(avisos ?? []);
        this.imagem.set(null);
        this.html.set(null);
        this.salvando.set(false);
        this.mostrarToast(TOAST_SALVO);
      },
      error: (erro) => {
        // Campos mantidos: o operador corrige só o que o BFF apontou.
        this.erroServidor.set(mensagemDeErro(erro, 'Não foi possível salvar o banner.'));
        this.salvando.set(false);
      },
    });
  }

  nomeHotsite(): string | null {
    const atual = this.existente();
    return atual?.htmlPath != null ? atual.htmlPath.split('/').pop() ?? null : null;
  }

  private carregar(id: string): void {
    this.carregando.set(true);
    this.cms.obter('banners', id).subscribe({
      next: (banner) => {
        this.existente.set(banner);
        this.titulo.set(banner.title);
        this.tipo.set(banner.tipoDestino);
        this.destino.set(banner.destino ?? '');
        this.ordem.set(banner.displayOrder);
        this.ativo.set(banner.ativo);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erroCarga.set(mensagemDeErro(erro, 'Não foi possível carregar o banner.'));
        this.carregando.set(false);
      },
    });
  }

  private formData(): FormData {
    const dados = new FormData();
    dados.set('title', this.titulo().trim());
    dados.set('tipoDestino', this.tipo());
    if (this.tipo() === 'link') dados.set('destino', this.destino().trim());
    const ordem = this.ordem();
    if (ordem != null) dados.set('displayOrder', String(ordem));
    dados.set('ativo', String(this.ativo()));
    const imagem = this.imagem();
    if (imagem) dados.set('imagem', imagem, imagem.name);
    const html = this.html();
    if (this.tipo() === 'html' && html) dados.set('html', html, html.name);
    return dados;
  }

  private mostrarToast(texto: string): void {
    this.toast.set(texto);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 6000);
  }
}
