// Biblioteca de assets do VideosHub: personagens (2D + 3D), objetos (2D + 3D) e cenários (2D).
// Uso (da raiz do VideosHub):
//   node pipeline/biblioteca.mjs miniaturas [tipo/slug ...]   miniaturas do que já existe (sem argumentos = o que falta)
//   node pipeline/biblioteca.mjs opcoes <pedido>              miniaturas das opções que a IA criou num pedido
//   node pipeline/biblioteca.mjs publicar <pedido> <n>        publica a opção n do pedido na biblioteca
//   node pipeline/biblioteca.mjs validar <pedido>             confere os arquivos das opções (a IA roda antes de devolver)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.join(RAIZ, 'Kit_Video_3d');
const BIB = path.join(RAIZ, 'biblioteca');
const MINI = path.join(BIB, 'miniaturas');
const HUB3D = path.join(KIT, 'assets', 'scenery', 'hub');
const OBJ2D = ['parati', 'dinheiro', 'moeda', 'relogio', 'celular', 'caixa_som', 'skate', 'pneu', 'balao', 'pensamento', 'seta', 'icone', 'placa'];
const CEN2D = ['rua_dia', 'rua_noite', 'mercado', 'sala', 'estrada'];
const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');
const lerJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const gravarJSON = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); };
const limparSvg = (s) => s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const slugValido = (s) => /^[a-z0-9][a-z0-9_]{1,40}$/.test(s);

// ---------- desenhos de vitrine ----------
const sb2dPersonagem = (slug, visual) => ({ duracao: 1, personagens: { [slug]: visual }, legenda: {},
  cenas: [{ inicio: 0, fim: 1, cenario: 'rua_dia', zoom: [1.05, 1.05], foco: [540, 1150], atores: [{ id: slug, x: 540, entra: 'nenhum', expressoes: [[0, 'feliz']] }] }] });
const sb2dObjeto = (tipo, svg) => ({ duracao: 1, personagens: {}, legenda: {}, extras: svg ? { objetos: { [tipo]: limparSvg(svg) } } : undefined,
  cenas: [{ inicio: 0, fim: 1, cenario: 'sala', zoom: [1, 1], objetos: [{ tipo, x: 540, y: 1050, escala: 3.2, texto: tipo === 'balao' || tipo === 'pensamento' || tipo === 'placa' ? 'OLÁ' : undefined }] }] });
const sb2dCenario = (slug, svg) => ({ duracao: 1, personagens: {}, legenda: {}, extras: svg ? { cenarios: { [slug]: limparSvg(svg) } } : undefined,
  cenas: [{ inicio: 0, fim: 1, cenario: slug, zoom: [1, 1] }] });
const sb3d = (personagens, objetos) => ({ versao: 1, titulo: 'vitrine', formato: { largura: 1080, altura: 1920, fps: 30 }, duracao: 1,
  legendas: { ativo: false }, ambiente: { horario: 'dia', fundo: 'campo', chao: 'grama' },
  cenas: [{ inicio: 0, fim: 1, objetos, personagens,
    camera: { tipo: 'enquadrar', alvo: personagens[0]?.id || objetos[0]?.id, plano: personagens.length ? 'medio' : 'geral', angulo: 25, elevacao: 12 } }] });

