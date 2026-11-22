// gera videos/<id>/cenas/variantes.json do vídeo dos emus (cartoon 3D, fluxo 2)
import fs from 'node:fs';
import path from 'node:path';
const pasta = process.argv[2];
const r2 = (n) => Math.round(n * 100) / 100;
const D = 46.56;
const zz = (t0, t1, x0, z0, x1, z1, amp, n) => {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, px = -dz / L, pz = dx / L;
  const X = [], Z = [];
  for (let i = 0; i <= n; i++) { const u = i / n, s = i === 0 || i === n ? 0 : (i % 2 ? amp : -amp);
    X.push([r2(t0 + (t1 - t0) * u), r2(x0 + dx * u + px * s)]); Z.push([r2(t0 + (t1 - t0) * u), r2(z0 + dz * u + pz * s)]); }
  return { x: X, z: Z };
};
const pula = (t0, t1, passo, amp, base = 0) => { const k = []; let i = 0; for (let t = t0; t <= t1 + 1e-6; t += passo, i++) k.push([r2(t), r2(base + (i % 2 ? amp * (0.6 + 0.4 * ((i * 7) % 3) / 2) : 0))]); return k; };
const somar = (keys, d) => keys.map(([t, v]) => [t, r2(v + d)]);
const trigo = (pts) => pts.map(([x, z, e = 1]) => ({ tipo: 'plantacao_de_trigo', x, z, escala: e }));
const lavoura = (x0, x1, z0, z1, passo = 1.1) => { const p = []; let i = 0; for (let z = z0; z <= z1; z += passo) for (let x = x0; x <= x1; x += passo, i++) p.push([r2(x + ((i * 0.37) % 0.5)), r2(z + ((i * 0.53) % 0.4)), 0.9 + (i % 3) * 0.1]); return trigo(p); };
const emu = (x, z, o = {}) => ({ id: 'emu', x, z, ...o });
const cam = (t, pos, olha, fov, roll) => ({ t, pos, olha, ...(fov ? { fov } : {}), ...(roll ? { roll } : {}) });

const cenas = [];
const C = (id, inicio, fim, frases, resumo, a, b) => cenas.push({ id, inicio, fim, frases, resumo,
  variantes: [{ id: `${id}-a`, descricao: a[0], recomendada: true, cena: a[1] }, { id: `${id}-b`, descricao: b[0], recomendada: false, cena: b[1] }], escolhida: null, ajustes: [] });

// c01 · f01: o exército contra pássaros
C('c01', 0, 5.47, ['f01'], 'O exército marcha para a guerra contra pássaros', [
  'Geral no campo: a tropa marcha pela trilha, toda séria, e em "pássaros" um emu entra correndo na frente dela',
  { cenario: 'campo', luz: 'dia', camera: [cam(0, [-2, 3, 11], [-0.5, 1.3, 0]), cam(3.2, [0, 2.2, 7.5], [0, 1.3, 0.5])], foco: { desfoque: 6, alvo: 'major_meredith' },
    atores: [
      { id: 'major_meredith', x: [[0, -3.2], [3.6, -0.6]], z: 0, expressoes: [[0, 'serio'], [2.8, 'sorriso_fechado'], [4.3, 'choque']] },
      { id: 'soldado', x: [[0, -4.6], [3.6, -1.9]], z: -1.4, expressoes: [[0, 'serio'], [4.3, 'choque']] },
      { id: 'soldado', x: [[0, -5.6], [3.6, -2.9]], z: -2.4, expressoes: [[0, 'serio'], [4.4, 'nervoso']] },
      emu([[3.9, 6], [4.6, 1.1]], 1.6, { expressoes: [[0, 'sorrisao']], olhar: -1 }) ],
    objetos: [...lavoura(2.5, 7, -6, -2), { tipo: 'icone', icone: '!', x: -0.6, y: 2.9, z: 0, escala: 0.45, aparece: 4.3 }] } ], [
  'Close num emu bicando o trigo; a câmera recua e revela a tropa chegando ao fundo, e o emu leva um susto',
  { cenario: 'campo', luz: 'dia', camera: [cam(0, [0, 1.6, 3.4], [0, 1.4, 0.8], 38), cam(3.0, [1.4, 2.6, 9], [-1, 1.2, -1])], foco: { desfoque: 12, alvo: 'emu' },
    atores: [ emu(0, 0.8, { expressoes: [[0, 'sorriso'], [4.2, 'choque']], olhar: [[0, 0], [4.1, -1]] }),
      { id: 'major_meredith', x: [[0, -6], [4.5, -2.4]], z: -2.2, expressoes: [[0, 'serio']] },
      { id: 'soldado', x: [[0, -7.2], [4.5, -3.6]], z: -3.2, expressoes: [[0, 'serio']] },
      { id: 'soldado', x: [[0, -8.2], [4.5, -4.6]], z: -4.0, expressoes: [[0, 'serio']] } ],
    objetos: [...trigo([[0.6, 1.2], [-0.6, 1.4], [1.3, 0.2], [-1.1, 0.3], [0.4, -0.8], [2, -1.2]])], efeitos: [{ tipo: 'estrelas', de: 4.25, ate: 5.4, pos: [0, 2.3, 0.8], tamanho: 0.6 }] } ]);

