// Variantes de cena: o criador escolhe uma variante por cena e o vídeo final usa as escolhidas.
// Arquivo de controle: <pasta>/cenas/variantes.json
// {
//   "base": { ...campos gerais do storyboard, sem "cenas" },
//   "cenas": [ { "id": "c01", "inicio": 0, "fim": 3.4, "frases": ["f01"], "resumo": "...",
//                "variantes": [ { "id": "c01-a", "descricao": "...", "recomendada": true, "cena": { ...cena do storyboard } } ],
//                "escolhida": null, "ajustes": [] } ]
// }
// Uso (da raiz do VideosHub):
//   node pipeline/cenas.mjs validar <pasta>     valida todas as variantes (cada uma dentro de um vídeo completo)
//   node pipeline/cenas.mjs midia <pasta>       gera clipe com áudio + miniatura das variantes que ainda não têm
//   node pipeline/cenas.mjs montar <pasta>      escreve o storyboard final com as variantes escolhidas
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.join(RAIZ, 'Kit_Video_3d');
const [cmd, pastaArg] = process.argv.slice(2);
if (!cmd || !pastaArg) { console.error('Uso: node pipeline/cenas.mjs validar|midia|montar <pasta>'); process.exit(1); }
const pasta = path.resolve(RAIZ, pastaArg);
const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');
const lerJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const gravarJSON = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1)); };
const arqVar = path.join(pasta, 'cenas', 'variantes.json');
if (!fs.existsSync(arqVar)) { console.error(`Não achei ${rel(arqVar)}.`); process.exit(1); }
const V = lerJSON(arqVar);
const eh2D = !path.resolve(pasta).startsWith(path.join(KIT, 'projects'));
const vozGerada = fs.existsSync(path.join(pasta, 'voz.json')) ? lerJSON(path.join(pasta, 'voz.json')).geradoEm : '';

const varianteDe = (c, id) => c.variantes.find((x) => x.id === id);
const padrao = (c) => varianteDe(c, c.escolhida) || c.variantes.find((x) => x.recomendada) || c.variantes[0];
// storyboard completo; "troca" põe uma variante específica no lugar dela
function storyboard(troca = {}) {
  return { ...V.base, cenas: V.cenas.map((c) => ({ ...(varianteDe(c, troca[c.id]) || padrao(c)).cena, inicio: c.inicio, fim: c.fim })) };
}
const hash = (c, v) => crypto.createHash('md5').update(JSON.stringify([c.inicio, c.fim, v.cena, vozGerada, V.base])).digest('hex').slice(0, 10);

