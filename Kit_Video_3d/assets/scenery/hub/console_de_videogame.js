import { register, bx, cyl, ball } from '../kit.js';

register('console_de_videogame', {
  category: 'objetos',
  label: 'Console de videogame',
  description: 'Console genérico preto em pé, sem marca: torre fina de 0,13 × 0,40 × 0,32 m sobre pezinho, faixa de luz verde vertical na frente e controle preto deitado no chão ao lado (+X). Frente para +Z.',
  params: {
    color: ['#1d1f24', 'cor do corpo'],
    trim: ['#33363d', 'cor do pé, frisos e controle'],
    light: ['#39e86b', 'cor da luz da frente'],
    controle: [true, 'mostra o controle ao lado'],
  },
  variants: { branco: { color: '#e9ebee', trim: '#b9bcc4' }, semControle: { controle: false } },
  make(g, p) {
    // pé
    bx(g, p.trim, 0.16, 0.025, 0.24, 0, 0, 0, 0.01);
    // torre
    bx(g, p.color, 0.13, 0.4, 0.32, 0, 0.025, 0, 0.025);
    // friso lateral e respiro no topo
    bx(g, p.trim, 0.135, 0.012, 0.3, 0, 0.3, 0, 0.004);
    bx(g, p.trim, 0.09, 0.008, 0.24, 0, 0.422, 0, 0.003);
    // faixa de luz verde na frente
    bx(g, p.light, 0.018, 0.26, 0.012, 0.035, 0.1, 0.161, 0.005);
    // botão liga e entrada de disco
    cyl(g, p.trim, 0.012, 0.012, 0.01, -0.03, 0.08, 0.161, 10).rotation.x = Math.PI / 2;
    bx(g, '#0b0c0e', 0.012, 0.18, 0.008, -0.03, 0.16, 0.161, 0.003);
    if (p.controle) {
      const cx = 0.27, cz = 0.06;
      bx(g, p.color, 0.16, 0.035, 0.08, cx, 0, cz, 0.015);
      ball(g, p.color, 0.04, cx - 0.065, 0.02, cz + 0.03, [1, 0.5, 1.3]);
      ball(g, p.color, 0.04, cx + 0.065, 0.02, cz + 0.03, [1, 0.5, 1.3]);
      cyl(g, p.trim, 0.012, 0.014, 0.018, cx - 0.035, 0.035, cz + 0.012, 10);
      cyl(g, p.trim, 0.012, 0.014, 0.018, cx + 0.025, 0.035, cz + 0.012, 10);
      ball(g, p.light, 0.008, cx + 0.055, 0.038, cz - 0.015);
      ball(g, p.trim, 0.008, cx + 0.07, 0.038, cz - 0.002);
      bx(g, p.light, 0.03, 0.004, 0.006, cx, 0.035, cz - 0.03, 0.002);
    }
  },
});