// c02 · f02: E perdeu.
C('c02', 5.47, 6.9, ['f02'], 'E perdeu', [
  'Close no major: a cara de choque vira decepção e ele cai sentado, enquanto um emu pula de alegria atrás',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(5.47, [0, 1.5, 4.4], [0, 1.2, 0], 40, 4), cam(6.8, [0.2, 1.4, 3.8], [0, 1.1, 0], 40, 4)], foco: { desfoque: 12, alvo: 'major_meredith' },
    atores: [ { id: 'major_meredith', x: -0.2, z: 0, expressoes: [[5.47, 'choque'], [5.85, 'decepcao']], acoes: [[5.5, 'parado'], [5.8, 'cai']] },
      emu(0.9, -2.6, { expressoes: [[5.47, 'riso']], acoes: [[5.6, 'pulo']] }) ],
    objetos: trigo([[1.8, -3.4], [-1.5, -3], [0.2, -4]]) } ], [
  'Close no emu comemorando aos pulos, com estrelinhas, e o major desolado, de braços abertos, ao fundo',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(5.47, [0, 1.7, 3.6], [0, 1.6, 0.6], 38), cam(6.8, [0.3, 1.6, 3.2], [0, 1.5, 0.6], 38, -3)], foco: { desfoque: 12, alvo: 'emu' },
    atores: [ emu(0, 0.6, { expressoes: [[5.47, 'sorrisao'], [5.9, 'riso']], acoes: [[5.55, 'pulo']] }),
      { id: 'major_meredith', x: 0.9, z: -2.4, expressoes: [[5.47, 'decepcao']], acoes: [[5.6, 'abre']] } ],
    efeitos: [{ tipo: 'estrelas', de: 5.6, ate: 6.9, pos: [0, 2.6, 0.6], tamanho: 0.8 }] } ]);

// c03 · f03: vinte mil emus comendo o trigo
const bando = [[-4, -1], [-2.5, -3], [-1, 0.5], [0.6, -2], [2, 0], [3.4, -2.6], [-3, 1.8], [1.2, 2], [4.2, 1], [-0.2, -4.2], [2.6, -4.6], [-4.6, -4]];
C('c03', 6.9, 10.56, ['f03'], 'Vinte mil emus comendo o trigo', [
  'Geral: a lavoura de trigo tomada por um bando de emus comendo; balão "20 MIL EMUS!"',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(6.9, [-5, 6.5, 14], [0, 0.6, -1]), cam(10.4, [-2.5, 4.5, 10.5], [0, 0.8, -1])], foco: { desfoque: 0 },
    atores: bando.map(([x, z], i) => emu(x, z, { expressoes: [[6.9, i % 3 ? 'sorriso' : 'sorrisao']], ...(i % 4 === 1 ? { acoes: [[8.1 + i * 0.05, 'pulo']] } : {}) })),
    objetos: [...lavoura(-6, 6, -6, 3, 1.25), { tipo: 'balao', texto: '20 MIL EMUS!', x: 0, y: 3.6, z: 0, escala: 1.4, aparece: 7.1 }] } ], [
  'Close em dois emus mastigando o trigo, satisfeitos; balão "NHAC NHAC!" na hora do "comendo"',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(6.9, [-0.3, 1.7, 3.8], [0, 1.4, 0], 38), cam(10.4, [0.4, 1.6, 3.2], [0.1, 1.4, 0], 38)], foco: { desfoque: 13, alvo: 'emu' },
    atores: [ emu(-0.2, 0, { expressoes: [[6.9, 'sorriso'], [8.1, 'sorrisao']], olhar: 0.6 }), emu(1.1, -2, { expressoes: [[6.9, 'riso']], olhar: -0.5, acoes: [[9.2, 'pulo']] }) ],
    objetos: [...trigo([[0.5, 0.7], [-0.8, 0.6], [0.9, -0.6], [-1.2, -0.8], [1.9, -2.6], [0.2, -2.6], [-1.8, -2.2]]), { tipo: 'balao', texto: 'NHAC NHAC!', x: -0.6, y: 2.5, z: 0, escala: 0.6, aparece: 8.05 }] } ]);

