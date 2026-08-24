import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LocalPublicoPayload, emptyLocalPublicoPayload } from '../models/local-publico.model';

/**
 * Etapa 2 do wizard — "Dados Demográficos".
 *
 * Persistido pelo Core via LocalPublicoCadastroCommand, em contrato
 * separado do Local (LocalPublicoService). Emite EXCLUSIVAMENTE campos
 * de LocalPublicoPayload — nunca endereço, geolocalização ou código
 * interno, para não sobrescrever o que a etapa 1 já salvou.
 *
 * Gênero/faixas/perfis/segmentos/POI usam os MESMOS IDs de catálogo que
 * o Core aceita (LocalPublicoCadastroCommand não tem contrato para
 * rótulo+percentual livre) — por ora preservados como vieram do backend,
 * sem edição nesta etapa (mesma limitação documentada antes da mudança
 * de shape, apenas com os tipos certos).
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
    audiencia: this.fb.control<number | null>(null),
    tipoMedicao: this.fb.control<number | null>(null),
    fonte: this.fb.control<string | null>(null),
    genero: this.fb.nonNullable.control<number>(0),
  });

  faixaEtaria: number[] = [];
  faixaRenda: number[] = [];
  perfisPsicograficos: number[] = [];
  segmentos: number[] = [];
  poiCategorias: number[] = [];

  ngOnChanges(): void {
    const valor = this.valorInicial ?? emptyLocalPublicoPayload();
    this.form.patchValue({
      audiencia: valor.audiencia,
      tipoMedicao: valor.tipoMedicao,
      fonte: valor.fonte,
      genero: valor.genero,
    });
    this.faixaEtaria = [...(valor.faixaEtaria ?? [])];
    this.faixaRenda = [...(valor.faixaRenda ?? [])];
    this.perfisPsicograficos = [...(valor.perfisPsicograficos ?? [])];
    this.segmentos = [...(valor.segmentos ?? [])];
    this.poiCategorias = [...(valor.poiCategorias ?? [])];
  }

  onSubmit(): void {
    const payload: LocalPublicoPayload = {
      ...this.form.getRawValue(),
      faixaEtaria: this.faixaEtaria,
      faixaRenda: this.faixaRenda,
      perfisPsicograficos: this.perfisPsicograficos,
      segmentos: this.segmentos,
      poiCategorias: this.poiCategorias,
    };
    this.salvar.emit(payload);
  }
}
