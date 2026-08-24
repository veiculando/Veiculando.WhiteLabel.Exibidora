/**
 * Payload/detalhe de "Dados Demográficos" (etapa 2 do wizard).
 *
 * Persistido pelo Core via LocalPublicoCadastroCommand em
 * POST /api/local/publico (o BFF WhiteLabel expõe isso em
 * GET/PUT /api/wl/locais/{id}/publico). Contém SOMENTE campos de
 * audiência/perfil — nunca endereço, geolocalização ou código interno
 * (BDD "Demografia usa contrato separado" / "Salvar demografia preserva o local").
 */
export interface LocalPublicoPayload {
  audienciaDia: number | null;
  formaMedicao: string | null;
  fonte: string | null;
  genero: LocalPublicoDistribuicao[];
  faixasEtarias: LocalPublicoDistribuicao[];
  faixasRenda: LocalPublicoDistribuicao[];
  perfisPsicograficos: string[];
  segmentos: string[];
  poiCategorias: string[];
}

export interface LocalPublicoDistribuicao {
  rotulo: string;
  percentual: number;
}

/** Payload "vazio" seguro — nenhum array fica null, conforme o plano tático exige. */
export function emptyLocalPublicoPayload(): LocalPublicoPayload {
  return {
    audienciaDia: null,
    formaMedicao: null,
    fonte: null,
    genero: [],
    faixasEtarias: [],
    faixasRenda: [],
    perfisPsicograficos: [],
    segmentos: [],
    poiCategorias: [],
  };
}
