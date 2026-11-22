import { register, bx, cyl, ball, wheel } from '../kit.js';

register('caminhao', {
  category: 'veiculos',
  label: 'Caminhão anos 1930',
  description: 'Caminhãozinho de carroceria aberta dos anos 1930, verde-oliva desbotado, cabine fechada, capô comprido, para-lamas arredondados e faróis redondos. Carroceria de tábuas com um pedestal no meio para prender a metralhadora (topo do pedestal em y 1,45, z -1,0). 1,9 × 4,6 m, 2,0 m de altura. Rodas giram com rollWheels(). Frente para +Z.',
  params: {
    color: ['#7b8256', 'cor da lataria (verde-oliva desbotado)'],
    fender: ['#5f6544', 'cor dos para-lamas'],
    wood: ['#9a7a52', 'cor das tábuas da carroceria'],
    suporte: [true, 'pedestal da metralhadora na carroceria'],
  },
  variants: { sem_suporte: { suporte: false }, areia: { color: '#a39a6b', fender: '#7d7650' } },
  make(g, p) {
    const c = p.color, f = p.fender, dark = '#2b2f34';
    // chassi e rodas
    bx(g, dark, 1.1, 0.18, 4.2, 0, 0.42, 0, 0.03);
    for (const sx of [-1, 1]) {
      wheel(g, sx * 0.78, 0.38, 1.45, 0.38, 0.18);
      wheel(g, sx * 0.78, 0.38, -1.25, 0.38, 0.2);
    }
    // capô e grade do radiador
    bx(g, c, 0.86, 0.58, 1.0, 0, 0.6, 1.55, 0.1);
    bx(g, '#3a3e33', 0.72, 0.62, 0.08, 0, 0.58, 2.06, 0.03);
    for (let i = -3; i <= 3; i++) bx(g, '#8c8f86', 0.03, 0.5, 0.04, i * 0.09, 0.63, 2.11, 0.005);
    cyl(g, '#8c8f86', 0.04, 0.04, 0.08, 0, 1.2, 1.98, 8); // tampa do radiador
    // para-choque
    bx(g, dark, 1.7, 0.1, 0.1, 0, 0.42, 2.18, 0.03);
    // cabine fechada
    bx(g, c, 1.5, 0.7, 0.9, 0, 0.5, 0.65, 0.08);
    bx(g, c, 1.42, 0.62, 0.8, 0, 1.2, 0.62, 0.06);
    bx(g, '#4a4f3a', 1.56, 0.08, 1.0, 0, 1.82, 0.6, 0.04); // teto
    bx(g, '#bcd9e0', 1.2, 0.42, 0.04, 0, 1.3, 1.03, 0.01); // para-brisa
    for (const sx of [-1, 1]) bx(g, '#bcd9e0', 0.04, 0.36, 0.5, sx * 0.72, 1.32, 0.7, 0.01);
    bx(g, '#bcd9e0', 0.8, 0.3, 0.04, 0, 1.36, 0.21, 0.01); // vidro traseiro
    // para-lamas arredondados e estribo
    for (const sx of [-1, 1]) {
      ball(g, f, 0.5, sx * 0.78, 0.8, 1.45, [0.5, 0.38, 1.0], 2);
      ball(g, f, 0.5, sx * 0.85, 0.82, -1.25, [0.46, 0.34, 0.95], 2);
      bx(g, f, 0.3, 0.06, 1.25, sx * 0.8, 0.5, 0.15, 0.02);
      // faróis redondos sobre os para-lamas
      cyl(g, dark, 0.03, 0.03, 0.25, sx * 0.55, 0.85, 1.85, 6);
      ball(g, '#4a4f3a', 0.13, sx * 0.55, 1.15, 1.88, [1, 1, 0.8], 2);
      ball(g, '#fff6c8', 0.1, sx * 0.55, 1.15, 1.96, [1, 1, 0.4], 2);
    }
    // carroceria de tábuas
    bx(g, p.wood, 1.84, 0.1, 2.5, 0, 0.86, -1.05, 0.02);
    for (const sx of [-1, 1]) {
      bx(g, p.wood, 0.06, 0.18, 2.5, sx * 0.89, 0.96, -1.05, 0.015);
      bx(g, p.wood, 0.06, 0.18, 2.5, sx * 0.89, 1.17, -1.05, 0.015);
      for (const z of [-2.25, -1.05, 0.15]) bx(g, f, 0.08, 0.45, 0.08, sx * 0.9, 0.92, z, 0.01);
    }
    bx(g, p.wood, 1.84, 0.4, 0.06, 0, 0.96, -2.28, 0.015);
    bx(g, p.wood, 1.84, 0.5, 0.06, 0, 0.96, 0.17, 0.015);
    for (const sx of [-1, 1]) bx(g, '#c0392b', 0.12, 0.08, 0.04, sx * 0.75, 0.72, -2.32, 0.02); // lanternas
    if (p.suporte) {
      cyl(g, dark, 0.22, 0.28, 0.08, 0, 0.96, -1.0, 10);
      cyl(g, '#4a4f3a', 0.06, 0.07, 0.42, 0, 1.03, -1.0, 8);
      cyl(g, dark, 0.12, 0.12, 0.05, 0, 1.43, -1.0, 10);
    }
  },
});