function render2d(itens) { // itens: [{ storyboard, saida }]
  if (!itens.length) return true;
  const lote = path.join(BIB, '_lote.json');
  gravarJSON(lote, { itens: itens.map((i) => ({ tipo: 'poster', storyboard: i.storyboard, t: 0.5, saida: rel(i.saida) })) });
  const r = spawnSync('node', ['apps/render/render2d.mjs', 'biblioteca', '--lote', rel(lote)], { cwd: RAIZ, stdio: 'inherit' });
  fs.rmSync(lote, { force: true });
  return r.status === 0;
}
function render3d(nome, storyboard, saida) {
  const dir = path.join(KIT, 'projects', '_biblioteca', nome);
  gravarJSON(path.join(dir, 'storyboard.json'), storyboard);
  const r = spawnSync('node', ['tools/render.mjs', `projects/_biblioteca/${nome}`, '--capa', '0.5'], { cwd: KIT, encoding: 'utf8' });
  const capa = path.join(dir, 'render', 'capa.png');
  if (r.status === 0 && fs.existsSync(capa)) { fs.mkdirSync(path.dirname(saida), { recursive: true }); fs.copyFileSync(capa, saida); }
  else console.log(`✗ 3D ${nome}: ${(r.stdout + r.stderr).trim().split('\n').slice(-2).join(' ')}`);
  fs.rmSync(dir, { recursive: true, force: true });
  return r.status === 0;
}
const personagem3d = (slug, kit3d) => ({ id: slug, preset: kit3d.preset || 'homem', overrides: kit3d.overrides || {}, pos: [0, 0, 0], giro: 0,
  viraPara: [{ em: 0, alvo: 'camera' }], acoes: [{ clip: 'wave', de: 0, ate: 1, expressao: 'happy' }] });

// ---------- assets 3D do hub (módulos registrados no kit) ----------
function regerarIndice3D() {
  fs.mkdirSync(HUB3D, { recursive: true });
  const mods = fs.readdirSync(HUB3D).filter((f) => f.endsWith('.js') && f !== 'index.js').sort();
  fs.writeFileSync(path.join(HUB3D, 'index.js'), `// Gerado por pipeline/biblioteca.mjs: assets 3D criados no VideosHub.\n${mods.map((m) => `import './${m}';`).join('\n')}\n`);
  const idx = path.join(KIT, 'assets', 'scenery', 'index.js');
  const s = fs.readFileSync(idx, 'utf8');
  if (!s.includes("import './hub/index.js';")) fs.writeFileSync(idx, s.replace("import './generico.js';", "import './generico.js';\nimport './hub/index.js';"));
}
function codigo3D(arq, id) { // o código da IA usa __ID__ no lugar do id do asset
  return fs.readFileSync(arq, 'utf8').replaceAll('__ID__', id);
}

// ---------- itens da biblioteca ----------
function itens() {
  const lista = [];
  const pdir = path.join(RAIZ, 'personagens');
  for (const slug of fs.readdirSync(pdir)) {
    const f = path.join(pdir, slug, 'personagem.json');
    if (!slug.startsWith('_') && fs.existsSync(f)) lista.push({ tipo: 'personagem', slug, dados: lerJSON(f) });
  }
  for (const slug of OBJ2D) lista.push({ tipo: 'objeto', slug, nativo: true });
  const o2 = path.join(RAIZ, 'assets2d', 'objetos');
  if (fs.existsSync(o2)) for (const f of fs.readdirSync(o2).filter((x) => x.endsWith('.svg'))) lista.push({ tipo: 'objeto', slug: f.slice(0, -4), svg: fs.readFileSync(path.join(o2, f), 'utf8'), tem3d: fs.existsSync(path.join(HUB3D, `${f.slice(0, -4)}.js`)) });
  for (const slug of CEN2D) lista.push({ tipo: 'cenario', slug, nativo: true });
  const c2 = path.join(RAIZ, 'assets2d', 'cenarios');
  if (fs.existsSync(c2)) for (const f of fs.readdirSync(c2).filter((x) => x.endsWith('.svg'))) lista.push({ tipo: 'cenario', slug: f.slice(0, -4), svg: fs.readFileSync(path.join(c2, f), 'utf8') });
  return lista;
}
function miniaturas(filtro) {
  const lote = []; const tres = [];
  for (const it of itens()) {
    const chave = `${it.tipo}/${it.slug}`;
    if (filtro.length && !filtro.includes(chave)) continue;
    const m2 = path.join(MINI, `${it.tipo}-${it.slug}-2d.png`); const m3 = path.join(MINI, `${it.tipo}-${it.slug}-3d.png`);
    const falta = (f) => filtro.length || !fs.existsSync(f);
    if (it.tipo === 'personagem') {
      if (it.dados.rig2d && falta(m2)) lote.push({ storyboard: sb2dPersonagem(it.slug, it.dados.rig2d), saida: m2 });
      if (it.dados.kit3d && falta(m3)) tres.push([`p-${it.slug}`, sb3d([personagem3d(it.slug, it.dados.kit3d)], []), m3]);
    } else if (it.tipo === 'objeto') {
      if (falta(m2)) lote.push({ storyboard: sb2dObjeto(it.slug, it.svg), saida: m2 });
      if (it.tem3d && falta(m3)) tres.push([`o-${it.slug}`, sb3d([], [{ id: 'obj', asset: it.slug, pos: [0, 0, 0] }]), m3]);
    } else if (falta(m2)) lote.push({ storyboard: sb2dCenario(it.slug, it.svg), saida: m2 });
  }
  console.log(`${lote.length} miniatura(s) 2D e ${tres.length} 3D`);
  let ok = render2d(lote);
  tres.forEach(([nome, sb, saida], i) => { ok = render3d(nome, sb, saida) && ok; console.log(`Quadro ${i + 1}/${tres.length}  (${Math.round(((i + 1) / tres.length) * 100)}%)  3D ${nome}`); });
  return ok;
}

