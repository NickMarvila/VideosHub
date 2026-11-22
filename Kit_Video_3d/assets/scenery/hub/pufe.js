import { register, cyl, ball } from '../kit.js';

register('pufe', {
  category: 'objetos',
  label: 'Pufe redondo',
  description: 'Pufe redondo de tecido laranja, fofo, com almofada estufada, debrum e botão no meio. Ø 0,66 m, 0,6 m de altura. setProgress(obj, 0..1) afunda o meio (1 = alguém sentado, assento em y ≈ 0,5).',
  params: {
    color: ['#f28c28', 'cor do tecido'],
    trim: ['#c4621a', 'cor do debrum, base e botão'],
    afundado: [0, 'quanto já começa afundado (0 a 1)'],
  },
  variants: { sentado: { afundado: 1 }, mostarda: { color: '#f2b134', trim: '#c08a1e' } },
  make(g, p) {
    cyl(g, p.trim, 0.3, 0.3, 0.04, 0, 0, 0, 16);
    const body = cyl(g, p.color, 0.33, 0.31, 0.4, 0, 0.04, 0, 16);
    const pipe = cyl(g, p.trim, 0.345, 0.345, 0.035, 0, 0.43, 0, 16);
    const top = ball(g, p.color, 0.335, 0, 0.45, 0, [1, 0.42, 1], 2);
    const btn = ball(g, p.trim, 0.04, 0, 0.59, 0, [1, 0.6, 1]);
    const set = (s) => {
      // o corpo cede um pouco e estufa dos lados; a almofada achata e o botão desce junto
      body.scale.set(1 + 0.06 * s, 1 - 0.05 * s, 1 + 0.06 * s);
      body.position.y = 0.04 + 0.2 * body.scale.y;
      const topo = 0.04 + 0.4 * body.scale.y;
      pipe.position.y = topo + 0.0175;
      top.position.y = topo + 0.02;
      top.scale.y = 0.335 * (0.42 - 0.3 * s);
      btn.position.y = top.position.y + top.scale.y - 0.012;
    };
    g.userData.setProgress = set;
    set(p.afundado);
  },
});
