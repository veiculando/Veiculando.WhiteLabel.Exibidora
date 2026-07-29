export const environment = {
  production: false,

  /**
   * Afiliada desta instância WhiteLabel.
   *
   * Era `1`, que não corresponde a nenhuma afiliada em produção (consultadas as
   * 221 existentes). A instância piloto é a **13 — AURUM** (112 locais, 4
   * usuários, 9 PIs); há uma segunda AURUM no Id 46, praticamente vazia (3
   * locais), que não deve ser usada.
   *
   * Este valor só alimenta o header `X-Tenant-AfiliadaId`. Quem decide de fato é
   * o `WL:AfiliadaId` do BFF: o `TenantMiddleware` compara os dois, loga a
   * divergência e **sobrepõe com o valor do servidor** (ADR-WL-005). Corrigir
   * aqui elimina o warning; a correção que muda comportamento é a do BFF
   * (Tarefa 9 do TP-R2).
   */
  afiliadaId: 13,

  bffUrl: 'https://localhost:5001/api/wl',
  tokenKey: 'veiculando-wl-op.token', // Chave específica da exibidora/operador
  allowedDomains: ['localhost:5001'],
  branding: {
    primaryColor: '#8a0009', // Aurum default
    secondaryColor: '#d9b442',
    logoUrl: '/assets/images/logo.png', // Fallback URL
    footerText: 'Veiculando WhiteLabel Exibidora',
  },
};