// c04 · f04: um major, dois soldados e duas metralhadoras
C('c04', 10.56, 14.67, ['f04'], 'O exército manda o major, dois soldados e duas metralhadoras', [
  'A câmera desliza pela tropa perfilada e mostra cada um na hora em que é citado: o major, os dois soldados e as duas metralhadoras',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(10.56, [-0.4, 1.7, 5], [-0.4, 1.5, 1.5]), cam(12.2, [0.9, 1.8, 6], [1.3, 1.3, -0.5]), cam(13.4, [0.4, 2.4, 9], [0.6, 0.9, -0.3])], foco: { desfoque: 8, alvo: [0.4, 1.4, 0] },
    atores: [ { id: 'major_meredith', x: -0.4, z: 1.5, expressoes: [[10.56, 'sorriso_fechado'], [13.3, 'sorrisao']], acoes: [[11.55, 'maos_cintura'], [13.3, 'aponta']] },
      { id: 'soldado', x: 1.0, z: -0.4, expressoes: [[10.56, 'serio'], [12.4, 'sorriso']], acoes: [[12.4, 'acena']] },
      { id: 'soldado', x: 2.0, z: -1.1, expressoes: [[10.56, 'serio'], [12.6, 'sorrisao']], acoes: [[12.7, 'comemora']] } ],
    objetos: [{ tipo: 'metralhadora', x: -1.5, z: 0.2, giro: -40, aparece: 13.3 }, { tipo: 'metralhadora', x: 3.1, z: -1.6, giro: -140, aparece: 13.45 }, ...lavoura(-5, 5, -7, -4, 1.4)] } ], [
  'Plano heroico, de baixo e inclinado: as duas metralhadoras em primeiro plano apontadas para a câmera e o major estufando o peito no meio dos soldados',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(10.56, [0, 0.6, 5], [0, 1.5, 0], 42, -4), cam(14.5, [0, 0.8, 6.6], [0, 1.5, 0], 42, -2)], foco: { desfoque: 10, alvo: 'major_meredith' },
    atores: [ { id: 'major_meredith', x: 0, z: 0, expressoes: [[10.56, 'serio'], [11.7, 'sorrisao']], acoes: [[11.6, 'maos_cintura']] },
      { id: 'soldado', x: -1.0, z: -1.3, expressoes: [[10.56, 'serio']], acoes: [[12.45, 'acena']] },
      { id: 'soldado', x: 1.0, z: -1.3, expressoes: [[10.56, 'serio']], acoes: [[12.5, 'acena']] } ],
    objetos: [{ tipo: 'metralhadora', x: -0.75, z: 2.1, giro: -65, aparece: 13.3 }, { tipo: 'metralhadora', x: 0.75, z: 2.1, giro: -115, aparece: 13.45 }] } ]);