// ---------- pedidos de criação ----------
const dirPedido = (id) => path.join(BIB, 'pedidos', id);
function opcoesDe(id) {
  const base = path.join(dirPedido(id), 'opcoes');
  return fs.existsSync(base) ? fs.readdirSync(base).filter((n) => /^\d+$/.test(n)).sort((a, b) => a - b).map((n) => ({ n, dir: path.join(base, n) })) : [];
}
function validarPedido(id) {
  const p = lerJSON(path.join(dirPedido(id), 'pedido.json'));
  const ops = opcoesDe(id); let ok = true;
  const erro = (m) => { console.log(`✗ ${m}`); ok = false; };
  if (ops.length < 1) erro('nenhuma opção em opcoes/<n>/');
  for (const { n, dir } of ops) {
    if (p.tipo === 'personagem') {
      const f = path.join(dir, 'personagem.json');
      if (!fs.existsSync(f)) { erro(`opção ${n}: falta personagem.json`); continue; }
      const d = lerJSON(f);
      if (!slugValido(d.slug || '')) erro(`opção ${n}: slug inválido (use letras minúsculas, números e _)`);
      if (!d.rig2d?.pele || !d.rig2d?.camisa || !d.rig2d?.chapeu) erro(`opção ${n}: rig2d incompleto (pele, camisa, calca, sapato, olhos, chapeu...)`);
      if (!d.kit3d?.preset) erro(`opção ${n}: kit3d.preset faltando`);
    } else if (p.tipo === 'objeto') {
      if (!fs.existsSync(path.join(dir, 'objeto2d.svg'))) erro(`opção ${n}: falta objeto2d.svg`);
      const js = path.join(dir, 'objeto3d.js');
      if (fs.existsSync(js) && !fs.readFileSync(js, 'utf8').includes("register('__ID__'")) erro(`opção ${n}: objeto3d.js precisa usar register('__ID__', ...)`);
    } else if (!fs.existsSync(path.join(dir, 'cenario2d.svg'))) erro(`opção ${n}: falta cenario2d.svg`);
  }
  if (ok && p.tipo === 'objeto') { // testa o 3D carregando no kit
    for (const { n, dir } of ops) {
      const js = path.join(dir, 'objeto3d.js'); if (!fs.existsSync(js)) continue;
      const tmp = path.join(HUB3D, `_teste_${id}_${n}.js`);
      fs.mkdirSync(HUB3D, { recursive: true }); fs.writeFileSync(tmp, codigo3D(js, `teste_${n}`)); regerarIndice3D();
      const r = spawnSync('node', ['-e', "import('./assets/scenery/index.js').then((m)=>{const g=m.makeScenery(process.argv[1]);console.log('ok',g.children.length)})", `teste_${n}`], { cwd: KIT, encoding: 'utf8' });
      fs.rmSync(tmp, { force: true }); regerarIndice3D();
      if (r.status !== 0) erro(`opção ${n}: o 3D não carregou: ${(r.stderr || '').trim().split('\n').slice(-2).join(' ')}`);
    }
  }
  console.log(ok ? 'Opções OK.' : 'Corrija os erros acima.');
  return ok;
}
function renderOpcoes(id) {
  const p = lerJSON(path.join(dirPedido(id), 'pedido.json'));
  const lote = []; const tres = [];
  for (const { n, dir } of opcoesDe(id)) {
    const m2 = path.join(dir, 'mini-2d.png'); const m3 = path.join(dir, 'mini-3d.png');
    if (p.tipo === 'personagem') {
      const d = lerJSON(path.join(dir, 'personagem.json'));
      lote.push({ storyboard: sb2dPersonagem(d.slug, d.rig2d), saida: m2 });
      tres.push([`op-${id}-${n}`, sb3d([personagem3d(d.slug, d.kit3d)], []), m3, null]);
    } else if (p.tipo === 'objeto') {
      lote.push({ storyboard: sb2dObjeto(`op_${n}`, fs.readFileSync(path.join(dir, 'objeto2d.svg'), 'utf8')), saida: m2 });
      const js = path.join(dir, 'objeto3d.js');
      if (fs.existsSync(js)) tres.push([`op-${id}-${n}`, sb3d([], [{ id: 'obj', asset: `op_${id}_${n}`.replace(/-/g, '_'), pos: [0, 0, 0] }]), m3, js]);
    } else lote.push({ storyboard: sb2dCenario(`op_${n}`, fs.readFileSync(path.join(dir, 'cenario2d.svg'), 'utf8')), saida: m2 });
  }
  let ok = render2d(lote);
  tres.forEach(([nome, sb, saida, js], i) => {
    let tmp = null;
    if (js) { tmp = path.join(HUB3D, `_${nome}.js`); fs.mkdirSync(HUB3D, { recursive: true }); fs.writeFileSync(tmp, codigo3D(js, sb.cenas[0].objetos[0].asset)); regerarIndice3D(); }
    ok = render3d(nome, sb, saida) && ok;
    if (tmp) { fs.rmSync(tmp, { force: true }); regerarIndice3D(); }
    console.log(`Quadro ${i + 1}/${tres.length}  (${Math.round(((i + 1) / tres.length) * 100)}%)  3D opção ${i + 1}`);
  });
  return ok;
}
function publicar(id, n) {
  const p = lerJSON(path.join(dirPedido(id), 'pedido.json'));
  const dir = path.join(dirPedido(id), 'opcoes', String(n));
  if (!fs.existsSync(dir)) { console.error(`Opção ${n} não existe.`); return false; }
  let slug = p.slug;
  if (p.tipo === 'personagem') {
    const d = lerJSON(path.join(dir, 'personagem.json'));
    slug = d.slug;
    if (fs.existsSync(path.join(RAIZ, 'personagens', slug))) { console.error(`Já existe um personagem "${slug}".`); return false; }
    gravarJSON(path.join(RAIZ, 'personagens', slug, 'personagem.json'), { ...d, criadoEm: new Date().toISOString(), pedido: id });
  } else if (p.tipo === 'objeto') {
    if (!slugValido(slug || '')) { console.error('O pedido não tem um slug válido.'); return false; }
    fs.mkdirSync(path.join(RAIZ, 'assets2d', 'objetos'), { recursive: true });
    fs.copyFileSync(path.join(dir, 'objeto2d.svg'), path.join(RAIZ, 'assets2d', 'objetos', `${slug}.svg`));
    const js = path.join(dir, 'objeto3d.js');
    if (fs.existsSync(js)) {
      fs.mkdirSync(HUB3D, { recursive: true }); fs.writeFileSync(path.join(HUB3D, `${slug}.js`), codigo3D(js, slug)); regerarIndice3D();
      spawnSync('node', ['tools/build-catalog.mjs'], { cwd: KIT, stdio: 'inherit' }); // atualiza o catálogo que a IA lê
    }
  } else {
    if (!slugValido(slug || '')) { console.error('O pedido não tem um slug válido.'); return false; }
    fs.mkdirSync(path.join(RAIZ, 'assets2d', 'cenarios'), { recursive: true });
    fs.copyFileSync(path.join(dir, 'cenario2d.svg'), path.join(RAIZ, 'assets2d', 'cenarios', `${slug}.svg`));
  }
  gravarJSON(path.join(dirPedido(id), 'pedido.json'), { ...p, slug, escolhida: String(n), estado: 'concluido', publicadoEm: new Date().toISOString() });
  console.log(`Publicado: ${p.tipo}/${slug}`);
  return miniaturas([`${p.tipo}/${slug}`]);
}

