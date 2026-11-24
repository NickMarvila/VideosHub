// Render do estilo 2D (Remotion) a partir de <pasta>/storyboard2d.json + palavras.json + narracao.wav.
// Uso (da raiz do VideosHub):
//   node apps/render/render2d.mjs videos/<id> --validar     confere o storyboard
//   node apps/render/render2d.mjs videos/<id> --quadros     2 imagens por cena em render/quadros/
//   node apps/render/render2d.mjs videos/<id> --previa      vídeo rápido 540×960 em render/previa.mp4
//   node apps/render/render2d.mjs videos/<id>               vídeo final 1080×1920 em render/video.mp4
//   node apps/render/render2d.mjs videos/<id> --capa 12.5   capa em render/capa.png
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { expandirStoryboard, caixas, REGRAS } from './modelos_cartoon.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const valor = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const pastaArg = args.find((a) => !a.startsWith('--') && ![valor('capa'), valor('storyboard'), valor('lote')].includes(a));
if (!pastaArg) { console.error('Uso: node apps/render/render2d.mjs videos/<id> [--validar|--quadros|--previa|--capa <s>]'); process.exit(1); }
const pasta = path.resolve(RAIZ, pastaArg);
const lerJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

const CENARIOS = ['rua_dia', 'rua_noite', 'mercado', 'sala', 'estrada'];
// --cartoon: estilo "Cartoon 3D" (skill cartoon-audio-short): outro storyboard, outra composição e WebGL pelo ANGLE
const CARTOON = flag('cartoon');
const COMP = CARTOON ? 'Cartoon3D' : 'Video2D';
const ARQ_SB = CARTOON ? 'storyboard_cartoon.json' : 'storyboard2d.json';
const GL = CARTOON ? { chromiumOptions: { gl: 'angle' }, concurrency: 1, timeoutInMilliseconds: 120000 } : {};
const CENARIOS_CARTOON = ['vila', 'praca', 'campo'];
// objetos do Cartoon: lidos do motor (src/cartoon/objetos.ts), para a lista nunca ficar velha
const lerLista = (nome) => { const src = fs.readFileSync(path.join(AQUI, 'src', 'cartoon', 'objetos.ts'), 'utf8'); const k = src.indexOf(`export const ${nome} = [`); return JSON.parse(src.slice(src.indexOf('[', k), src.indexOf(']', k) + 1)); };
const OBJ_CARTOON = CARTOON ? [...lerLista('OBJETOS_3D'), ...lerLista('OBJETOS_2D')] : [];
const OBJETOS = ['parati', 'dinheiro', 'moeda', 'relogio', 'celular', 'caixa_som', 'skate', 'pneu', 'balao', 'pensamento', 'seta', 'icone', 'placa'];
const POSES = ['neutro', 'apontando', 'bracos_abertos', 'pensando', 'maos_na_cintura', 'comemorando', 'segurando'];
const EXPRESSOES = ['neutro', 'feliz', 'surpreso', 'bravo', 'triste', 'duvida'];