// c05 · f05: Fácil, né?
C('c05', 14.67, 16.0, ['f05'], 'Fácil, né?', [
  'Close no major, confiante, com sorriso de canto, enquanto um emu espia por trás dele',
  { cenario: 'campo', luz: 'dia', camera: [cam(14.67, [0, 1.75, 2.7], [0, 1.75, 0], 38), cam(15.9, [0.1, 1.75, 2.3], [0, 1.75, 0], 38)], foco: { desfoque: 14, alvo: 'major_meredith' },
    atores: [ { id: 'major_meredith', x: -0.15, z: 0, expressoes: [[14.67, 'sorriso_fechado'], [15.15, 'sorrisao']], acoes: [[14.7, 'maos_cintura']] },
      emu([[14.67, 1.6], [15.2, 0.55]], -2, { expressoes: [[14.67, 'sorriso_fechado']], olhar: -1 }) ] } ], [
  'Close no emu, que encara a câmera com cara de quem sabe de alguma coisa',
  { cenario: 'campo', luz: 'dia', camera: [cam(14.67, [0, 1.65, 3], [0, 1.55, 0], 38), cam(15.9, [0, 1.6, 2.5], [0, 1.55, 0], 38, 3)], foco: { desfoque: 14, alvo: 'emu' },
    atores: [ emu(0, 0, { expressoes: [[14.67, 'sorriso_fechado'], [15.2, 'assobio']], olhar: [[14.67, -0.8], [15.1, 0]] }) ],
    objetos: trigo([[0.7, 0.4], [-0.7, 0.3], [0.3, -1.5]]) } ]);

// c06 · f06: grupinhos em zigue-zague
const grupos = [[-5, 1], [-4, -3], [0, -5], [4, -3], [5, 1]];
const corredores = [];
grupos.forEach(([gx, gz], g) => [0, 1].forEach((k) => {
  const ox = (k - 0.5) * 0.9, oz = k * 0.6; const p = zz(16.7 + g * 0.08, 19.9, ox * 0.6, oz - 1, gx + ox, gz + oz, 0.9, 6);
  corredores.push(emu(p.x, p.z, { expressoes: [[16, k ? 'riso' : 'sorrisao']], escala: 0.95 }));
}));
C('c06', 16.0, 20.09, ['f06'], 'Os emus se espalham em grupinhos e correm em zigue-zague', [
  'Geral: o bando se divide em grupinhos e sai correndo em zigue-zague; o major e um soldado, em primeiro plano, ficam tontos de tanto acompanhar',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(16.0, [0, 3.6, 11], [0, 0.9, -1]), cam(19.9, [0, 4.6, 12.5], [0, 0.6, -1.5])], foco: { desfoque: 0 },
    atores: [ ...corredores,
      { id: 'major_meredith', x: -1.1, z: 5.2, expressoes: [[16, 'serio'], [17.4, 'nervoso'], [18.9, 'tonto']], olhar: [[16, -1], [17, 1], [17.8, -1], [18.6, 1], [19.4, -1]] },
      { id: 'soldado', x: 1.1, z: 5.0, expressoes: [[16, 'nervoso'], [19.0, 'tonto']], olhar: [[16, 1], [17.2, -1], [18, 1], [18.8, -1]] } ],
    efeitos: [{ tipo: 'poeira', de: 16.8, ate: 18.2, pos: [0, 0.3, -1], tamanho: 2 }, { tipo: 'estrelas', de: 18.9, ate: 20.09, pos: [-1.1, 2.6, 5.2], tamanho: 0.6 }, { tipo: 'estrelas', de: 19.0, ate: 20.09, pos: [1.1, 2.5, 5.0], tamanho: 0.6 }],
    objetos: lavoura(-7, 7, -7, -5, 1.5) } ], [
  'Vista aérea: os grupinhos de emus se abrem como fogos de artifício e ziguezagueiam pelo campo, levantando poeira',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(16.0, [0, 15, 9], [0, 0, -1]), cam(19.9, [0, 13, 7.5], [0, 0, -1.5], 40, 4)], foco: { desfoque: 0 },
    atores: corredores,
    efeitos: [{ tipo: 'poeira', de: 16.8, ate: 18.0, pos: [0, 0.3, -1], tamanho: 2.5 }, { tipo: 'poeira', de: 18.2, ate: 19.4, pos: [-3, 0.3, -2], tamanho: 1.6 }, { tipo: 'poeira', de: 18.4, ate: 19.6, pos: [3, 0.3, -2], tamanho: 1.6 }],
    objetos: lavoura(-6, 6, -6, 2, 1.6) } ]);

