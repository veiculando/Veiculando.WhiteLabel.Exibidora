import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LocalPublicoDistribuicao, LocalPublicoPayload, emptyLocalPublicoPayload } from '../models/local-publico.model';

/**
 * Etapa 2 do wizard — "Dados Demográficos".
 *
 * Persistido pelo Core via LocalPublicoCadastroCommand, em contrato
 * separado do Local (LocalPublicoService). Emite EXCLUSIVAMENTE campos
 * de LocalPublicoPayload — nunca endereço, geolocalização ou código
 * interno, para não sobrescrever o que a etapa 1 já salvou.
 */
@Component({
  selector: 'app-local-demografia-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './local-demografia-step.component.html',
})
export class LocalDemografiaStepComponent implements OnChanges {
  @Input() valorInicial: LocalPublicoPayload | null = null;
  @Output() salvar = new EventEmitter<LocalPublicoPayload>();

  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    audienciaDia: this.fb.control<number | null>(null),
    formaMedicao: this.fb.control<string | null>(null),
    fonte: this.fb.control<string | null>(null),
  });

  genero: LocalPublicoDistribuicao[] = [];
  faixasEtarias: LocalPublicoDistribuicao[] = [];
  faixasRenda: LocalPublicoDistribuicao[] = [];
  perfisPsicograficos: string[] = [];
  segmentos: string[] = [];
  poiCategorias: string[] = [];

  ngOnChanges(): void {
    const valor = this.valorInicial ?? emptyLocalPublicoPayload();
    this.form.patchValue({
      audienciaDia: valor.audienciaDia,
      formaMedicao: valor.formaMedicao,
      fonte: valor.fonte,
    });
    this.genero = [...(valor.genero ?? [])];
    this.faixasEtarias = [...(valor.faixasEtarias ?? [])];
    this.faixasRenda = [...(valor.faixasRenda ?? [])];
    this.perfisPsicograficos = [...(valor.perfisPsicograficos ?? [])];
    this.segmentos = [...(valor.segmentos ?? [])];
    this.poiCategorias = [...(valor.poiCategorias ?? [])];
  }

  onSubmit(): void {
    const payload: LocalPublicoPayload = {
      ...this.form.getRawValue(),
      genero: this.genero,
      faixasEtarias: this.faixasEtarias,
      faixasRenda: this.faixasRenda,
      perfisPsicograficos: this.perfisPsicograficos,
      segmentos: this.segmentos,
      poiCategorias: this.poiCategorias,
    };
    this.salvar.emit(payload);
  }
}
