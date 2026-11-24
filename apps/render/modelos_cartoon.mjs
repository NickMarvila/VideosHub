// Modelos de cena do Cartoon 3D: a IA escreve o "momento" (gancho, mostrar, pensa_comigo...) e quem/o quê aparece;
// aqui viram chaves de câmera, foco e posições. Regras em config/regras-camera.json, tamanhos em config/tamanhos-cartoon.json.
// Cena com "camera" própria (modo livre) passa sem mudança.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lerJSON = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, f), 'utf8'));
export const REGRAS = lerJSON('config/regras-camera.json').momentos;
const TAM = lerJSON('config/tamanhos-cartoon.json');
// figurinhas 2D (sempre de frente para a câmera); o resto é peça 3D
export const FIGURINHAS = ['dinheiro', 'moeda', 'relogio', 'celular', 'balao', 'pensamento', 'icone', 'seta'];

const ss = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * x * (x * (x * 6 - 15) + 10); };
// valor num instante: número fixo ou chaves [[t, v], ...]
export const val = (v, t, padrao = 0) => {
  if (typeof v === 'number') return v;
  if (!Array.isArray(v) || !v.length) return padrao;
  if (t <= v[0][0]) return v[0][1];
  for (let i = 1; i < v.length; i++) if (t <= v[i][0]) return v[i - 1][1] + (v[i][1] - v[i - 1][1]) * ss((t - v[i - 1][0]) / Math.max(1e-3, v[i][0] - v[i - 1][0]));
  return v.at(-1)[1];
};
const r2 = (n) => Math.round(n * 100) / 100;

// caixa de cada coisa da cena num instante: { id, centro [x,y,z], h, w, d, ator, figurinha }
export function caixas(c, t, semTempo = false) {
  const out = [];
  for (const a of c.atores || []) {
    const e = a.escala ?? 1, [h, w, d] = TAM.ator, y = val(a.y, t);
    out.push({ id: a.id, ator: true, centro: [val(a.x, t), y + (h * e) / 2, val(a.z, t)], h: h * e, w: w * e, d: d * e, pes: y, escala: e });
  }
  for (const o of c.objetos || []) {
    if (!semTempo && o.aparece != null && t < o.aparece - 0.05) continue;
    if (!semTempo && o.some != null && t >= o.some) continue;
    const e = o.escala ?? 1, fig = FIGURINHAS.includes(o.tipo);
    const [h, w, d] = TAM[o.tipo] || (fig ? TAM._figurinha : [1, 1, 1]);
    const y = val(o.y, t, fig ? 2.2 : 0);
    out.push({ id: o.id || o.tipo, figurinha: fig, centro: [val(o.x, t), fig ? y : y + (h * e) / 2, val(o.z, t)], h: h * e, w: w * e, d: d * e });
  }
  return out;
}
const uniao = (cx) => {
  if (!cx.length) return { centro: [0, 1.1, 0], h: 2.2, w: 0.9, d: 0.5 };
  const lo = [0, 1, 2].map((i) => Math.min(...cx.map((b) => b.centro[i] - [b.w, b.h, b.d][i] / 2)));
  const hi = [0, 1, 2].map((i) => Math.max(...cx.map((b) => b.centro[i] + [b.w, b.h, b.d][i] / 2)));
  return { centro: [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2), w: hi[0] - lo[0], h: hi[1] - lo[1], d: hi[2] - lo[2] };
};

// põe no lugar quem veio sem x/z: o alvo no centro, o resto atrás e dos lados; figurinhas acima do alvo
function posicionar(c, alvoId) {
  const pessoas = (c.atores || []).map((a) => ({ ref: a, id: a.id, tam: TAM.ator, e: a.escala ?? 1 }));
  const pecas = (c.objetos || []).filter((o) => !FIGURINHAS.includes(o.tipo)).map((o) => ({ ref: o, id: o.id || o.tipo, tam: TAM[o.tipo] || [1, 1, 1], e: o.escala ?? 1 }));
  const todos = [...pessoas, ...pecas];
  const alvo = todos.find((q) => q.id === alvoId) || todos[0];
  if (alvo && alvo.ref.x == null) alvo.ref.x = 0;
  if (alvo && alvo.ref.z == null) alvo.ref.z = 0;
  let i = 0;
  for (const q of todos) {
    if (q === alvo || (q.ref.x != null && q.ref.z != null)) continue;
    const lado = i % 2 ? 1 : -1, wa = alvo.tam[1] * alvo.e, wq = q.tam[1] * q.e;
    q.ref.x ??= r2(val(alvo.ref.x, 0) + lado * (wa / 2 + wq / 2) * 0.75);
    q.ref.z ??= r2(val(alvo.ref.z, 0) - 0.7 - 0.6 * Math.floor(i / 2));
    i++;
  }
  // figurinhas sem lugar: acima do alvo (ou do primeiro que existir), espalhadas se forem várias
  const base = alvo ? { x: val(alvo.ref.x, c.inicio), z: val(alvo.ref.z, c.inicio), topo: alvo.tam[0] * alvo.e } : { x: 0, z: 0, topo: 2.2 };
  let j = 0;
  for (const o of c.objetos || []) {
    if (!FIGURINHAS.includes(o.tipo) || (o.x != null && o.z != null)) continue;
    o.x ??= r2(base.x + (j % 2 ? 0.45 : -0.45) * Math.ceil(j / 2));
    o.z ??= r2(base.z + 0.3);
    o.y ??= r2(base.topo + 0.55);
    j++;
  }
}