// c07 · f07: a metralhadora no caminhão
C('c07', 20.09, 22.82, ['f07'], 'Montam a metralhadora num caminhão', [
  'O caminhão chega quicando pela trilha com a metralhadora presa na carroceria, e o major aponta para ele, todo orgulhoso',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(20.09, [2.6, 1.8, 8], [-1.5, 1.1, 0]), cam(22.6, [2, 1.8, 6.8], [-0.4, 1.1, 0])], foco: { desfoque: 8, alvo: [-1, 1, 0] },
    atores: [ { id: 'major_meredith', x: 1.6, z: 2.2, expressoes: [[20.09, 'sorriso'], [21.9, 'sorrisao']], acoes: [[21.0, 'aponta']], olhar: -1 } ],
    objetos: [{ tipo: 'caminhao', x: [[20.09, -10], [21.9, -1.2]], z: 0, y: pula(20.09, 22.8, 0.22, 0.12), movendo: true }],
    efeitos: [{ tipo: 'poeira', de: 21.6, ate: 22.6, pos: [-3.8, 0.4, 0], tamanho: 1.3 }] } ], [
  'Close na carroceria: o soldado, em cima do caminhão, segura a metralhadora presa nele, e a câmera gira em volta',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(20.09, [-4.2, 2.3, 4.4], [-1.3, 1.6, 0]), cam(22.7, [-0.4, 2.2, 5.2], [-1.3, 1.5, 0])], foco: { desfoque: 10, alvo: 'soldado' },
    atores: [ { id: 'soldado', x: -1.75, y: 0.82, z: 0.35, expressoes: [[20.09, 'sorriso'], [21.9, 'sorrisao']], acoes: [[21.0, 'segura']] } ],
    objetos: [{ tipo: 'caminhao', x: 0, z: 0 }] } ]);

// c08 · f08: a estrada sacode, ninguém mira
const t8 = [22.82, 26.84];
const xCam8 = (t) => r2(-2 + (t - t8[0]) * 2.2);
const xTr8 = [[t8[0], -2], [t8[1], r2(-2 + 4.02 * 2.2)]];
const yTr8 = pula(t8[0], t8[1], 0.18, 0.2);
const roll8 = []; for (let t = t8[0], i = 0; t <= t8[1]; t += 0.4, i++) roll8.push(cam(r2(t), [r2(xCam8(t) + 0.8), 2.2, 6.6], [r2(xCam8(t) - 0.8), 1.4, 0], 40, i % 2 ? 5 : -5));
C('c08', 22.82, 26.84, ['f08'], 'A estrada de terra sacode e ninguém consegue mirar', [
  'A câmera acompanha o caminhão sacudindo na estrada de terra; o soldado na carroceria treme inteiro e o quadro chacoalha junto',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: roll8, foco: { desfoque: 8, alvo: 'soldado' },
    atores: [ { id: 'soldado', x: somar(xTr8, -1.75), y: somar(yTr8, 0.82), z: 0.35, andar: false, expressoes: [[t8[0], 'nervoso'], [24.5, 'tonto']], acoes: [[t8[0], 'tremer']] } ],
    objetos: [{ tipo: 'caminhao', x: xTr8, z: 0, y: yTr8, movendo: true }],
    efeitos: [23.1, 24.0, 24.9, 25.8].map((de) => ({ tipo: 'poeira', de, ate: r2(de + 1.0), pos: [r2(xCam8(de) - 3.6), 0.4, 0], tamanho: 1.4 })) } ], [
  'Plano de frente: o caminhão vem na direção da câmera pulando nos buracos, a metralhadora balançando, e um emu corre na frente rindo',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(22.82, [5, 1.3, 4], [-2, 1.2, 0]), cam(26.7, [5.6, 1.4, 3.6], [0, 1.2, 0], 40, 4)], foco: { desfoque: 8, alvo: [0, 1, 0] },
    atores: [ { id: 'soldado', x: [[22.82, -9.75], [26.84, -1.75]], y: somar(pula(22.82, 26.84, 0.2, 0.25), 0.82), z: 0.35, andar: false, expressoes: [[22.82, 'nervoso'], [25.1, 'tonto']], acoes: [[22.82, 'tremer']] },
      emu([[22.82, 0.5], [26.84, 4.3]], 1.6, { expressoes: [[22.82, 'riso']] }) ],
    objetos: [{ tipo: 'caminhao', x: [[22.82, -8], [26.84, 0]], z: 0, y: pula(22.82, 26.84, 0.2, 0.25), movendo: true }],
    efeitos: [{ tipo: 'poeira', de: 23.6, ate: 24.8, pos: [-8, 0.4, 0], tamanho: 1.5 }, { tipo: 'poeira', de: 25.2, ate: 26.6, pos: [-5, 0.4, 0], tamanho: 1.5 }] } ]);