// ---------- vitrine do Kit 3D: miniatura de cada personagem pronto e de cada peça de cenário ----------
function kit3d() {
  spawnSync('node', ['tools/build-catalog.mjs'], { cwd: KIT, stdio: 'ignore' }); // inclui as peças do hub
  const cat = lerJSON(path.join(KIT, 'catalog', 'catalog.json'));
  const itensKit = [
    ...cat.characters.map((c) => ({ tipo: 'personagem', id: c.id, label: c.id, descricao: c.role, categoria: 'personagens' })),
    ...cat.scenery.map((s) => ({ tipo: 'cenario', id: s.id, label: s.label, descricao: s.description, categoria: s.category, tamanho: s.sizeM })),
  ];
  const cenas = itensKit.map((it, i) => {
    const ini = i; const fim = i + 1;
    if (it.tipo === 'personagem') {
      return { inicio: ini, fim, objetos: [], camera: { tipo: 'enquadrar', alvo: 'p', plano: 'medio', angulo: 20, elevacao: 8 },
        personagens: [{ id: 'p', preset: it.id, pos: [0, 0, 0], giro: 0, viraPara: [{ em: ini, alvo: 'camera' }], acoes: [{ clip: 'wave', de: ini, ate: fim, expressao: 'happy' }] }] };
    }
    return { inicio: ini, fim, personagens: [], objetos: [{ id: 'o', asset: it.id, pos: [0, 0, 0] }],
      camera: { tipo: 'enquadrar', alvo: 'o', plano: 'geral', angulo: 30, elevacao: 18 } };
  });
  const nome = '_vitrine';
  const dir = path.join(KIT, 'projects', '_biblioteca', nome);
  gravarJSON(path.join(dir, 'storyboard.json'), { versao: 1, titulo: 'vitrine do kit', formato: { largura: 1080, altura: 1920, fps: 30 },
    duracao: itensKit.length, legendas: { ativo: false }, ambiente: { horario: 'dia', fundo: 'campo', chao: 'grama' }, cenas });
  console.log(`Desenhando ${itensKit.length} itens do kit 3D...`);
  const r = spawnSync('node', ['tools/render.mjs', `projects/_biblioteca/${nome}`, '--quadros'], { cwd: KIT, stdio: 'inherit' });
  if (r.status !== 0) return false;
  fs.mkdirSync(MINI, { recursive: true });
  itensKit.forEach((it, i) => {
    const q = path.join(dir, 'render', 'quadros', `cena${String(i + 1).padStart(2, '0')}_meio.png`);
    if (fs.existsSync(q)) fs.copyFileSync(q, path.join(MINI, `kit-${it.tipo}-${it.id}.png`));
  });
  gravarJSON(path.join(BIB, 'kit3d.json'), { geradoEm: new Date().toISOString(), itens: itensKit });
  fs.rmSync(path.join(KIT, 'projects', '_biblioteca'), { recursive: true, force: true });
  console.log(`${itensKit.length} miniaturas do kit 3D prontas.`);
  return true;
}

const [cmd, ...resto] = process.argv.slice(2);
if (cmd === 'kit3d') process.exit(kit3d() ? 0 : 1);
const ok = cmd === 'miniaturas' ? miniaturas(resto) : cmd === 'opcoes' ? renderOpcoes(resto[0]) : cmd === 'publicar' ? publicar(resto[0], resto[1])
  : cmd === 'validar' ? validarPedido(resto[0]) : (console.error('Uso: miniaturas | opcoes <pedido> | publicar <pedido> <n> | validar <pedido>'), false);
process.exit(ok ? 0 : 1);
