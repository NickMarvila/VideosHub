import { register, bx, cyl, ball } from '../kit.js';

// Anel de luz (cooler) de frente para +Z, centro em (x, y, z).
function fan(g, cor, miolo, r, x, y, z) {
  const a = cyl(g, cor, r, r, 0.012, x, y - 0.006, z, 16);
  a.rotation.x = Math.PI / 2;
  const b = cyl(g, miolo, r * 0.66, r * 0.66, 0.014, x, y - 0.007, z + 0.002, 16);
  b.rotation.x = Math.PI / 2;
  const c = cyl(g, cor, r * 0.2, r * 0.2, 0.016, x, y - 0.008, z + 0.004, 10);
  c.rotation.x = Math.PI / 2;
}

register('pc_gamer', {
  category: 'objetos',
  label: 'PC gamer neon na mesa',
  description: 'Setup gamer neon: mesa roxa escura 1,5 m × 0,75 m, gabinete à esquerda com 3 coolers (ciano, magenta, amarelo) e fita de luz, monitor largo de tela escura, teclado com teclas em arco-íris, mouse e fone no suporte. Frente para +Z.',
  params: {
    mesa: ['#2b2340', 'cor da mesa'],
    gabinete: ['#18141f', 'cor do gabinete e do monitor'],
    luz1: ['#22e4ff', 'luz do cooler de cima'],
    luz2: ['#ff2fd0', 'luz do cooler do meio'],
    luz3: ['#ffd23d', 'luz do cooler de baixo'],
    tela: ['#0b0e14', 'cor da tela (escura = desligada)'],
  },
  variants: {
    ligado: { tela: '#3a7bd5' },
    verde: { luz1: '#5dff6a', luz2: '#22e4ff', luz3: '#5dff6a' },
  },
  make(g, p) {
    const H = 0.75;
    // mesa com laterais em placa
    bx(g, p.mesa, 1.5, 0.05, 0.72, 0, H - 0.05, 0);
    for (const x of [-0.71, 0.71]) bx(g, p.mesa, 0.05, H - 0.05, 0.64, x, 0, 0);
    bx(g, p.mesa, 1.37, 0.28, 0.03, 0, H - 0.33, -0.3); // painel de fundo
    bx(g, p.luz2, 1.42, 0.012, 0.012, 0, H - 0.062, 0.355, 0.004); // LED na borda

    // gabinete (esquerda)
    const gx = -0.52, gz = -0.04;
    bx(g, p.gabinete, 0.26, 0.54, 0.46, gx, H, gz);
    bx(g, '#2a2440', 0.22, 0.48, 0.01, gx, H + 0.03, gz + 0.232, 0.005); // vidro frontal
    fan(g, p.luz1, '#120f18', 0.07, gx, H + 0.43, gz + 0.24);
    fan(g, p.luz2, '#120f18', 0.07, gx, H + 0.28, gz + 0.24);
    fan(g, p.luz3, '#120f18', 0.07, gx, H + 0.13, gz + 0.24);
    // fitas de luz nas quinas
    bx(g, p.luz1, 0.012, 0.48, 0.012, gx - 0.124, H + 0.03, gz + 0.232, 0.004);
    bx(g, p.luz2, 0.012, 0.48, 0.012, gx + 0.124, H + 0.03, gz + 0.232, 0.004);
    bx(g, p.luz3, 0.2, 0.01, 0.4, gx, H + 0.54, gz, 0.004); // luz no topo
    ball(g, '#e8eaee', 0.013, gx + 0.09, H + 0.515, gz + 0.235);
    for (const x of [-0.1, 0.1]) bx(g, '#0c0a10', 0.04, 0.015, 0.42, gx + x, H, gz);

    // monitor largo
    const mx = 0.1, mz = -0.18;
    bx(g, p.gabinete, 0.3, 0.012, 0.18, mx, H, mz);
    bx(g, p.gabinete, 0.05, 0.22, 0.04, mx, H + 0.012, mz - 0.03);
    bx(g, p.gabinete, 0.8, 0.42, 0.04, mx, H + 0.18, mz);
    bx(g, p.tela, 0.76, 0.37, 0.01, mx, H + 0.2, mz + 0.022, 0.005);
    bx(g, p.luz1, 0.7, 0.01, 0.01, mx, H + 0.178, mz + 0.022, 0.003); // filete de luz embaixo da tela

    // teclado com teclas arco-íris
    const kz = 0.14;
    bx(g, p.gabinete, 0.48, 0.025, 0.16, mx, H, kz);
    const cores = ['#ff2fd0', '#ffd23d', '#5dff6a', '#22e4ff'];
    cores.forEach((c, i) => bx(g, c, 0.44, 0.012, 0.026, mx, H + 0.025, kz - 0.05 + i * 0.033, 0.004));

    // mouse com mousepad
    bx(g, '#120f18', 0.3, 0.004, 0.25, 0.5, H, 0.15, 0.002);
    ball(g, p.gabinete, 0.04, 0.5, H + 0.02, 0.15, [0.8, 0.45, 1.2]);
    ball(g, p.luz2, 0.009, 0.5, H + 0.038, 0.125);

    // fone no suporte (direita, atrás)
    const fx = 0.6, fz = -0.2;
    cyl(g, p.gabinete, 0.06, 0.06, 0.012, fx, H, fz, 12);
    bx(g, p.gabinete, 0.02, 0.3, 0.02, fx, H + 0.012, fz);
    bx(g, p.luz1, 0.2, 0.025, 0.05, fx, H + 0.31, fz, 0.01); // arco
    for (const s of [-1, 1]) {
      bx(g, p.luz1, 0.022, 0.1, 0.04, fx + s * 0.095, H + 0.22, fz, 0.008);
      const c = cyl(g, p.gabinete, 0.04, 0.04, 0.03, fx + s * 0.085, H + 0.19, fz, 12);
      c.rotation.z = Math.PI / 2;
    }
  },
});