// c09 · f09: mais poeira do que pássaro
const nuvens = (x, z, de) => [[-0.7, -0.3], [0.6, 0.2], [-0.2, 0.6], [0.8, -0.6], [-0.9, 0.5], [0.1, -0.8]].map(([dx, dz], i) => ({ tipo: 'poeira', de: r2(de + i * 0.32), ate: r2(de + i * 0.32 + 0.9), pos: [r2(x + dx), 0.35, r2(z + dz)], tamanho: 0.9 }));
C('c09', 26.84, 31.16, ['f09'], 'Acertam mais poeira do que pássaro', [
  'O soldado dispara a metralhadora de tripé, tremendo, e só levanta poeira em volta do emu, que fica parado assobiando e depois cai na risada',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(26.84, [-0.6, 1.8, 7.2], [0.2, 1.2, -0.5]), cam(31.0, [0.2, 1.7, 5.8], [0.5, 1.3, -1])], foco: { desfoque: 8, alvo: 'emu' },
    atores: [ { id: 'soldado', x: -1.3, z: 2.2, expressoes: [[26.84, 'serio'], [27.3, 'nervoso'], [28.3, 'choque']], acoes: [[26.9, 'tremer']] },
      emu(0.9, -1.8, { expressoes: [[26.84, 'sorriso_fechado'], [27.4, 'assobio'], [28.6, 'riso']], acoes: [[29.0, 'pulo']] }) ],
    objetos: [{ tipo: 'metralhadora', x: -0.7, z: 2.3, giro: 40 }, ...trigo([[2.2, -2.6], [-1.5, -2.8], [0, -3.6]])],
    efeitos: nuvens(0.9, -1.8, 27.3) } ], [
  'Close no emu no meio de uma nuvem de poeira, sem um arranhão, com cara de deboche; um X vermelho mostra que erraram',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(26.84, [0, 1.7, 3.6], [0, 1.5, 0], 38), cam(31.0, [0.3, 1.6, 3.0], [0, 1.5, 0], 38, -3)], foco: { desfoque: 13, alvo: 'emu' },
    atores: [ emu(0, 0, { expressoes: [[26.84, 'sorriso_fechado'], [27.5, 'assobio'], [28.6, 'riso']], acoes: [[29.1, 'pulo']] }) ],
    objetos: [{ tipo: 'icone', icone: 'x', x: 0.75, y: 2.6, z: 0, escala: 0.4, aparece: 28.2 }],
    efeitos: nuvens(0, 0.3, 27.4) } ]);

// c10 · f10: dez mil balas depois, desistiu (fim de tarde)
C('c10', 31.16, 35.24, ['f10'], 'Quase dez mil balas depois, o exército desiste', [
  'Fim de tarde: o major, ao lado das caixas de munição, põe a mão na testa, decepcionado; balão "QUASE 10 MIL BALAS"; o soldado senta, desanimado',
  { cenario: 'campo', luz: 'fim_de_tarde', transicao: 'flash', camera: [cam(31.16, [0, 1.7, 5.6], [0, 1.3, 0]), cam(35.1, [0.3, 1.6, 4.4], [0, 1.4, 0])], foco: { desfoque: 11, alvo: 'major_meredith' },
    atores: [ { id: 'major_meredith', x: -0.3, z: 0.4, expressoes: [[31.16, 'serio'], [32.6, 'decepcao']], acoes: [[33.4, 'decepcao']] },
      { id: 'soldado', x: 1.0, z: -1.4, expressoes: [[31.16, 'decepcao']], acoes: [[33.9, 'senta']] } ],
    objetos: [{ tipo: 'caixote', x: -1.4, z: -0.6, cor: '#6f7d4c' }, { tipo: 'caixote', x: -1.4, y: 0.8, z: -0.6, cor: '#6f7d4c', giro: 15 }, { tipo: 'metralhadora', x: 1.9, z: -0.9, giro: 200 },
      { tipo: 'balao', texto: 'QUASE 10 MIL BALAS', x: 0.3, y: 3.1, z: 0, escala: 0.85, aparece: 31.5 }] } ], [
  'Geral no pôr do sol: a tropa vai embora pela trilha atrás do caminhão, e os emus pulam de alegria no campo',
  { cenario: 'campo', luz: 'fim_de_tarde', transicao: 'flash', camera: [cam(31.16, [2, 3, 11], [0, 1, 0]), cam(35.1, [2.6, 2.6, 9.5], [0.5, 1.1, 0])], foco: { desfoque: 0 },
    atores: [ { id: 'major_meredith', x: [[31.16, -0.4], [35.24, -4.2]], z: 1.5, expressoes: [[31.16, 'decepcao']] },
      { id: 'soldado', x: [[31.16, 0.6], [35.24, -3.2]], z: 2.2, expressoes: [[31.16, 'decepcao']] },
      emu(3, -1, { expressoes: [[31.16, 'riso']], acoes: [[33.9, 'pulo']] }), emu(4.4, -2.2, { expressoes: [[31.16, 'sorrisao']], acoes: [[34.0, 'pulo']] }), emu(2.2, -3, { expressoes: [[31.16, 'riso']], acoes: [[34.1, 'pulo']] }) ],
    objetos: [{ tipo: 'caminhao', x: [[31.16, -2], [35.24, -8]], z: 0, movendo: true }, ...lavoura(1.5, 6, -5, -1.5, 1.3)] } ]);

