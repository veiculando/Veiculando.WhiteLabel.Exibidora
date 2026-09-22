/**
 * `DD/MM` a partir de uma data ISO, em UTC.
 *
 * `new Date(iso).getDate()`/`getMonth()` lêem no fuso LOCAL do navegador —
 * para uma data-calendário sem componente de hora relevante (ex.: início de
 * período de veiculação), isso troca o dia quando o fuso local é negativo
 * (Brasil é UTC-3): `2026-07-01T00:00:00Z` vira 30/06 em vez de 01/07. Usar
 * os getters `UTC*` lê os mesmos componentes que o servidor enviou, sem
 * conversão de fuso.
 */
export function formatarDiaMes(iso: string): string {
  const data = new Date(iso);
  return `${String(data.getUTCDate()).padStart(2, '0')}/${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}
