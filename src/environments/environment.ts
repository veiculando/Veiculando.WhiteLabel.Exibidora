export const environment = {
  production: false,
  afiliadaId: 1, // ID da Afiliada / Tenant
  bffUrl: 'https://localhost:5001/api/wl',
  tokenKey: 'veiculando-wl-op.token', // Chave específica da exibidora/operador
  allowedDomains: ['localhost:5001'],
  branding: {
    primaryColor: '#8a0009', // Aurum default
    secondaryColor: '#d9b442',
    logoUrl: '/assets/images/logo.png', // Fallback URL
    footerText: 'Veiculando WhiteLabel Exibidora',
  }
};
