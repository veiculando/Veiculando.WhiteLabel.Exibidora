import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { mensagemDeErro } from '../core/http/api-error';

export interface FotoPersistida {
  fileName: string;
  contentType: string;
  size: number;
  sha256: string;
  createdAt: string;
  downloadUrl: string;
  status?: string;
}

@Component({
  selector: 'app-photo-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="photo-upload" [attr.aria-label]="titulo">
      <h3>{{ titulo }}</h3>
      <p class="hint">JPG ou PNG · até {{ limiteMb }} MB</p>
      <label>
        Selecionar foto
        <input type="file" accept="image/jpeg,image/png" [disabled]="enviando()" (change)="selecionar($event)" />
      </label>
      @if (selecionada()) { <p class="filename">{{ selecionada()!.name }}</p> }
      <div class="actions">
        <button type="button" class="wl-btn wl-btn--primario" [disabled]="!selecionada() || enviando()" (click)="enviar()">
          {{ enviando() ? 'Enviando e conferindo…' : 'Enviar foto' }}
        </button>
        <button type="button" class="wl-btn wl-btn--secundario" [disabled]="enviando() || carregando()" (click)="carregar()">Recarregar fotos</button>
      </div>
      @if (enviando()) {
        <progress max="100" [value]="progresso()" aria-label="Progresso do envio"></progress>
        <p role="status">{{ progresso() }}% enviado. Aguardando confirmação do arquivo.</p>
      }
      @if (erro()) { <p class="error" role="alert">{{ erro() }}</p> }
      @if (sucesso()) { <p class="success" role="status">{{ sucesso() }}</p> }
      @if (carregando()) { <p role="status">Conferindo fotos salvas…</p> }
      @if (!carregando() && !erro() && fotos().length === 0) { <p class="hint">Nenhuma foto salva para este item.</p> }
      <ul>
        @for (foto of fotos(); track foto.fileName) {
          <li>
            <span class="filename">{{ foto.fileName }}</span>
            <small>{{ foto.createdAt | date:'dd/MM/yyyy HH:mm' }} · {{ foto.size / 1024 | number:'1.0-0' }} KB</small>
            <button class="wl-btn wl-btn--link" type="button" (click)="baixar(foto)">Baixar foto salva</button>
          </li>
        }
      </ul>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .photo-upload { padding: 1rem; border: 1px solid var(--border); border-left: 3px solid var(--secondary-color); border-radius: var(--radius-sm); background: var(--white); color: var(--charcoal); font-family: var(--font-ui); }
    h3 { margin: 0 0 .4rem; font: 600 1.15rem var(--font-display); }
    label, small { display: block; }
    input { display: block; max-width: 100%; margin: .5rem 0; }
    .hint, small { color: var(--on-surface); font-size: .8rem; }
    .filename { overflow-wrap: anywhere; font-size: .8rem; }
    .actions { display: flex; flex-wrap: wrap; gap: .5rem; }
    progress { width: 100%; margin-top: .75rem; accent-color: var(--primary-color); }
    ul { list-style: none; padding: 0; margin: .75rem 0 0; }
    li { border-top: 1px solid var(--divider); padding-top: .75rem; margin-top: .75rem; }
    .error { color: var(--danger); } .success { color: var(--success); }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 3px; }
  `],
})
export class PhotoUploadComponent implements OnChanges {
  @Input({ required: true }) uploadUrl = '';
  @Input({ required: true }) listUrl = '';
  @Input() limiteMb = 10;
  @Input() titulo = 'Foto da peça';
  @Output() confirmado = new EventEmitter<void>();
  private readonly http = inject(HttpClient);
  readonly fotos = signal<FotoPersistida[]>([]);
  readonly selecionada = signal<File | null>(null);
  readonly enviando = signal(false);
  readonly carregando = signal(false);
  readonly progresso = signal(0);
  readonly erro = signal('');
  readonly sucesso = signal('');

  ngOnChanges(): void { if (this.listUrl) this.carregar(); }

  selecionar(event: Event): void {
    if (this.enviando()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.erro.set(''); this.sucesso.set(''); this.selecionada.set(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > this.limiteMb * 1024 * 1024) {
      this.erro.set(`Escolha uma foto JPG ou PNG, não vazia, de até ${this.limiteMb} MB.`);
      input.value = '';
      return;
    }
    this.selecionada.set(file);
  }

  enviar(): void {
    const file = this.selecionada();
    if (!file || this.enviando()) return;
    this.enviando.set(true); this.progresso.set(0); this.erro.set(''); this.sucesso.set('');
    const form = new FormData(); form.append('foto', file, file.name);
    this.http.post<{ fileName: string }>(this.uploadUrl, form, { observe: 'events', reportProgress: true }).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) this.progresso.set(Math.round(100 * event.loaded / (event.total || file.size)));
        if (event.type === HttpEventType.Response) {
          const name = event.body?.fileName;
          if (!name) { this.enviando.set(false); this.erro.set('O servidor não confirmou o arquivo. Recarregue as fotos antes de reenviar.'); return; }
          this.carregar(name);
        }
      },
      error: error => { this.enviando.set(false); this.erro.set(mensagemDeErro(error, 'Falha no envio. Recarregue as fotos antes de tentar novamente.')); },
    });
  }

  carregar(expectedName?: string): void {
    this.carregando.set(true); this.erro.set('');
    this.http.get<FotoPersistida[]>(this.listUrl).subscribe({
      next: files => {
        this.fotos.set(files); this.carregando.set(false); this.enviando.set(false);
        if (expectedName) {
          if (files.some(file => file.fileName === expectedName)) {
            this.sucesso.set('Foto salva e conferida. Você pode baixar o arquivo abaixo.');
            this.selecionada.set(null); this.confirmado.emit();
          } else this.erro.set('A foto não apareceu na conferência. Recarregue antes de reenviar.');
        }
      },
      error: error => { this.carregando.set(false); this.enviando.set(false); this.erro.set(mensagemDeErro(error, 'Não foi possível conferir as fotos. Tente recarregar.')); },
    });
  }

  baixar(file: FotoPersistida): void {
    // Não enviar o token para endereço arbitrário vindo do servidor.
    if (!/^\/api\/wl\/(checking|pecas)\/[a-zA-Z0-9/-]+$/.test(file.downloadUrl)) { this.erro.set('Referência do arquivo inválida.'); return; }
    this.http.get(file.downloadUrl, { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = file.fileName; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: error => this.erro.set(mensagemDeErro(error, 'Não foi possível baixar a foto. Tente novamente.')),
    });
  }
}