// 3D: cada variante vira um projeto temporário dentro do kit (o motor só abre projetos de lá)
function projetoKit3D(nome, sb) {
  const dir = path.join(pasta, '_var', nome);
  const sbRel = { ...sb, audio: sb.audio && `../../${sb.audio}`, palavras: sb.palavras && `../../${sb.palavras}` };
  gravarJSON(path.join(dir, 'storyboard.json'), sbRel);
  return { dir, projeto: path.relative(KIT, dir).split(path.sep).join('/') };
}
const rodar = (bin, args, cwd = RAIZ) => {
  const r = spawnSync(bin, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { ok: r.status === 0, saida: `${r.stdout || ''}${r.stderr || ''}` };
};

function validar() {
  let ok = true;
  // valida o vídeo com cada "camada" de variantes: todas as A, todas as B, e assim por diante
  const maximo = Math.max(...V.cenas.map((c) => c.variantes.length));
  for (let k = 0; k < maximo; k++) {
    const troca = Object.fromEntries(V.cenas.map((c) => [c.id, (c.variantes[k] || padrao(c)).id]));
    const sb = storyboard(troca);
    let r;
    if (eh2D) {
      const tmp = path.join(pasta, 'cenas', `_validar_${k}.json`); gravarJSON(tmp, sb);
      r = rodar('node', ['apps/render/render2d.mjs', rel(pasta), '--validar', '--storyboard', rel(tmp)]);
      fs.rmSync(tmp, { force: true });
    } else {
      const { projeto } = projetoKit3D(`_validar_${k}`, sb);
      r = rodar('node', ['tools/validar.mjs', projeto], KIT);
    }
    console.log(`\n== Variantes ${String.fromCharCode(97 + k).toUpperCase()} ==\n${r.saida.trim()}`);
    ok &&= r.ok;
  }
  // checagens próprias das variantes
  for (const c of V.cenas) {
    if (!c.variantes?.length) { console.log(`✗ ${c.id}: sem variantes`); ok = false; }
    if (c.variantes.filter((v) => v.recomendada).length !== 1) console.log(`! ${c.id}: marque exatamente uma variante como recomendada`);
    const ids = new Set(); for (const v of c.variantes) { if (ids.has(v.id)) { console.log(`✗ ${c.id}: id repetido ${v.id}`); ok = false; } ids.add(v.id); }
  }
  console.log(ok ? '\nVariantes OK.' : '\nCorrija os erros acima.');
  return ok;
}

function midia() {
  const pend = [];
  for (const c of V.cenas) for (const v of c.variantes) {
    const h = hash(c, v);
    const clipe = path.join(pasta, 'cenas', 'clipes', `${v.id}.mp4`);
    const poster = path.join(pasta, 'cenas', 'clipes', `${v.id}.png`);
    if (v.hash === h && fs.existsSync(clipe) && fs.existsSync(poster)) continue;
    pend.push({ c, v, h, clipe, poster });
  }
  console.log(`${pend.length} variante(s) para gerar clipe`);
  if (!pend.length) return true;
  let ok = true;
  if (eh2D) {
    const itens = pend.flatMap(({ c, v, clipe, poster }) => {
      const sb = storyboard({ [c.id]: v.id });
      return [{ tipo: 'clipe', storyboard: sb, de: c.inicio, ate: c.fim, saida: rel(clipe) },
        { tipo: 'poster', storyboard: sb, t: c.inicio + (c.fim - c.inicio) * 0.6, saida: rel(poster) }];
    });
    const lote = path.join(pasta, 'cenas', '_lote.json'); gravarJSON(lote, { itens });
    const r = spawnSync('node', ['apps/render/render2d.mjs', rel(pasta), '--lote', rel(lote)], { cwd: RAIZ, stdio: 'inherit' });
    fs.rmSync(lote, { force: true });
    ok = r.status === 0;
  } else {
    let n = 0;
    for (const { c, v, clipe, poster } of pend) {
      const { dir, projeto } = projetoKit3D(v.id, storyboard({ [c.id]: v.id }));
      fs.mkdirSync(path.dirname(clipe), { recursive: true });
      const a = rodar('node', ['tools/render.mjs', projeto, '--previa', '--de', String(c.inicio), '--ate', String(c.fim), '--saida', clipe], KIT);
      const b = rodar('node', ['tools/render.mjs', projeto, '--capa', String(+(c.inicio + (c.fim - c.inicio) * 0.6).toFixed(2))], KIT);
      if (b.ok && fs.existsSync(path.join(dir, 'render', 'capa.png'))) fs.copyFileSync(path.join(dir, 'render', 'capa.png'), poster);
      if (!a.ok || !b.ok) { console.log(`✗ ${v.id}: ${(a.ok ? b : a).saida.trim().split('\n').slice(-3).join(' ')}`); ok = false; }
      n++; console.log(`Quadro ${n * 2}/${pend.length * 2}  (${Math.round((n / pend.length) * 100)}%)  ${v.id}`);
    }
  }
  // marca o que foi gerado (relê o arquivo: o criador pode ter escolhido algo enquanto renderizava)
  const atual = lerJSON(arqVar);
  for (const { c, v, h, clipe, poster } of pend) {
    const alvo = atual.cenas.find((x) => x.id === c.id)?.variantes.find((x) => x.id === v.id);
    if (alvo && fs.existsSync(clipe) && fs.existsSync(poster)) { alvo.hash = h; alvo.clipe = rel(clipe).replace(rel(pasta) + '/', ''); alvo.poster = rel(poster).replace(rel(pasta) + '/', ''); }
  }
  gravarJSON(arqVar, atual);
  return ok;
}

function montar() {
  const faltam = V.cenas.filter((c) => !varianteDe(c, c.escolhida));
  if (faltam.length) { console.error(`Escolha a variante destas cenas: ${faltam.map((c) => c.id).join(', ')}`); return false; }
  const sb = storyboard();
  gravarJSON(path.join(pasta, eh2D ? 'storyboard2d.json' : 'storyboard.json'), sb);
  console.log(`Storyboard final montado com ${sb.cenas.length} cenas escolhidas.`);
  return true;
}

const ok = cmd === 'validar' ? validar() : cmd === 'midia' ? midia() : cmd === 'montar' ? montar() : (console.error('comando desconhecido'), false);
process.exit(ok ? 0 : 1);
