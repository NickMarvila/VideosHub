import { register, bx, ball, rng } from '../kit.js';

// Haste inclinada: base em (x, 0, z), comprimento L, giro rx (para frente) e rz (para o lado).
// Devolve o topo, para pôr a espiga.
function haste(g, cor, x, z, L, rx, rz, w = 0.014) {
  const dx = -Math.sin(rz), dy = Math.cos(rz) * Math.cos(rx), dz = Math.cos(rz) * Math.sin(rx);
  const m = bx(g, cor, w, L, w, 0, 0, 0, 0.004);
  m.position.set(x + dx * L / 2, dy * L / 2, z + dz * L / 2);
  m.rotation.set(rx, 0, rz);
  return [x + dx * L, dy * L, z + dz * L, dx, dy, dz];
}

register('plantacao_de_trigo', {
  category: 'objetos',
  label: 'Touceira de trigo',
  description: 'Touceira de trigo dourado maduro: ~14 hastes com espigas cheias, folhas na base. ~0,8 m de altura, ~0,5 m de largura. Espalhe várias (seed diferente) para formar a lavoura.',
  params: {
    color: ['#e3b23c', 'cor das hastes'],
    espiga: ['#f2c94c', 'cor das espigas'],
    folha: ['#c9952e', 'cor das folhas da base'],
    hastes: [14, 'quantidade de hastes (6 a 24)'],
    altura: [0.8, 'altura em metros'],
    seed: [1, 'semente da forma (mude para cada touceira ficar diferente)'],
  },
  variants: { rala: { hastes: 8 }, cheia: { hastes: 22 }, baixa: { altura: 0.55 } },
  make(g, p) {
    const r = rng(p.seed);
    const n = Math.max(3, Math.round(p.hastes));
    const H = p.altura;
    // terra da touceira
    bx(g, '#8a5f3a', 0.3, 0.03, 0.3, 0, 0, 0, 0.012);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.5;
      const rad = 0.03 + r() * 0.08;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const incl = 0.06 + r() * 0.22;
      const rz = -Math.cos(a) * incl, rx = Math.sin(a) * incl;
      const L = H * (0.72 + r() * 0.2);
      const [tx, ty, tz, dx, dy, dz] = haste(g, p.color, x, z, L, rx, rz);
      // espiga: grão alongado, um pouco mais pesado (pende pra fora)
      const e = ball(g, p.espiga, 0.03, tx + dx * 0.06, ty + dy * 0.06, tz + dz * 0.06, [1, 3.2, 1.1], 1);
      e.rotation.set(rx * 1.4, 0, rz * 1.4);
      // barbinhas da espiga
      for (const s of [-1, 1]) {
        const b = bx(g, p.espiga, 0.006, 0.09, 0.006, 0, 0, 0, 0.002);
        b.position.set(tx + dx * 0.15 + s * 0.012, ty + dy * 0.15, tz + dz * 0.15);
        b.rotation.set(rx * 1.6, 0, rz * 1.6 + s * 0.35);
      }
    }
    // folhas largas na base
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r();
      const incl = 0.55 + r() * 0.3;
      haste(g, p.folha, Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0.3, Math.sin(a) * incl, -Math.cos(a) * incl, 0.026);
    }
  },
});
