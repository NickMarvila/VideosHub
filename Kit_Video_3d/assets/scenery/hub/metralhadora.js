import { register, bx, cyl, ball } from '../kit.js';

// tubo deitado ao longo de Z, centrado em (x, y, z)
function tubo(g, c, rT, rB, L, x, y, z, seg = 12) {
  const m = cyl(g, c, rT, rB, L, x, y - L / 2, z, seg);
  m.rotation.x = Math.PI / 2;
  return m;
}
// haste reta de P até F
function haste(g, c, r, P, F) {
  const d = [P[0] - F[0], P[1] - F[1], P[2] - F[2]];
  const L = Math.hypot(...d);
  const m = cyl(g, c, r, r, L, (P[0] + F[0]) / 2, (P[1] + F[1]) / 2 - L / 2, (P[2] + F[2]) / 2, 8);
  m.rotation.set(Math.acos(d[1] / L), Math.atan2(d[0], d[2]), 0, 'YXZ');
  return m;
}

register('metralhadora', {
  category: 'objetos', label: 'Metralhadora de tripé',
  description: 'Metralhadora antiga de tripé, cartoon: cano grosso cinza-escuro com aletas de resfriamento, carregador redondo (prato) em cima, coronha de madeira. 1,2 m de comprimento, 0,95 m de altura. Cano aponta para +Z.',
  params: {
    color: ['#3a3f45', 'metal do cano e do corpo'],
    magazine: ['#2a2e33', 'carregador redondo'],
    wood: ['#8a5a33', 'madeira da coronha'],
    tripod: ['#4b5057', 'tripé'],
  },
  variants: { verde: { color: '#4b5a3a', tripod: '#5a6646' }, enferrujada: { color: '#6b4f3a', magazine: '#4a3a2c' } },
  make(g, p) {
    const Y = 0.78; // eixo do cano
    // tripé
    const P = [0, 0.64, 0];
    for (const F of [[0, 0.02, 0.6], [-0.46, 0.02, -0.4], [0.46, 0.02, -0.4]]) {
      haste(g, p.tripod, 0.026, P, F);
      bx(g, p.tripod, 0.1, 0.03, 0.1, F[0], 0, F[2], 0.01);
    }
    ball(g, p.tripod, 0.06, 0, 0.64, 0);
    bx(g, p.tripod, 0.1, 0.1, 0.12, 0, 0.64, 0, 0.02);
    // corpo (caixa da culatra)
    bx(g, p.color, 0.15, 0.17, 0.44, 0, Y - 0.09, -0.04, 0.03);
    // capa do cano com aletas
    tubo(g, p.color, 0.08, 0.08, 0.42, 0, Y, 0.38);
    for (let i = 0; i < 6; i++) tubo(g, p.magazine, 0.092, 0.092, 0.025, 0, Y, 0.21 + i * 0.065);
    // cano e boca
    tubo(g, p.magazine, 0.032, 0.032, 0.1, 0, Y, 0.63);
    tubo(g, p.color, 0.045, 0.038, 0.04, 0, Y, 0.68);
    bx(g, p.magazine, 0.02, 0.05, 0.02, 0, Y + 0.08, 0.55, 0.005); // mira
    // carregador redondo em cima
    cyl(g, p.magazine, 0.17, 0.17, 0.055, 0, Y + 0.08, -0.04, 18);
    cyl(g, p.color, 0.05, 0.05, 0.07, 0, Y + 0.08, -0.04, 10);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = bx(g, p.color, 0.018, 0.012, 0.11, Math.sin(a) * 0.1, Y + 0.135, -0.04 + Math.cos(a) * 0.1, 0.004);
      r.rotation.y = a;
    }
    // coronha, empunhadura e alavanca
    bx(g, p.wood, 0.08, 0.12, 0.26, 0, Y - 0.1, -0.39, 0.03);
    bx(g, p.wood, 0.1, 0.19, 0.05, 0, Y - 0.15, -0.53, 0.02);
    const gr = bx(g, p.wood, 0.05, 0.13, 0.06, 0, Y - 0.22, -0.18, 0.02);
    gr.rotation.x = -0.35;
    bx(g, p.magazine, 0.012, 0.05, 0.08, 0, Y - 0.12, -0.12, 0.004);
    ball(g, p.magazine, 0.025, 0.1, Y, -0.1);
  },
});