// c11 · f11: e sabe o que o major disse?
C('c11', 35.24, 37.45, ['f11'], 'E sabe o que o major disse?', [
  'Close no major pensativo, mão no queixo, com o caminhão parado ao fundo no pôr do sol',
  { cenario: 'campo', luz: 'fim_de_tarde', camera: [cam(35.24, [0, 1.75, 3], [0, 1.75, 0], 38), cam(37.3, [0, 1.75, 2.3], [0, 1.78, 0], 38, 3)], foco: { desfoque: 14, alvo: 'major_meredith' },
    atores: [ { id: 'major_meredith', x: 0, z: 0, expressoes: [[35.24, 'serio'], [36.3, 'nervoso']], acoes: [[35.3, 'pensa']], olhar: [[35.24, 0], [36.2, 0.8]] } ],
    objetos: [{ tipo: 'caminhao', x: 1.5, z: -6, giro: 20 }] } ], [
  'Plano médio: o major olha de lado, e o emu chega bem pertinho e encara de volta',
  { cenario: 'campo', luz: 'fim_de_tarde', camera: [cam(35.24, [0.2, 1.6, 4.8], [0.2, 1.4, -0.4]), cam(37.3, [0.3, 1.6, 4.0], [0.2, 1.5, -0.4])], foco: { desfoque: 11, alvo: 'major_meredith' },
    atores: [ { id: 'major_meredith', x: -0.45, z: 0, expressoes: [[35.24, 'serio'], [36.4, 'nervoso']], acoes: [[35.3, 'pensa']], olhar: 1 },
      emu([[35.24, 3], [36.4, 0.75]], -1, { expressoes: [[35.24, 'sorriso_fechado'], [36.5, 'serio']], olhar: -1 }) ] } ]);