// distância que enquadra uma caixa inteira com folga, no quadro vertical 9:16
function distancia(b, fov) {
  const tv = Math.tan((fov / 2) * Math.PI / 180), th = tv * 0.5625;
  return Math.max((b.h * 1.3) / (2 * tv), (b.w * 1.35) / (2 * th)) + b.d / 2;
}

export function expandirCena(cena, indice = 0) {
  if (!cena.momento || cena.camera?.length) return cena;
  const regra = REGRAS[cena.momento];
  if (!regra) return cena; // o validador acusa o momento desconhecido
  const c = structuredClone(cena);
  const dur = c.fim - c.inicio;
  const alvoId = c.alvo || c.atores?.[0]?.id || c.objetos?.find((o) => !FIGURINHAS.includes(o.tipo))?.tipo;
  posicionar(c, alvoId);

  const mira = (tipo, t, falante) => {
    // o alvo é enquadrado mesmo antes de aparecer; 'todos' = o que está visível (ou surge nos próximos 0,3 s)
    const cx = caixas(c, t, true);
    const achar = (id) => cx.find((b) => b.id === id);
    if (tipo === 'todos') return uniao(caixas(c, t + 0.3).filter((b) => !b.figurinha));
    const b = achar(tipo === 'falante' ? falante : alvoId) || achar(alvoId) || uniao(cx);
    if (tipo === 'rosto') {
      if (b.ator) { const e = b.escala; return { centro: [b.centro[0], b.pes + 1.5 * e, b.centro[2]], h: 1.2 * e, w: 0.8 * e, d: 0.5 * e }; }
      return { ...b, h: b.h * 0.7, w: b.w * 0.7 };
    }
    return b;
  };
  const revela = () => {
    // o que é revelado: a 1ª peça 3D que surge (figurinhas só se não houver peça)
    const surgem = (c.objetos || []).filter((o) => (o.id || o.tipo) !== alvoId && o.aparece > c.inicio + 0.1);
    const ts = (surgem.some((o) => !FIGURINHAS.includes(o.tipo)) ? surgem.filter((o) => !FIGURINHAS.includes(o.tipo)) : surgem).map((o) => o.aparece);
    return ts.length ? Math.min(...ts) : c.inicio + dur * 0.35;
  };
  const quando = (k) => {
    let t = k.s != null ? c.inicio + k.s : k.u != null ? c.inicio + k.u * dur : c.inicio;
    if (k.em === 'revela') t = revela() + (k.mais || 0);
    return Math.min(c.fim, Math.max(c.inicio, t));
  };

  // chaves da regra (ou geradas pelo diálogo)
  let chaves = regra.chaves;
  if (chaves === 'alternar') {
    const ids = (c.atores || []).map((a) => a.id);
    const falas = c.falas?.length ? c.falas : [[c.inicio, ids[0]], [c.inicio + dur / 2, ids[1] || ids[0]]];
    chaves = [];
    falas.forEach(([t, id], i) => {
      if (i === 0) chaves.push({ s: 0, mira: 'falante', falante: id, dist: regra.dist });
      else {
        chaves.push({ s: t - c.inicio, mira: 'falante', falante: falas[i - 1][1], dist: regra.dist * 0.92 });
        chaves.push({ s: t - c.inicio + 0.5, mira: 'falante', falante: id, dist: regra.dist });
      }
    });
    chaves.push({ u: 1, mira: 'falante', falante: falas.at(-1)[1], dist: regra.dist * 0.9 });
  }
  const extraDist = (regra.distPorBatida || 0) * ((c.batida || 1) - 1);
  const lado = c.lado ?? (indice % 2 ? 0.6 : -0.6);
  const vila = (c.cenario || 'vila') === 'vila';
  let ultimoT = -1;
  c.camera = chaves.map((k) => {
    let t = quando(k);
    if (t <= ultimoT) t = ultimoT + 0.02;
    ultimoT = t;
    const b = mira(k.mira || 'alvo', t, k.falante);
    let fov = k.fov ?? 40;
    const D = distancia(b, fov) * Math.max(0.3, (k.dist ?? 1) + extraDist);
    const dir = [(k.lado ?? lado) * 0.35, k.alto ?? 0.08, 1];
    const n = Math.hypot(...dir);
    const olha = [b.centro[0], b.centro[1] + b.h * 0.08, b.centro[2]];
    let pos = olha.map((q, i) => q + (dir[i] / n) * D);
    // na vila a câmera fica dentro da rua (|z| < 6,8): chega mais perto e abre a lente para caber o mesmo
    if (vila && pos[2] > 6.8 && pos[1] < 12) {
      const D2 = Math.max(1, (6.8 - olha[2]) / (dir[2] / n));
      fov = Math.min(70, 2 * Math.atan(Math.tan((fov / 2) * Math.PI / 180) * D / D2) * 180 / Math.PI);
      pos = olha.map((q, i) => q + (dir[i] / n) * D2);
    }
    pos[1] = Math.max(0.4, pos[1]);
    return { t: r2(t), pos: pos.map(r2), olha: olha.map(r2), fov: r2(fov), ...(k.roll ? { roll: k.roll } : {}) };
  });

  if (!c.foco) {
    const D = Math.hypot(...[0, 1, 2].map((i) => c.camera[0].pos[i] - c.camera[0].olha[i]));
    const desfoque = regra.desfoque ?? (D < 3 ? 14 : D < 6 ? 11 : 0);
    const alvoAtor = (c.atores || []).some((a) => a.id === alvoId);
    c.foco = { desfoque, alvo: alvoAtor ? alvoId : c.camera[0].olha };
  }
  trazerFigurinhas(c);
  c.alvo = alvoId;
  c._cabe = regra.cabe || 'alvo'; // para o validador: o que precisa caber no quadro
  return c;
}

