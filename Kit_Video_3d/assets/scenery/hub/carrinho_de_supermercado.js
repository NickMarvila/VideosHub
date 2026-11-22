import { register, bx, cyl, ball, wheel } from '../kit.js';

register('carrinho_de_supermercado', {
  category: 'objetos',
  label: 'Carrinho de supermercado',
  description: 'Carrinho de metal aramado cinza, alça vermelha escura e quatro rodinhas, já com compras coloridas (cereal, garrafa, leite, maçãs, pão, banana). 0,55 × 0,95 m, 1,05 m de altura. "compras" 0 deixa vazio. Frente para +Z.',
  params: {
    metal: ['#b9c0c6', 'cor do metal'],
    handle: ['#c0392b', 'cor da alça'],
    compras: [6, 'quantidade de compras no cesto (0 a 6)'],
  },
  variants: { vazio: { compras: 0 }, poucas: { compras: 3 } },
  make(g, p) {
    const m = p.metal;
    const W = 0.52, y0 = 0.42, y1 = 0.92, zb = -0.4, zf = 0.42, L = zf - zb, cz = (zb + zf) / 2;
    for (const sx of [-1, 1]) for (const z of [-0.33, 0.36]) {
      bx(g, '#6b737c', 0.03, 0.06, 0.03, sx * 0.22, 0.09, z, 0.005);
      wheel(g, sx * 0.22, 0.05, z, 0.05, 0.03);
    }
    for (const sx of [-1, 1]) {
      bx(g, m, 0.03, 0.03, 0.8, sx * 0.22, 0.15, 0.01, 0.01);
      bx(g, m, 0.03, y0 - 0.15, 0.03, sx * 0.23, 0.15, zb + 0.04, 0.01);
      bx(g, m, 0.03, y0 - 0.15, 0.03, sx * 0.23, 0.15, zf - 0.06, 0.01);
    }
    bx(g, m, 0.44, 0.015, 0.62, 0, 0.2, 0.04, 0.005);
    bx(g, m, W, 0.02, L, 0, y0, cz, 0.005);
    for (const y of [y0 + 0.25, y1]) {
      for (const sx of [-1, 1]) bx(g, m, 0.022, 0.022, L, sx * W / 2, y, cz, 0.006);
      bx(g, m, W, 0.022, 0.022, 0, y, zf, 0.006);
      bx(g, m, W, 0.022, 0.022, 0, y, zb, 0.006);
    }
    for (let i = 0; i <= 7; i++) {
      const z = zb + (i * L) / 7;
      for (const sx of [-1, 1]) bx(g, m, 0.012, y1 - y0, 0.012, sx * W / 2, y0, z, 0.003);
    }
    for (let i = 1; i < 6; i++) {
      const x = -W / 2 + (i * W) / 6;
      bx(g, m, 0.012, y1 - y0, 0.012, x, y0, zf, 0.003);
      bx(g, m, 0.012, y1 - y0, 0.012, x, y0, zb, 0.003);
    }
    // alça com ponteiras vermelhas
    for (const sx of [-1, 1]) {
      bx(g, m, 0.03, 0.16, 0.03, sx * 0.25, y1, zb - 0.08, 0.01);
      bx(g, m, 0.03, 0.03, 0.1, sx * 0.25, y1, zb - 0.04, 0.01);
      ball(g, p.handle, 0.04, sx * 0.3, 1.08, zb - 0.08);
    }
    const h = cyl(g, p.handle, 0.028, 0.028, 0.6, 0, 1.08 - 0.3, zb - 0.08, 10);
    h.rotation.z = Math.PI / 2;
    // compras (algumas passam da borda)
    const n = Math.max(0, Math.min(6, Math.round(p.compras)));
    const b = y0 + 0.02;
    const itens = [
      () => bx(g, '#f28c28', 0.16, 0.6, 0.07, -0.13, b, -0.22, 0.01),
      () => { cyl(g, '#3c9d5d', 0.04, 0.05, 0.5, 0.14, b, -0.24, 8); cyl(g, '#3c9d5d', 0.018, 0.035, 0.1, 0.14, b + 0.5, -0.24, 8); },
      () => { bx(g, '#f4f1ea', 0.11, 0.48, 0.11, 0.0, b, -0.05, 0.01); bx(g, '#3c6fa8', 0.115, 0.1, 0.115, 0.0, b + 0.22, -0.05, 0.005); },
      () => { ball(g, '#e2453c', 0.07, 0.14, b + 0.07, 0.15); ball(g, '#e2453c', 0.07, 0.06, b + 0.07, 0.26); ball(g, '#e2453c', 0.07, 0.14, b + 0.2, 0.22); },
      () => { const r = bx(g, '#d9a45b', 0.08, 0.08, 0.55, -0.1, b + 0.42, 0.05, 0.035); r.rotation.x = 0.7; },
      () => { const r = ball(g, '#f2c94c', 0.09, -0.12, b + 0.15, 0.25, [0.6, 0.6, 1.6]); r.rotation.y = 0.5; },
    ];
    for (let i = 0; i < n; i++) itens[i]();
  },
});