function carregar() {
  // --storyboard <arquivo> usa outro storyboard (ex.: uma combinação de variantes) com o áudio da pasta
  const arq = valor('storyboard') ? path.resolve(RAIZ, valor('storyboard')) : path.join(pasta, ARQ_SB);
  if (!fs.existsSync(arq)) throw new Error(`Não achei ${path.relative(RAIZ, arq)}.`);
  return completar(lerJSON(arq));
}
function lerExtras() {
  const ler = (sub) => {
    const dir = path.join(RAIZ, 'assets2d', sub);
    if (!fs.existsSync(dir)) return {};
    return Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.svg')).map((f) => [f.slice(0, -4),
      fs.readFileSync(path.join(dir, f), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')]));
  };
  return { objetos: ler('objetos'), cenarios: ler('cenarios') };
}
const EXTRAS = lerExtras();
function completar(sb) {
  // assets da biblioteca + os que vierem no próprio storyboard (opções ainda não publicadas)
  sb.extras = { objetos: { ...EXTRAS.objetos, ...(sb.extras?.objetos || {}) }, cenarios: { ...EXTRAS.cenarios, ...(sb.extras?.cenarios || {}) } };
  const palavras = fs.existsSync(path.join(pasta, 'palavras.json')) ? lerJSON(path.join(pasta, 'palavras.json')) : [];
  if (CARTOON) { // completa o elenco com a ficha do personagem (campo "cartoon")
    sb = expandirStoryboard(sb); // "momento" vira câmera, foco e posições (config/regras-camera.json)
    sb.elenco ||= {};
    for (const c of sb.cenas || []) for (const a of c.atores || []) if (!sb.elenco[a.id]) {
      const ficha = path.join(RAIZ, 'personagens', a.id, 'personagem.json');
      if (fs.existsSync(ficha) && lerJSON(ficha).cartoon) sb.elenco[a.id] = lerJSON(ficha).cartoon;
    }
    sb.audio ||= fs.existsSync(path.join(pasta, 'narracao.wav')) ? 'narracao.wav' : undefined;
    return { sb, palavras };
  }
  sb.personagens ||= {};
  for (const c of sb.cenas || []) for (const a of c.atores || []) { // completa com a ficha do personagem (rig2d)
    if (!sb.personagens[a.id]) {
      const ficha = path.join(RAIZ, 'personagens', a.id, 'personagem.json');
      if (fs.existsSync(ficha) && lerJSON(ficha).rig2d) sb.personagens[a.id] = lerJSON(ficha).rig2d;
    }
  }
  sb.audio ||= fs.existsSync(path.join(pasta, 'narracao.wav')) ? 'narracao.wav' : undefined;
  return { sb, palavras };
}

function validar(dados) {
  return CARTOON ? validarCartoon(dados) : validar2d(dados);
}
function validarCartoon({ sb }) {
  const erros = []; const avisos = [];
  const voz = fs.existsSync(path.join(pasta, 'voz.json')) ? lerJSON(path.join(pasta, 'voz.json')) : null;
  if (!(sb.duracao > 0)) erros.push('duracao precisa ser maior que zero');
  if (voz && sb.duracao < voz.duracao) erros.push(`duracao (${sb.duracao}) menor que o áudio (${voz.duracao})`);
  let fim = 0;
  (sb.cenas || []).forEach((c, i) => {
    const n = `cena ${i + 1}`;
    if (Math.abs(c.inicio - fim) > 0.05) erros.push(`${n}: começa em ${c.inicio}, mas a anterior termina em ${fim}`);
    if (c.cenario && !CENARIOS_CARTOON.includes(c.cenario)) erros.push(`${n}: cenário "${c.cenario}" não existe (${CENARIOS_CARTOON.join(', ')})`);
    if (!c.camera?.length) erros.push(`${n}: sem chaves de câmera`);
    for (const k of c.camera || []) if (!Array.isArray(k.pos) || !Array.isArray(k.olha)) erros.push(`${n}: chave de câmera sem pos/olha`);
    if ((c.cenario || 'vila') === 'vila') for (const k of c.camera || []) if (Math.abs(k.pos[2]) > 7.5 && Math.abs(k.pos[1]) < 12) avisos.push(`${n}: câmera em z=${k.pos[2]} fica na calçada/casas; as casas no caminho somem, mas prefira |z| < 7`);
    const OBJ_C = OBJ_CARTOON;
    if (c.momento && !REGRAS[c.momento]) erros.push(`${n}: momento "${c.momento}" não existe (${Object.keys(REGRAS).join(', ')})`);
    const ACOES_C = ['parado', 'acena', 'senta', 'cai', 'comemora', 'maos_cabeca', 'abre', 'maos_cintura', 'aponta', 'pensa', 'segura', 'decepcao', 'pulo', 'tremer'];
    for (const o of c.objetos || []) if (!OBJ_C.includes(o.tipo)) erros.push(`${n}: objeto "${o.tipo}" não existe (${OBJ_C.join(', ')})`);
    for (const a of c.atores || []) for (const [, ac] of a.acoes || []) if (!ACOES_C.includes(ac)) erros.push(`${n}: ação "${ac}" não existe (${ACOES_C.join(', ')})`);
    for (const a of c.atores || []) if (!sb.elenco?.[a.id]) erros.push(`${n}: "${a.id}" não está no elenco (nem em personagens/${a.id}/personagem.json → cartoon)`);
    if ((c.camera || []).length < 2 && c.fim - c.inicio > 2) avisos.push(`${n}: só uma chave de câmera; ela vai só se aproximar devagar`);
    const ss = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * x * (x * (x * 6 - 15) + 10); };
    const camEm = (t) => { const ks = c.camera || []; let a = ks[0], b = ks[0], u = 0;
      for (let i = 0; i < ks.length; i++) if (t >= ks[i].t) { a = ks[i]; b = ks[i + 1] || ks[i]; u = b === a ? 0 : (t - a.t) / Math.max(1e-3, b.t - a.t); }
      u = ss(u); const L = (x, y) => x.map((q, i) => q + (y[i] - q) * u); return { pos: L(a.pos, b.pos), olha: L(a.olha, b.olha), fov: (a.fov ?? 40) + ((b.fov ?? a.fov ?? 40) - (a.fov ?? 40)) * u }; };
    // enquadramento de tudo (atores e objetos visíveis) no começo, meio e fim; câmera dentro de um objeto
    if (c.camera?.length) for (const [rot, t] of [['começo', c.inicio + 0.15], ['meio', (c.inicio + c.fim) / 2], ['fim', c.fim - 0.15]]) {
      const k = camEm(t);
      const fx = k.olha[0] - k.pos[0], fy = k.olha[1] - k.pos[1], fz = k.olha[2] - k.pos[2];
      const meiaH = Math.atan(Math.tan((k.fov / 2) * Math.PI / 180) * 0.5625) * 180 / Math.PI, meiaV = k.fov / 2;
      for (const b of caixas(c, t)) {
        // cena com momento: o alvo e as figurinhas sempre têm que caber; o resto só quando o momento pede tudo (e só no fim)
        if (c._cabe && b.id !== c.alvo && !b.figurinha && (c._cabe !== 'todos' || rot !== 'fim')) continue;
        const [x, y, z] = b.centro, nome = b.ator ? `"${b.id}"` : `objeto "${b.id}"`;
        const dentro = [0, 1, 2].every((i) => Math.abs(k.pos[i] - b.centro[i]) < [b.w, b.h, b.d][i] / 2 + 0.1);
        if (dentro && !b.figurinha) { avisos.push(`${n}: a câmera fica dentro de ${nome} no ${rot} da cena`); continue; }
        const px = x - k.pos[0], py = y - k.pos[1], pz = z - k.pos[2];
        if (fx * px + fy * py + fz * pz <= 0) { avisos.push(`${n}: ${nome} está atrás da câmera no ${rot} da cena`); continue; }
        const angH = Math.abs(Math.atan2(fx * pz - fz * px, fx * px + fz * pz)) * 180 / Math.PI;
        const elev = (a, b2, c2) => Math.atan2(b2, Math.hypot(a, c2)) * 180 / Math.PI;
        const angV = Math.abs(elev(px, py, pz) - elev(fx, fy, fz));
        if (angH > meiaH || angV > meiaV) avisos.push(`${n}: ${nome} fica fora do quadro no ${rot} da cena (${angH.toFixed(0)}° do meio na horizontal, até ${meiaH.toFixed(0)}°; ${angV.toFixed(0)}° na vertical, até ${meiaV.toFixed(0)}°)`);
        else if (angH > meiaH * 0.8 && b.ator) avisos.push(`${n}: ${nome} fica cortado na borda do quadro no ${rot} da cena`);
      }
    }
    if (c.fim - c.inicio > 7) avisos.push(`${n}: ${(c.fim - c.inicio).toFixed(1)} s é longa (máx. ~6 s)`);
    fim = c.fim;
  });
  if (sb.cenas?.length && Math.abs(fim - sb.duracao) > 0.05) erros.push(`a última cena termina em ${fim}, mas a duração é ${sb.duracao}`);
  console.log(`Validação Cartoon 3D de ${path.relative(RAIZ, pasta)}: ${sb.cenas?.length || 0} cenas, ${sb.duracao}s`);
  for (const a of avisos) console.log(`  ! ${a}`);
  for (const e of erros) console.log(`  ✗ ${e}`);
  console.log(erros.length ? `
${erros.length} erro(s).` : `
Sem erros (${avisos.length} aviso(s)).`);
  return erros.length === 0;
}
function validar2d({ sb, palavras }) {
  const erros = []; const avisos = [];
  const voz = fs.existsSync(path.join(pasta, 'voz.json')) ? lerJSON(path.join(pasta, 'voz.json')) : null;
  if (!(sb.duracao > 0)) erros.push('duracao precisa ser maior que zero');
  if (voz && sb.duracao < voz.duracao) erros.push(`duracao (${sb.duracao}) menor que o áudio (${voz.duracao}): o fim seria cortado`);
  if (!sb.cenas?.length) erros.push('nenhuma cena');
  let fimAnterior = 0;
  (sb.cenas || []).forEach((c, i) => {
    const n = `cena ${i + 1}`;
    if (Math.abs(c.inicio - fimAnterior) > 0.05) erros.push(`${n}: começa em ${c.inicio}, mas a anterior termina em ${fimAnterior} (sem buracos)`);
    if (!(c.fim > c.inicio)) erros.push(`${n}: fim antes do início`);
    if (c.fim - c.inicio > 7) avisos.push(`${n}: ${(c.fim - c.inicio).toFixed(1)} s é longa demais (máx. ~6 s)`);
    if (!CENARIOS.includes(c.cenario) && !EXTRAS.cenarios[c.cenario]) erros.push(`${n}: cenário "${c.cenario}" não existe (${CENARIOS.join(', ')})`);
    for (const a of c.atores || []) {
      if (!sb.personagens[a.id]) erros.push(`${n}: personagem "${a.id}" sem visual (crie rig2d em personagens/${a.id}/personagem.json ou em "personagens")`);
      for (const [, p] of a.poses || []) if (!POSES.includes(p)) erros.push(`${n}: pose "${p}" não existe`);
      for (const [, e] of a.expressoes || []) if (!EXPRESSOES.includes(e)) erros.push(`${n}: expressão "${e}" não existe`);
    }
    for (const o of c.objetos || []) if (!OBJETOS.includes(o.tipo) && !EXTRAS.objetos[o.tipo]) erros.push(`${n}: objeto "${o.tipo}" não existe`);
    const temMovimento = (c.atores || []).some((a) => Array.isArray(a.x) || (a.poses || []).length > 1) || (c.objetos || []).some((o) => o.aparece !== undefined || Array.isArray(o.x) || o.movendo);
    if (!temMovimento) avisos.push(`${n}: nada se mexe (faça alguém andar, trocar de pose ou um objeto aparecer)`);
    fimAnterior = c.fim;
  });
  if (sb.cenas?.length && Math.abs(fimAnterior - sb.duracao) > 0.05) erros.push(`a última cena termina em ${fimAnterior}, mas a duração é ${sb.duracao}`);
  if (!palavras.length) avisos.push('sem palavras.json: o vídeo sai sem legenda');
  console.log(`Validação 2D de ${path.relative(RAIZ, pasta)}: ${sb.cenas?.length || 0} cenas, ${sb.duracao}s`);
  for (const a of avisos) console.log(`  ! ${a}`);
  for (const e of erros) console.log(`  ✗ ${e}`);
  console.log(erros.length ? `\n${erros.length} erro(s).` : `\nSem erros (${avisos.length} aviso(s)).`);
  return erros.length === 0;
}

