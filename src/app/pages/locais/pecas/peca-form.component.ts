import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PecaService } from '../services/peca.service';
import { PecaPayload } from '../models/peca.model';

/**
 * Cadastro/edição de peça (T1 do plano tático), acessível pelo wizard
 * (etapa 3) e diretamente pela rota /locais/:idLocal/pecas/nova|:idPeca.
 *
 * `idLocal` é lido SOMENTE da rota — nunca aparece como campo editável,
 * o que impede mover uma peça para o local de outro tenant a partir do
 * formulário (ver PecaService.updatePeca).
 *
 * Os campos de Via, Formato e Especificação de Produção são estruturados
 * (não texto livre) porque o Core monta Value Objects próprios a partir
 * deles, cada um com sua validação (ex.: Via.Faixas entre 2 e 9,
 * Via.Velocidade entre 11 e 119) — um campo de texto solto não tem como
 * satisfazer isso no BFF sem inventar dados.
 *
 * Upload de foto permanece fora de escopo (T6): enquanto o endpoint do
 * BFF responder 501, o CTA fica desabilitado e nunca simula sucesso.
 */
@Component({
  selector: 'app-peca-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './peca-form.component.html',
})
export class PecaFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pecaService = inject(PecaService);
  private readonly fb = new FormBuilder();

  idLocal!: number;
  idPeca: number | null = null;
  fotoUrl: string | null = null;

  /** Upload de foto de peça responde 501 no BFF — não persiste (T6). */
  readonly uploadFotoIndisponivel = true;

  readonly form = this.fb.nonNullable.group({
    idTipoSuporte: this.fb.control<number | null>(null, Validators.required),
    codigoInterno: this.fb.control<string | null>(null),
    periodicidadePadrao: this.fb.control<number | null>(null, Validators.required),
    valorPadrao: this.fb.control<number | null>(null, Validators.required),

    idFormato: this.fb.control<number | null>(null, Validators.required),
    formatoLargura: this.fb.control<number | null>(null, Validators.required),
    formatoAltura: this.fb.control<number | null>(null, Validators.required),
    formatoJuncao: this.fb.control<number>(0),

    especificacaoLargura: this.fb.control<number | null>(null),
    especificacaoAltura: this.fb.control<number | null>(null),
    especificacaoMaterial: this.fb.control<number | null>(null),
    especificacaoTexto: this.fb.control<string | null>(null),

    idsSubstratoTipo: this.fb.control<number[]>([]),

    iluminacao: this.fb.control<boolean>(false),
    semaforo: this.fb.control<boolean>(false),
    anguloDeVisao: this.fb.control<number | null>(null, Validators.required),

    viaTipo: this.fb.control<number>(0),
    viaFaixas: this.fb.control<number | null>(null, [Validators.required, Validators.min(2), Validators.max(9)]),
    viaVelocidade: this.fb.control<number | null>(null, [Validators.required, Validators.min(11), Validators.max(119)]),
    viaPedestre: this.fb.control<number>(0),

    roteiroComercial: this.fb.control<boolean>(false),
    alvara: this.fb.control<boolean>(false),
    streetView: this.fb.control<string | null>(null),
    descricao: this.fb.control<string | null>(null),
    restricao: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.idLocal = Number(params.get('idLocal'));
    const idPecaParam = params.get('idPeca');
    this.idPeca = idPecaParam ? Number(idPecaParam) : null;

    if (this.idPeca) {
      this.pecaService.getPeca(this.idPeca).subscribe((peca) => {
        this.fotoUrl = peca.fotoUrl;
        this.form.patchValue(peca);
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = { idLocal: this.idLocal, ...this.form.getRawValue() } as PecaPayload;

    const salvo$ = this.idPeca
      ? this.pecaService.updatePeca(this.idPeca, payload)
      : this.pecaService.createPeca(payload);

    salvo$.subscribe(() => this.router.navigate(['/locais', this.idLocal]));
  }
}
