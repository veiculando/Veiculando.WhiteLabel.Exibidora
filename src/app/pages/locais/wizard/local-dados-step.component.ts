import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { firstValueFrom } from 'rxjs';
import { LocalDadosPayload } from '../models/local.model';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { LookupsService } from '../../../core/services/lookups.service';
import { CepService } from './cep.service';

const CENTRO_PADRAO: google.maps.LatLngLiteral = { lat: -23.5505, lng: -46.6333 }; // São Paulo — sem local ainda, é só o ponto de partida do mapa.

/**
 * Etapa 1 do wizard — "Dados do Local".
 *
 * Emite EXCLUSIVAMENTE campos de LocalDadosPayload. Nunca deve ganhar
 * campos de demografia — isso é o que o plano tático chama de "risco de
 * perda de dado" (o handler do Core não mescla, sobrescreve com o que
 * receber). A etapa 2 (LocalDemografiaStepComponent) usa um formulário
 * e um serviço totalmente separados.
 *
 * Mapa (VEI-RD-87): o Admin usa Google Maps (`shared/components/mapa-locais`,
 * AGM + js-marker-clusterer — ver governance doc "Veiculando.Admin — Mapa de
 * Serviços", seção 4). AGM está descontinuado e não instala em Angular 22;
 * `@angular/google-maps` é o pacote oficial equivalente para Angular
 * moderno, sobre o MESMO provedor (Google Maps) — não introduz uma segunda
 * dependência de mapa, só uma versão atual do wrapper.
 *
 * A chave nunca é hardcoded no bundle (`GoogleMapsLoaderService` busca em
 * `/api/wl/lookups/mapa-config`, autenticado). Sem chave configurada, ou se o
 * carregamento falhar, o mapa simplesmente não aparece — os campos
 * numéricos de latitude/longitude continuam visíveis e funcionais, tanto
 * como fallback quanto como alternativa de entrada acessível (plano tático,
 * critério de saída do card 87).
 */
@Component({
  selector: 'app-local-dados-step',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AurumButtonComponent, GoogleMap, MapMarker],
  templateUrl: './local-dados-step.component.html',
  styles: [
    `
      .local-dados-step__mapa {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class LocalDadosStepComponent implements OnChanges, OnInit {
  @Input() valorInicial: LocalDadosPayload | null = null;
  @Input() salvando = false;
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  @Output() salvar = new EventEmitter<LocalDadosPayload>();

  private readonly fb = new FormBuilder();
  private readonly googleMaps = inject(GoogleMapsLoaderService);
  private readonly cepService = inject(CepService);
  private readonly lookups = inject(LookupsService);

  readonly mapaDisponivel = signal(false);
  readonly consultandoCep = signal(false);
  readonly avisoCep = signal<string | null>(null);

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

  async ngOnInit(): Promise<void> {
    this.mapaDisponivel.set(await this.googleMaps.carregar());
  }

  ngOnChanges(): void {
    if (this.valorInicial) {
      this.form.patchValue(this.valorInicial);
    }
  }

  get marcador(): google.maps.LatLngLiteral {
    const { latitude, longitude } = this.form.value;
    return latitude != null && longitude != null ? { lat: latitude, lng: longitude } : CENTRO_PADRAO;
  }

  /** Preenchimento best-effort a partir do CEP — falha nunca bloqueia o formulário. */
  onCepPreenchido(endereco: { logradouro?: string; bairro?: string; cidadeId?: number }): void {
    this.form.patchValue({
      logradouro: endereco.logradouro ?? this.form.value.logradouro,
      bairro: endereco.bairro ?? this.form.value.bairro,
      idCidade: endereco.cidadeId ?? this.form.value.idCidade,
    });
  }

  /**
   * Dispara a busca de endereço (ViaCEP) e, se o mapa estiver disponível, o
   * geocoding para reposicionar o marcador. As duas etapas são best-effort:
   * qualquer falha só limpa o aviso de carregamento, nunca bloqueia o
   * restante do formulário (mesma regra do preenchimento por CEP).
   */
  async aoSairDoCep(): Promise<void> {
    const cepDigitado = (this.form.value.cep ?? '').replace(/\D/g, '');
    if (cepDigitado.length !== 8) return;

    this.consultandoCep.set(true);
    this.avisoCep.set(null);

    try {
      const endereco = await firstValueFrom(this.cepService.consultar(cepDigitado));
      if (!endereco) {
        this.avisoCep.set('CEP não encontrado — preencha o endereço manualmente.');
        return;
      }

      const cidadeId = await this.resolverCidadeId(endereco.localidade, endereco.uf);
      this.onCepPreenchido({
        logradouro: endereco.logradouro,
        bairro: endereco.bairro,
        cidadeId: cidadeId ?? undefined,
      });

      await this.geocodificar(`${endereco.logradouro}, ${endereco.localidade} - ${endereco.uf}`);
    } catch {
      this.avisoCep.set('Não foi possível consultar o CEP agora — preencha o endereço manualmente.');
    } finally {
      this.consultandoCep.set(false);
    }
  }

  /** Marcador arrastado no mapa — atualiza lat/lng do formulário (VEI-RD-87). */
  aoArrastarMarcador(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    this.form.patchValue({
      latitude: event.latLng.lat(),
      longitude: event.latLng.lng(),
    });
  }

  private async resolverCidadeId(localidade: string, uf: string): Promise<number | null> {
    if (!localidade || !uf) return null;
    try {
      const cidades = await firstValueFrom(this.lookups.cidades());
      const encontrada = cidades.find(
        (c) => c.nome.localeCompare(localidade, 'pt-BR', { sensitivity: 'base' }) === 0
          && c.sigla.localeCompare(uf, 'pt-BR', { sensitivity: 'base' }) === 0
      );
      return encontrada?.id ?? null;
    } catch {
      return null;
    }
  }

  private async geocodificar(endereco: string): Promise<void> {
    if (!this.mapaDisponivel()) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const resultado = await geocoder.geocode({ address: endereco, region: 'BR' });
      const local = resultado.results[0]?.geometry?.location;
      if (!local) return;

      this.form.patchValue({ latitude: local.lat(), longitude: local.lng() });
    } catch {
      // Geocoding é best-effort — falha aqui não impede preencher lat/lng manualmente.
    }
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
