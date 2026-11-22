import { register, bx, cyl, ball, wheel } from '../kit.js';

register('tanque_de_guerra', {
  category: 'objetos',
  label: 'Tanque de guerra',
  description: 'Tanque cartoon verde-oliva arredondado: esteiras com 5 rodas por lado, torre em cúpula com escotilha e antena, canhão curto. 2,1 m de comprimento, 1,3 m de largura, 1,6 m até a ponta da antena. Canhão para +Z.',
  params: {
    color: ['#6B7A3A', 'cor principal (verde-oliva)'],
    escuro: ['#4E5A2A', 'cor das sombras e detalhes'],
    esteira: ['#2E3034', 'cor da esteira'],
    antena: [1, '1 mostra a antena, 0 esconde'],
  },
  variants: { deserto: { color: '#C2A66B', escuro: '#9A814E' }, inverno: { color: '#DADFD8', escuro: '#9EA6A0' } },
  make(g, p) {
    const c = p.color, d = p.escuro, t = p.esteira;
    // esteiras, rodas e para-lamas
    for (const sx of [-1, 1]) {
      const x = sx * 0.5;
      bx(g, t, 0.3, 0.42, 2.0, x, 0.0, 0, 0.16);
      for (let i = 0; i < 5; i++) wheel(g, x + sx * 0.06, 0.2, -0.72 + i * 0.36, 0.15, 0.22, '#3A3D42', '#8F9A5A');
      wheel(g, x + sx * 0.06, 0.25, 0.92, 0.12, 0.2, '#3A3D42', '#8F9A5A');
      wheel(g, x + sx * 0.06, 0.25, -0.92, 0.12, 0.2, '#3A3D42', '#8F9A5A');
      bx(g, c, 0.36, 0.05, 2.12, x, 0.42, 0, 0.02);
    }
    // casco
    bx(g, c, 0.78, 0.36, 1.9, 0, 0.22, 0, 0.1);
    bx(g, c, 1.06, 0.12, 1.6, 0, 0.47, -0.05, 0.05);
    const frente = bx(g, c, 0.98, 0.1, 0.42, 0, 0.42, 0.82, 0.05);
    frente.rotation.x = 0.35;
    // faróis e escapamentos
    for (const sx of [-1, 1]) {
      ball(g, '#F2D06B', 0.06, sx * 0.36, 0.6, 0.98, [1, 1, 0.6]);
      cyl(g, '#3A3D42', 0.05, 0.05, 0.12, sx * 0.3, 0.55, -0.95, 8);
    }
    // torre em cúpula
    cyl(g, d, 0.46, 0.5, 0.08, 0, 0.59, -0.1, 14);
    ball(g, c, 0.46, 0, 0.67, -0.1, [1, 0.62, 1.05], 2);
    // escotilha
    cyl(g, d, 0.16, 0.17, 0.06, -0.12, 0.92, -0.2, 12);
    ball(g, '#3A3D42', 0.035, -0.12, 0.99, -0.2);
    // canhão curto (cilindro deitado ao longo de +Z)
    const can = cyl(g, d, 0.075, 0.085, 0.62, 0, 0.72 - 0.31, 0.6, 10);
    can.rotation.x = Math.PI / 2;
    const base = cyl(g, d, 0.16, 0.18, 0.14, 0, 0.72 - 0.07, 0.33, 10);
    base.rotation.x = Math.PI / 2;
    const boca = cyl(g, '#3A3D42', 0.11, 0.11, 0.12, 0, 0.72 - 0.06, 0.93, 10);
    boca.rotation.x = Math.PI / 2;
    // antena
    if (p.antena) {
      cyl(g, '#2E3034', 0.012, 0.018, 0.72, 0.22, 0.86, -0.38, 6);
      ball(g, '#D9473A', 0.035, 0.22, 1.6, -0.38);
    }
    // estrela amarela genérica (disco) nas laterais da torre
    for (const sx of [-1, 1]) ball(g, '#F2C94C', 0.07, sx * 0.45, 0.72, -0.1, [0.25, 1, 1]);
  },
});
