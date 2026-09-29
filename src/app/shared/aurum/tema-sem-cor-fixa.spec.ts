import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Guarda do branding por tenant (assurance 10.0, D7).
 *
 * Trocar `--primary-color` em runtime só re-tematiza a tela inteira se nenhum
 * ponto de cor estiver fixo no código. Cor mora em `src/styles/_tokens.scss`;
 * primitives, páginas e layout usam `var(--…)` ou `color-mix()` sobre ela.
 *
 * Proibido nesses diretórios:
 *   - hex (`#8a0009`), inclusive escapado num data URI (`%238a0009`);
 *   - `rgb()`/`rgba()` cromático (canais diferentes). Cinza/preto/branco
 *     translúcido é neutro e não depende do tenant;
 *   - `hsl()`/`hsla()`.
 *
 * Comentários são ignorados: "OS #0042" e "Afiliada #4821" são hex válidos.
 */
const DIRETORIOS = ['src/app/shared/aurum', 'src/app/pages', 'src/app/layout'];
const EXTENSOES = ['.ts', '.html', '.scss', '.css'];

function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (_c, antes: string) => antes);
}

function coresFixas(fonte: string): string[] {
  const limpo = semComentarios(fonte);
  const achados: string[] = [];
  for (const m of limpo.matchAll(/(?<![\w&])#[0-9a-fA-F]{3,8}\b/g)) achados.push(m[0]);
  for (const m of limpo.matchAll(/%23[0-9a-fA-F]{3,8}\b/g)) achados.push(m[0]);
  for (const m of limpo.matchAll(/hsla?\([^)]*\)/g)) achados.push(m[0]);
  for (const m of limpo.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)[^)]*\)/g)) {
    if (!(m[1] === m[2] && m[2] === m[3])) achados.push(m[0]);
  }
  return achados;
}

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    const ehFonte = EXTENSOES.some((ext) => nome.endsWith(ext)) && !nome.endsWith('.spec.ts');
    return ehFonte ? [caminho] : [];
  });
}

describe('Tema sem cor fixa (branding por tenant)', () => {
  it('detector pega hex, hex em data URI, rgb cromático e hsl', () => {
    expect(coresFixas('color: #6e040b;')).toEqual(['#6e040b']);
    expect(coresFixas('color: #FFF;')).toEqual(['#FFF']);
    expect(coresFixas("stroke='%238a0009'")).toEqual(['%238a0009']);
    expect(coresFixas('box-shadow: 0 2px 4px rgba(74, 14, 14, 0.1);')).toEqual(['rgba(74, 14, 14, 0.1)']);
    expect(coresFixas('color: hsl(0 100% 27%);')).toEqual(['hsl(0 100% 27%)']);
  });

  it('detector deixa passar token, neutro, comentário e entidade HTML', () => {
    expect(coresFixas('color: var(--primary-ink);')).toEqual([]);
    expect(coresFixas('background: rgba(0, 0, 0, 0.06);')).toEqual([]);
    expect(coresFixas('/* "OS #0042" */ // Afiliada #4821')).toEqual([]);
    expect(coresFixas('<!-- #abc --> &#123;')).toEqual([]);
    expect(coresFixas("url('http://www.w3.org/2000/svg')")).toEqual([]);
  });

  it('nenhuma cor fixa em shared/aurum, pages e layout', () => {
    const raiz = process.cwd();
    const violacoes = DIRETORIOS.flatMap((dir) =>
      arquivos(join(raiz, dir)).flatMap((arquivo) =>
        coresFixas(readFileSync(arquivo, 'utf-8')).map((cor) => `${relative(raiz, arquivo)}: ${cor}`),
      ),
    );
    expect(violacoes).toEqual([]);
  });
});