// c12 · f12: a virada (tanques de guerra)
C('c12', 37.45, 42.48, ['f12'], 'Os emus enfrentavam metralhadora como tanques de guerra', [
  'O emu vem marchando de frente, invencível, e em "tanques" um tanque de guerra surge atrás dele com uma explosão; a câmera avança inclinada',
  { cenario: 'campo', luz: 'fim_de_tarde', transicao: 'flash', camera: [cam(37.45, [0, 1.3, 6.5], [0, 1.4, 0]), cam(40.4, [0.2, 1.4, 4.6], [0, 1.6, -0.5], 40, 5), cam(42.3, [0.2, 1.5, 4.2], [0, 1.7, -0.8], 40, 5)], foco: { desfoque: 10, alvo: 'emu' },
    atores: [ emu(0, [[37.45, -3], [40.4, 0.4]], { expressoes: [[37.45, 'serio'], [40.5, 'sorrisao']] }) ],
    objetos: [{ tipo: 'tanque_de_guerra', x: 0.5, z: -3.6, giro: -90, escala: 1.1, aparece: 40.5 }],
    efeitos: [{ tipo: 'explosao', de: 40.5, ate: 41.3, pos: [0.5, 1.6, -3.4], tamanho: 2.2 }] } ], [
  'Câmera baixa e inclinada: uma fila de emus avança lado a lado e, em "tanques", dois tanques de guerra aparecem marchando com eles',
  { cenario: 'campo', luz: 'fim_de_tarde', transicao: 'flash', camera: [cam(37.45, [0, 0.5, 5.5], [0, 1.6, -2], 42, -5), cam(42.3, [0, 0.6, 5], [0, 1.7, -1], 42, -3)], foco: { desfoque: 8, alvo: [0, 1.5, -1.5] },
    atores: [-1, 0, 1].map((x, i) => emu(x * 0.9, [[37.45, -5.5 - i * 0.3], [42.48, -1.2 - i * 0.3]], { expressoes: [[37.45, 'serio'], [40.6, 'sorrisao']] })),
    objetos: [{ tipo: 'tanque_de_guerra', x: -2.6, z: [[37.45, -7], [42.48, -3]], movendo: true, aparece: 40.5 }, { tipo: 'tanque_de_guerra', x: 2.6, z: [[37.45, -7.2], [42.48, -3.2]], movendo: true, aparece: 40.6 }],
    efeitos: [{ tipo: 'explosao', de: 40.5, ate: 41.3, pos: [0, 2, -4], tamanho: 2.4 }] } ]);

// c13 · f13: a revanche
C('c13', 42.48, D, ['f13'], 'Quem ganha a revanche?', [
  'Cara a cara: o major, em primeiro plano, encara o emu ao fundo, com um ponto de interrogação entre os dois; cada um comemora quando é citado',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(42.48, [-1.3, 1.7, 5.2], [0, 1.4, 0]), cam(46.4, [1.1, 1.7, 5.0], [0, 1.4, 0])], foco: { desfoque: 9, alvo: [0, 1.5, 0] },
    atores: [ { id: 'major_meredith', x: -0.5, z: 1.4, expressoes: [[42.48, 'serio'], [44.4, 'sorrisao']], acoes: [[42.6, 'maos_cintura'], [44.4, 'comemora']], olhar: 1 },
      emu(0.7, -1.6, { expressoes: [[42.48, 'serio'], [45.45, 'riso']], acoes: [[45.45, 'pulo']], olhar: -1 }) ],
    objetos: [{ tipo: 'icone', icone: '?', x: 0.1, y: 2.9, z: 0, escala: 0.5, aparece: 42.8 }] } ], [
  'Placar da revanche: balão "EXÉRCITO X EMUS" sobre a tropa e o bando; a tropa pula em "exército" e os emus em "emus"',
  { cenario: 'campo', luz: 'dia', transicao: 'flash', camera: [cam(42.48, [0, 2.6, 9.5], [0, 1.3, 0]), cam(46.4, [0, 2.3, 8.2], [0, 1.4, 0])], foco: { desfoque: 0 },
    atores: [ { id: 'major_meredith', x: -1.1, z: 1.2, expressoes: [[42.48, 'serio'], [44.4, 'sorrisao']], acoes: [[44.4, 'comemora']] },
      { id: 'soldado', x: -1.7, z: -0.4, expressoes: [[42.48, 'serio'], [44.5, 'sorrisao']], acoes: [[44.5, 'pulo']] },
      emu(1.1, 1.0, { expressoes: [[42.48, 'serio'], [45.45, 'riso']], acoes: [[45.45, 'pulo']] }), emu(1.8, -0.6, { expressoes: [[42.48, 'serio'], [45.5, 'sorrisao']], acoes: [[45.5, 'pulo']] }) ],
    objetos: [{ tipo: 'balao', texto: 'EXÉRCITO X EMUS', x: 0, y: 3.4, z: 0, escala: 1.1, aparece: 42.8 }] } ]);

const V = { base: { titulo: 'O Exército Que Perdeu Para Pássaros', duracao: D, audio: 'narracao.wav', elenco: {} }, cenas };
fs.mkdirSync(path.join(pasta, 'cenas'), { recursive: true });
fs.writeFileSync(path.join(pasta, 'cenas', 'variantes.json'), JSON.stringify(V, null, 1));
console.log('ok', cenas.length, 'cenas');
