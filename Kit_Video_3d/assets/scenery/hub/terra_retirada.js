import { register, bx, cyl, ball } from '../kit.js';

register('terra_retirada', {
  category: 'objetos',
  label: 'Terra retirada',
  description: 'Monte de terra marrom recém-cavada com uma pá de cabo de madeira fincada no topo, um pouco inclinada. 1,4 × 1,1 m de base, 1,0 m de altura com a pá. Frente para +Z.',
  params: { color: ['#8a5a36', 'cor da terra'], dark: ['#6b4327', 'cor dos torrões'], pa: [true, 'pá fincada no monte'] },
  variants: { sem_pa: { pa: false }, escura: { color: '#6b4327', dark: '#4f3120' } },
  make(g, p) {
    // monte: domos achatados empilhados
    ball(g, p.color, 0.7, 0, 0.05, 0, [1.0, 0.42, 0.8], 2);
    ball(g, p.color, 0.48, -0.08, 0.3, 0.02, [1.0, 0.6, 0.85], 2);
    ball(g, p.color, 0.3, 0.05, 0.5, 0, [1.0, 0.65, 0.9], 2);
    // torrões soltos em volta
    for (const [x, z, r] of [[0.62, 0.35, 0.09], [-0.6, 0.4, 0.07], [0.45, -0.45, 0.08], [-0.2, 0.6, 0.06], [0.75, -0.05, 0.06]])
      ball(g, p.dark, r, x, r * 0.6, z, [1, 0.7, 1], 1);
    if (p.pa) {
      const s = new g.constructor(); // grupo da pá (gira em volta do ponto onde entra na terra)
      s.position.set(0.08, 0.62, 0.02);
      s.rotation.z = -0.28;
      s.rotation.x = 0.12;
      g.add(s);
      bx(s, '#8c939b', 0.24, 0.3, 0.035, 0, -0.26, 0, 0.02); // lâmina meio enterrada
      cyl(s, '#6d737a', 0.035, 0.05, 0.1, 0, 0.03, 0, 8); // colar
      cyl(s, '#a87a4a', 0.028, 0.028, 0.78, 0, 0.12, 0, 8); // cabo de madeira
      bx(s, '#5a3b26', 0.16, 0.05, 0.05, 0, 0.88, 0, 0.02); // pegador em T
    }
  },
});
