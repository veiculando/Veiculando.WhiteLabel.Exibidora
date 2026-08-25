
import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { mensagemDeErro } from '../../core/http/api-error';
import { CidadeLookup, LocalDetalhe, LocalFormPayload } from '../../core/models/wl.models';
import { LocaisService } from '../../core/services/locais.service';
import { LookupsService } from '../../core/services/lookups.service';

/**
 * Cadastro e edição de local.
 *
 * O formulário existe em um componente separado da listagem porque tem estado
 * próprio (lookups, validação, submissão) e a listagem já é densa.
 *
 * Nada aqui decide aprovação: o local nasce em `AprovacaoPendente` porque o
 * `LocalCadastroHandler` do core aplica a transição ao identificar que quem
 * cadastrou é usuário de afiliada (ADR-WL-004). A UI apenas avisa o operador.
 */
@Component({
    selector: 'app-local-form',
    imports: [ReactiveFormsModule],
    template: `
    <form class="wl-card" [formGroup]="form" (ngSubmit)="salvar()">
      <h2 class="form__titulo">{{ local ? 'Editar local' : 'Novo local' }}</h2>
    
      @if (!local) {
        <p class="form__aviso">
          O local entrará como <strong>aguardando aprovação</strong>. A liberação é
          feita pela equipe Veiculando no painel Admin.
        </p>
      }
    
      @if (erro) {
        <div class="wl-estado wl-estado--erro">{{ erro }}</div>
      }
    
      <div class="grade">
        <div class="wl-campo campo--largo">
          <label for="descricao">Descrição *</label>
          <input id="descricao" type="text" formControlName="descricao" />
          @if (invalido('descricao')) {
            <span class="wl-campo__erro">Informe a descrição.</span>
          }
        </div>
    
        <div class="wl-campo">
          <label for="idCidade">Cidade *</label>
          <select id="idCidade" formControlName="idCidade">
            <option [ngValue]="null">Selecione…</option>
            @for (cidade of cidades; track cidade) {
              <option [ngValue]="cidade.id">
                {{ cidade.nome }} / {{ cidade.sigla }}
              </option>
            }
          </select>
          @if (invalido('idCidade')) {
            <span class="wl-campo__erro">Selecione a cidade.</span>
          }
          <!-- O lookup lista apenas cidades onde a exibidora já tem inventário;
          é a mesma restrição do endpoint, não uma limitação da tela. -->
        </div>
    
        <div class="wl-campo">
          <label for="codigoInterno">Código interno</label>
          <input id="codigoInterno" type="text" formControlName="codigoInterno" />
        </div>
    
        <div class="wl-campo campo--largo">
          <label for="logradouro">Logradouro *</label>
          <input id="logradouro" type="text" formControlName="logradouro" />
          @if (invalido('logradouro')) {
            <span class="wl-campo__erro">Informe o logradouro.</span>
          }
        </div>
    
        <div class="wl-campo">
          <label for="numero">Número</label>
          <input id="numero" type="text" formControlName="numero" />
        </div>
    
        <div class="wl-campo">
          <label for="bairro">Bairro</label>
          <input id="bairro" type="text" formControlName="bairro" />
        </div>
    
        <div class="wl-campo">
          <label for="cep">CEP</label>
          <input id="cep" type="text" formControlName="cep" />
        </div>
    
        <div class="wl-campo">
          <label for="complemento">Complemento</label>
          <input id="complemento" type="text" formControlName="complemento" />
        </div>
    
        <div class="wl-campo campo--largo">
          <label for="referencia">Ponto de referência</label>
          <input id="referencia" type="text" formControlName="referencia" />
        </div>
    
        <div class="wl-campo">
          <label for="latitude">Latitude *</label>
          <input id="latitude" type="number" step="any" formControlName="latitude" />
          @if (invalido('latitude')) {
            <span class="wl-campo__erro">Informe a latitude.</span>
          }
        </div>
    
        <div class="wl-campo">
          <label for="longitude">Longitude *</label>
          <input id="longitude" type="number" step="any" formControlName="longitude" />
          @if (invalido('longitude')) {
            <span class="wl-campo__erro">Informe a longitude.</span>
          }
        </div>
    
        <div class="wl-campo campo--largo">
          <label for="palavrasChave">Palavras-chave</label>
          <input id="palavrasChave" type="text" formControlName="palavrasChave" />
        </div>
      </div>
    
      <div class="acoes">
        <button class="wl-btn" type="submit" [disabled]="salvando">
          {{ salvando ? 'Salvando…' : local ? 'Salvar alterações' : 'Cadastrar local' }}
        </button>
        <button class="wl-btn wl-btn--secundario" type="button" (click)="cancelar.emit()">
          Cancelar
        </button>
      </div>
    </form>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      .form__titulo {
        margin: 0 0 8px;
        font-size: 1.1rem;
      }
      .form__aviso {
        margin: 0 0 16px;
        padding: 10px 14px;
        background: var(--warning-bg);
        border: 1px solid var(--warning-border);
        border-radius: var(--radius-sm);
        font-size: 0.85rem;
        color: var(--warning);
      }
      .grade {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }
      .campo--largo {
        grid-column: span 2;
      }
      @media (max-width: 640px) {
        .campo--largo {
          grid-column: span 1;
        }
      }
      .acoes {
        display: flex;
        gap: 12px;
      }
    `,
    ]
})
export class LocalFormComponent implements OnInit {
  /** Ausente = criação. Presente = edição, e o formulário chega preenchido. */
  @Input() local: LocalDetalhe | null = null;

