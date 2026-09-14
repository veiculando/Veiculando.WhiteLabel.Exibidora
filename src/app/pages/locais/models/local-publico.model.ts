/**
 * Payload/detalhe de "Dados Demográficos" (etapa 2 do wizard).
 *
 * Persistido pelo Core via LocalPublicoCadastroCommand em
 * POST /api/local/publico (o BFF WhiteLabel expõe isso em
 * GET/PUT /api/wl/locais/{id}/publico). Contém SOMENTE campos de
 * audiência/perfil — nunca endereço, geolocalização ou código interno
 * (BDD "Demografia usa contrato separado" / "Salvar demografia preserva o local").
 *
 * O shape espelha EXATAMENTE LocalPublicoCadastroCommand do Core — que
 * aceita apenas IDs de catálogo (faixa etária, faixa de renda, perfil
 * psicográfico, segmento, POI) e um único `genero` inteiro (o Core deriva
 * uma distribuição 75/25 a partir dele; não existe percentual customizado
 * por rótulo). Um shape mais rico (rótulo + percentual livre) foi cogitado
 * mas o Core não o suporta — editar essas listas fica fora de escopo desta
 * etapa até o Core ganhar um contrato mais expressivo.
 */
export interface LocalPublicoPayload {
  audiencia: number | null;
  tipoMedicao: number | null;
  fonte: string | null;
  /** 0 = sem predominância, 1 = predominância masculina, 2 = predominância feminina (Core: 75/25). */
  genero: number;
  faixaEtaria: number[];
  faixaRenda: number[];
  perfisPsicograficos: number[];
  segmentos: number[];
  poiCategorias: number[];
}

/** Payload "vazio" seguro — nenhum array fica null, conforme o plano tático exige. */
export function emptyLocalPublicoPayload(): LocalPublicoPayload {
  return {
    audiencia: null,
    tipoMedicao: null,
    fonte: null,
    genero: 0,
    faixaEtaria: [],
    faixaRenda: [],
    perfisPsicograficos: [],
    segmentos: [],
    poiCategorias: [],
  };
}
