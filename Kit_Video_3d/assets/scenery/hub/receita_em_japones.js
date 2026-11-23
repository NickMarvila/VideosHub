import { register, bx, ball, tris } from '../kit.js';

// Glifos tipo kana/kanji em barrinhas (caixa 14 × 14, y para baixo, como no SVG).
const GL = [
  [[0, 6, 14, 2.5], [5.75, 0, 2.5, 14]],
  [[2, 0, 10, 2.5], [0, 5, 14, 2.5], [8, 7, 2.5, 7]],
  [[1, 2, 2.5, 9], [1, 10, 10, 2.5], [10, 1, 2.5, 10], [3, 0, 8, 2.5]],
  [[3, 0, 2.5, 12], [3, 11.5, 10, 2.5]],
  [[3, 0, 2.5, 14], [5, 6, 6, 2.5]],
  [[1, 1, 12, 2.5], [1, 11, 12, 2.5], [1, 1, 2.5, 12], [10.5, 1, 2.5, 12]],
  [[2, 2, 2.5, 10], [10, 3, 2.5, 7]],
  [[3, 1, 9, 2.5], [2, 11, 11, 2.5]],
  [[3, 2, 2.5, 11], [9, 2, 2.5, 11]],
  [[2, 2, 3, 2.5], [3, 11, 10, 2.5], [10.5, 4, 2.5, 8]],
];
// "ケーキ" em barras (caixa 100 × 34)
const KEKI = [[2, 0, 4, 16], [4, 8, 26, 4], [17, 8, 4, 24], [40, 14, 22, 4], [72, 5, 28, 4], [72, 17, 28, 4], [84, 0, 4, 34]];

register('receita_em_japones', {
  category: 'objetos',
  label: 'Receita em japonês',
  description: 'Folha de receita creme com "ケーキ" no título, letras japonesas em colunas, desenho de bolo de morango e dois cantos dobrados, apoiada num suporte de madeira. 0,3 × 0,42 m.',
  params: {
    paper: ['#fbf3e1', 'cor do papel'],
    fold: ['#e6d6b4', 'cor dos cantos dobrados'],
    ink: ['#3a3f47', 'cor das letras'],
    accent: ['#d9534f', 'cor dos detalhes (sublinhado, bolinhas)'],
    stand: ['#a9743f', 'cor do suporte'],
  },
  variants: { azul: { paper: '#eaf3fb', fold: '#bfd4e8' } },
  make(g, p) {
    const s = new g.constructor();
    s.position.set(0, 0.03, 0.012);
    s.rotation.x = -0.2;
    g.add(s);
    const W = 0.3, H = 0.4, D = 0.006, F = D / 2;
    const X = (u) => (u * W) / 230;
    const Y = (v) => H / 2 - (v * H) / 300;
    const V = (u, v, z) => [X(u), Y(v), z];
    // retângulo do SVG (x, y, w, h) colado na frente da folha
    const R = (col, x, y, w, h, dz = 0.003) =>
      bx(s, col, X(w), (h * H) / 300, dz, X(x + w / 2), Y(y + h), F + dz / 2, 0.0008);
    const glyph = (x, y, i, sc = 1, col = p.ink) => {
      for (const [a, b, w, h] of GL[i % GL.length]) R(col, x + a * sc, y + b * sc, w * sc, h * sc, 0.002);
    };
    const paper = (x, y, w, h) => bx(s, p.paper, X(w), (h * H) / 300, D, X(x + w / 2), Y(y + h), 0, 0.002);

    // folha com cantos dobrados (sup. direito e inf. esquerdo)
    paper(-115, -120, 230, 240);
    paper(-115, -150, 200, 30);
    paper(-85, 120, 200, 30);
    tris(s, p.paper, [[V(85, -150, 0), V(85, -120, 0), V(115, -120, 0)], [V(-115, 120, 0), V(-85, 120, 0), V(-85, 150, 0)]]);
    tris(s, p.fold, [[V(85, -150, F + 0.0015), V(85, -120, F + 0.0015), V(115, -120, F + 0.0015)],
      [V(-115, 120, F + 0.0015), V(-85, 120, F + 0.0015), V(-85, 150, F + 0.0015)]]);

    // título ケーキ + sublinhado
    for (const [a, b, w, h] of KEKI) R('#1e2227', -75 + a * 0.9, -132 + b * 0.9, w * 0.9, h * 0.9, 0.003);
    R(p.accent, -100, -90, 145, 4, 0.002);

    // bolo de morango
    R('#ffffff', -94, 26, 92, 12, 0.002);
    R('#f5d7a1', -84, -22, 72, 52, 0.004);
    R('#ffffff', -84, 0, 72, 9, 0.005);
    R('#ffffff', -86, -34, 76, 14, 0.006);
    ball(s, '#e2453c', 0.012, X(-48), Y(-42), F + 0.008, [1, 1, 0.6]);
    R('#3e9b4f', -52, -56, 9, 4, 0.004);

    // colunas verticais à direita
    for (let c = 0; c < 4; c++) for (let l = 0; l < 6; l++) glyph(80 - c * 20, -70 + l * 19, c * 6 + l * 7 + 1);
    // passos numerados embaixo
    [[52, 7], [78, 8], [104, 5]].forEach(([y, n], r) => {
      ball(s, p.accent, 0.009, X(-92), Y(y + 7), F + 0.001, [1, 1, 0.3]);
      for (let k = 0; k < n; k++) glyph(-76 + k * 17, y, r * 3 + k * 7);
    });

    // suporte de madeira (base, encosto e aba da frente)
    bx(g, p.stand, 0.32, 0.03, 0.15, 0, 0, -0.02, 0.008);
    bx(g, p.stand, 0.32, 0.015, 0.015, 0, 0.03, 0.04, 0.005);
    bx(s, p.stand, 0.26, 0.3, 0.012, 0, 0.01, -0.01, 0.006);
  },
});
