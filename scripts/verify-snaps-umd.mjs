import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const pin = JSON.parse(readFileSync(
  new URL('../src/app/pages/suporte/snaps-client.json', import.meta.url), 'utf8',
));
const umd = readFileSync(new URL('../src/assets/snaps/snaps-client.umd.js', import.meta.url));
const integrity = 'sha256-' + createHash('sha256').update(umd).digest('base64');

if (integrity !== pin.integrity) {
  console.error('SHA256 do UMD Snaps diverge do pin de integridade.');
  process.exitCode = 1;
}