async function preparar(dados) {
  // pasta pública temporária só com o áudio (evita copiar renders antigos para o bundle)
  const pub = fs.mkdtempSync(path.join(os.tmpdir(), 'vh2d-'));
  if (dados.sb.audio) fs.copyFileSync(path.join(pasta, dados.sb.audio), path.join(pub, dados.sb.audio));
  console.log('Preparando o projeto 2D...');
  const serveUrl = await bundle({ entryPoint: path.join(AQUI, 'src', 'index.ts'), publicDir: pub, onProgress: () => {} });
  const inputProps = { storyboard: dados.sb, palavras: dados.palavras };
  const composition = await selectComposition({ serveUrl, id: COMP, inputProps, ...GL });
  return { serveUrl, inputProps, composition };
}

if (valor('lote')) {
  // Lote de clipes/miniaturas de variantes: prepara o projeto uma vez e renderiza tudo.
  // Arquivo: { "itens": [ { "tipo": "clipe"|"poster", "storyboard": {...}, "de": s, "ate": s, "t": s, "saida": "caminho" } ] }
  const { itens } = lerJSON(path.resolve(RAIZ, valor('lote')));
  if (!itens.length) { console.log('Nada para renderizar.'); process.exit(0); }
  const primeiro = completar(itens[0].storyboard);
  const base = await preparar(primeiro);
  let n = 0;
  for (const it of itens) {
    const d = completar(it.storyboard);
    const inputProps = { storyboard: d.sb, palavras: d.palavras };
    const composition = await selectComposition({ serveUrl: base.serveUrl, id: COMP, inputProps, ...GL });
    const ultimo = composition.durationInFrames - 1;
    const saida = path.resolve(RAIZ, it.saida);
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    if (it.tipo === 'poster') {
      await renderStill({ ...GL, composition, serveUrl: base.serveUrl, inputProps, output: saida, frame: Math.min(ultimo, Math.round(it.t * composition.fps)), scale: 0.4 });
    } else {
      const de = Math.min(ultimo, Math.round(it.de * composition.fps));
      const ate = Math.max(de, Math.min(ultimo, Math.round(it.ate * composition.fps) - 1));
      await renderMedia({ ...GL, composition, serveUrl: base.serveUrl, inputProps, codec: 'h264', outputLocation: saida, scale: 0.5, crf: 28, frameRange: [de, ate] });
    }
    n++; console.log(`Quadro ${n}/${itens.length}  (${Math.round((n / itens.length) * 100)}%)  ${path.basename(saida)}`);
  }
  process.exit(0);
}

