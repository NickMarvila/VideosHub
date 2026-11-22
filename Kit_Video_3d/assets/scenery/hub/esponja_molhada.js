import { register, bx, cyl, ball } from '../kit.js';

register('esponja_molhada', {
  category: 'objetos', label: 'Esponja molhada',
  description: 'Esponja de cozinha amarela encharcada, com face verde de esfregar, gotas azuis pingando e poça embaixo. 0,5 × 0,32 m.',
  params: { color: ['#f7d046', 'cor da espuma'], scrub: ['#3fa34d', 'cor da face de esfregar'], drops: [4, 'gotas no ar (0 a 6)'] },
  variants: { seca: { drops: 0 }, rosa: { color: '#f29bb8' } },
  make(g, p) {
    cyl(g, '#7fc3ee', 0.32, 0.32, 0.01, 0, 0, 0, 16);
    bx(g, p.color, 0.5, 0.16, 0.32, 0, 0.22, 0, 0.04);
    bx(g, p.scrub, 0.5, 0.05, 0.32, 0, 0.38, 0, 0.02);
    for (const [x, y] of [[-0.15, 0.3], [-0.05, 0.26], [0.08, 0.32], [0.18, 0.27]]) ball(g, '#d9a92a', 0.022, x, y, 0.16, [1, 1, 0.4]);
    const pos = [[-0.16, 0.14, 0.05], [0.08, 0.1, -0.06], [-0.02, 0.05, 0.1], [0.19, 0.12, 0.08], [0.0, 0.17, -0.1], [-0.2, 0.07, -0.08]];
    for (let i = 0; i < Math.min(6, p.drops); i++) ball(g, '#4fa3e0', 0.028, pos[i][0], pos[i][1], pos[i][2], [1, 1.5, 1]);
  },
});