  @Output() salvo = new EventEmitter<string>();
  @Output() cancelar = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private service = inject(LocaisService);
  private lookups = inject(LookupsService);

  cidades: CidadeLookup[] = [];
  salvando = false;
  erro: string | null = null;

  form = this.fb.nonNullable.group({
    descricao: ['', [Validators.required]],
    idCidade: this.fb.control<number | null>(null, [Validators.required]),
    codigoInterno: [''],
    logradouro: ['', [Validators.required]],
    numero: [''],
    bairro: [''],
    cep: [''],
    complemento: [''],
    referencia: [''],
    latitude: this.fb.control<number | null>(null, [Validators.required]),
    longitude: this.fb.control<number | null>(null, [Validators.required]),
    palavrasChave: [''],
  });

  ngOnInit(): void {
    this.lookups.cidades().subscribe({
      next: (cidades) => (this.cidades = cidades),
      error: () => (this.cidades = []),
    });

    if (this.local) {
      this.preencher(this.local);
    }
  }

  private preencher(local: LocalDetalhe): void {
    this.form.patchValue({
      descricao: local.descricao ?? '',
      idCidade: local.idCidade ?? null,
      codigoInterno: local.codigoInterno ?? '',
      logradouro: local.endereco?.logradouro ?? '',
      numero: local.endereco?.numero ?? '',
      bairro: local.endereco?.bairro ?? '',
      cep: local.endereco?.cep?.numero ?? '',
      complemento: local.endereco?.complemento ?? '',
      referencia: local.endereco?.referencia ?? '',
      latitude: local.geolocalizacao?.latitude ?? null,
      longitude: local.geolocalizacao?.longitude ?? null,
      palavrasChave: local.palavrasChave ?? '',
    });
  }

  invalido(campo: string): boolean {
    const controle = this.form.get(campo);
    return !!controle && controle.invalid && (controle.dirty || controle.touched);
  }

  salvar(): void {
    this.erro = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const payload: LocalFormPayload = {
      idCidade: v.idCidade!,
      descricao: v.descricao,
      codigoInterno: v.codigoInterno,
      palavrasChave: v.palavrasChave,
      endereco: {
        logradouro: v.logradouro,
        numero: v.numero,
        bairro: v.bairro,
        complemento: v.complemento,
        referencia: v.referencia,
        cep: { numero: v.cep },
      },
      geolocalizacao: {
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
      },
    };

    this.salvando = true;

    const requisicao = this.local
      ? this.service.atualizar(this.local.id, payload)
      : this.service.criar(payload);

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.salvo.emit(
          this.local
            ? 'Local atualizado. A alteração volta para aprovação da equipe Veiculando.'
            : 'Local cadastrado e enviado para aprovação.'
        );
      },
      error: (erro: unknown) => {
        this.salvando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível salvar o local.');
      },
    });
  }
}
