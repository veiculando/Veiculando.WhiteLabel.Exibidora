import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LocalDadosPayload } from '../models/local.model';

/**
 * Etapa 1 do wizard — "Dados do Local".
 *
 * Emite EXCLUSIVAMENTE campos de LocalDadosPayload. Nunca deve ganhar
 * campos de demografia — isso é o que o plano tático chama de "risco de
 * perda de dado" (o handler do Core não mescla, sobrescreve com o que
 * receber). A etapa 2 (LocalDemografiaStepComponent) usa um formulário
 * e um serviço totalmente separados.
 */
@Component({
  selector: 'app-local-dados-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './local-dados-step.component.html',
})
export class LocalDadosStepComponent implements OnChanges {
  @Input() valorInicial: LocalDadosPayload | null = null;
  @Input() salvando = false;
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  @Output() salvar = new EventEmitter<LocalDadosPayload>();

  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    idCidade: this.fb.control<number | null>(null, Validators.required),
    codigoInterno: this.fb.control<string | null>(null),
    descricao: this.fb.control<string | null>(null),
    cep: this.fb.control<string | null>(null),
    logradouro: this.fb.control<string>('', [Validators.required, Validators.pattern(/\S/)]),
    numero: this.fb.control<string | null>(null),
    bairro: this.fb.control<string | null>(null),
    complemento: this.fb.control<string | null>(null),
    referencia: this.fb.control<string | null>(null),
    latitude: this.fb.control<number | null>(null, Validators.required),
    longitude: this.fb.control<number | null>(null, Validators.required),
    palavrasChave: this.fb.control<string | null>(null),
  });

  ngOnChanges(): void {
    if (this.valorInicial) {
      this.form.patchValue(this.valorInicial);
    }
  }

  /** Preenchimento best-effort a partir do CEP — falha nunca bloqueia o formulário. */
  onCepPreenchido(endereco: { logradouro?: string; bairro?: string; cidadeId?: number }): void {
    this.form.patchValue({
      logradouro: endereco.logradouro ?? this.form.value.logradouro,
      bairro: endereco.bairro ?? this.form.value.bairro,
      idCidade: endereco.cidadeId ?? this.form.value.idCidade,
    });
  }

  onSubmit(): void {
    if (this.salvando) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.element.nativeElement.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid')?.focus();
      return;
    }
    this.salvar.emit(this.form.getRawValue() as LocalDadosPayload);
  }
}