const dados = carregar();
const ok = validar(dados);
if (flag('validar')) process.exit(ok ? 0 : 1);
if (!ok) { console.error('Corrija os erros antes de renderizar.'); process.exit(1); }
const saidaDir = path.join(pasta, 'render');
fs.mkdirSync(saidaDir, { recursive: true });
const { serveUrl, inputProps, composition } = await preparar(dados);
const fps = composition.fps;

if (flag('quadros')) {
  const dir = path.join(saidaDir, 'quadros');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.png')) fs.rmSync(path.join(dir, f), { force: true }); // apaga só as imagens (a pasta pode estar aberta)
  const alvos = dados.sb.cenas.flatMap((c, i) => [[`cena${String(i + 1).padStart(2, '0')}_inicio`, c.inicio + (c.fim - c.inicio) * 0.2], [`cena${String(i + 1).padStart(2, '0')}_meio`, c.inicio + (c.fim - c.inicio) * 0.65]]);
  let n = 0;
  for (const [nome, t] of alvos) {
    await renderStill({ ...GL, composition, serveUrl, inputProps, output: path.join(dir, `${nome}.png`), frame: Math.min(composition.durationInFrames - 1, Math.round(t * fps)), scale: 0.5 });
    n++; console.log(`Quadro ${n}/${alvos.length}  (${Math.round((n / alvos.length) * 100)}%)`);
  }
  console.log(`${n} quadros salvos em ${path.relative(RAIZ, dir)}.`);
} else if (valor('capa')) {
  const t = Number(valor('capa'));
  await renderStill({ ...GL, composition, serveUrl, inputProps, output: path.join(saidaDir, 'capa.png'), frame: Math.min(composition.durationInFrames - 1, Math.round(t * fps)) });
  console.log(`Capa salva em ${path.relative(RAIZ, path.join(saidaDir, 'capa.png'))} (instante ${t}s).`);
} else {
  const previa = flag('previa');
  const saida = path.join(saidaDir, previa ? 'previa.mp4' : 'video.mp4');
  let ultimo = -1;
  await renderMedia({
    ...GL,
    composition, serveUrl, inputProps, codec: 'h264', outputLocation: saida, scale: previa ? 0.5 : 1, crf: previa ? 28 : 18,
    onProgress: ({ renderedFrames }) => {
      if (renderedFrames - ultimo >= 30 || renderedFrames === composition.durationInFrames) {
        ultimo = renderedFrames;
        console.log(`Quadro ${renderedFrames}/${composition.durationInFrames}  (${Math.round((renderedFrames / composition.durationInFrames) * 100)}%)`);
      }
    },
  });
  console.log(`Pronto: ${path.relative(RAIZ, saida)} (${(fs.statSync(saida).size / 1e6).toFixed(1)} MB).`);
}