// câmera num instante (mesmo deslize do motor: smootherstep entre chaves)
export function cameraEm(c, t) {
  const ks = c.camera || [];
  let a = ks[0], b = ks[0], u = 0;
  for (let i = 0; i < ks.length; i++) if (t >= ks[i].t) { a = ks[i]; b = ks[i + 1] || ks[i]; u = b === a ? 0 : (t - a.t) / Math.max(1e-3, b.t - a.t); }
  u = ss(u);
  const L = (x, y) => x.map((q, i) => q + (y[i] - q) * u);
  return { pos: L(a.pos, b.pos), olha: L(a.olha, b.olha), fov: (a.fov ?? 40) + ((b.fov ?? a.fov ?? 40) - (a.fov ?? 40)) * u };
}

// figurinhas (?, !, balão...) são a mensagem da cena: se saem do quadro, puxa para dentro, na mesma profundidade
function trazerFigurinhas(c) {
  for (const o of c.objetos || []) {
    if (!FIGURINHAS.includes(o.tipo) || [o.x, o.y, o.z].some((v) => Array.isArray(v))) continue;
    const de = Math.max(c.inicio, o.aparece ?? c.inicio), ate = Math.min(c.fim, o.some ?? c.fim);
    for (const t of [de + 0.3, (de + ate) / 2, ate - 0.1]) {
      const k = cameraEm(c, Math.min(ate, t));
      const f = norm(sub(k.olha, k.pos)), rt = norm(cross(f, [0, 1, 0])), up = cross(rt, f);
      const meia = 0.5 * (TAM._figurinha[0] * (o.escala ?? 1));
      const p = sub([o.x ?? 0, o.y ?? 2.2, o.z ?? 0], k.pos);
      let x = dot(p, rt), y = dot(p, up); const z = Math.max(0.8, dot(p, f));
      const tv = Math.tan((k.fov / 2) * Math.PI / 180);
      const mx = Math.max(0, z * tv * 0.5625 * 0.85 - meia), my = Math.max(0, z * tv * 0.85 - meia);
      if (Math.abs(x) <= mx && Math.abs(y) <= my) continue;
      x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y));
      const w = [0, 1, 2].map((i) => k.pos[i] + rt[i] * x + up[i] * y + f[i] * z);
      [o.x, o.y, o.z] = w.map(r2);
    }
  }
}
const sub = (a, b) => a.map((q, i) => q - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const n = Math.hypot(...a) || 1; return a.map((q) => q / n); };

export const expandirStoryboard = (sb) => ({ ...sb, cenas: (sb.cenas || []).map((c, i) => expandirCena(c, i)) });
