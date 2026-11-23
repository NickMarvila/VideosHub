import { register, bx, cyl, ball } from '../kit.js';

register('virus', {
  category: 'objetos',
  label: 'Vírus malvado',
  description: 'Bichinho vírus verde-limão, redondo, com espinhos de haste e bolinha na ponta, sobrancelhas bravas e sorrisão malvado com dentes. Ø ~0,5 m com os espinhos, flutuando a 5 cm do chão, frente para +Z. setProgress(obj, 0..1) faz ele inflar e balançar (risada).',
  params: {
    color: ['#7ED957', 'cor do corpo'],
    spike: ['#4FA83D', 'cor das hastes'],
    tip: ['#C6F25E', 'cor das pontas'],
  },
  variants: { toxico: { color: '#A8E03A', spike: '#6E9E1F', tip: '#F2E85E' } },
  make(g, p) {
    const R = 0.19, cy = 0.27;
    const body = ball(g, p.color, R, 0, cy, 0, [1, 1, 1], 2);
    const parts = [];
    // espinhos espalhados (espiral de Fibonacci), sem tampar a cara nem enfiar no chão
    const N = 26;
    for (let i = 0; i < N; i++) {
      const dy = 1 - (2 * (i + 0.5)) / N;
      const rr = Math.sqrt(1 - dy * dy);
      const ph = i * 2.39996;
      const dx = rr * Math.cos(ph), dz = rr * Math.sin(ph);
      if (dz > 0.55 && dy > -0.6 && dy < 0.75) continue;
      if (dy < -0.85) continue;
      const len = 0.06;
      const th = Math.acos(dy), fi = Math.atan2(dz, dx);
      const s = cyl(g, p.spike, 0.014, 0.022, len, 0, 0, 0, 6);
      s.rotation.order = 'YZX';
      s.rotation.set(0, -fi, -th);
      const m = R + len / 2 - 0.01;
      s.position.set(dx * m, cy + dy * m, dz * m);
      const t = ball(g, p.tip, 0.028, dx * (R + len), cy + dy * (R + len), dz * (R + len));
      parts.push(s, t);
    }
    // olhos
    const fz = (x, y) => Math.sqrt(Math.max(0, R * R - x * x - y * y));
    for (const sx of [-1, 1]) {
      const x = 0.065 * sx, y = 0.04;
      ball(g, '#ffffff', 0.042, x, cy + y, fz(x, y) - 0.012, [1, 1.1, 0.5]);
      ball(g, '#1E2227', 0.019, x - 0.008 * sx, cy + y - 0.006, fz(x, y) + 0.012, [1, 1, 0.5]);
      const b = bx(g, '#1E2227', 0.075, 0.018, 0.02, x, cy + 0.085, fz(x, 0.095) - 0.004, 0.008);
      b.rotation.z = -0.45 * sx;
    }
    // sorriso malvado: arco escuro + dentinhos
    for (let k = -5; k <= 5; k++) {
      const x = k * 0.012;
      const y = -0.05 + 0.0016 * k * k;
      ball(g, '#3A1420', 0.02, x, cy + y, fz(x, y) - 0.006, [1, 1, 0.5]);
    }
    for (const x of [-0.035, 0.035]) {
      const y = -0.04 + 0.0016 * (x / 0.012) ** 2;
      const d = bx(g, '#ffffff', 0.018, 0.02, 0.012, x, cy + y - 0.02, fz(x, y) + 0.004, 0.004);
      d.rotation.z = Math.PI;
    }
    g.userData.setProgress = (s) => {
      const k = 1 + 0.08 * Math.sin(s * Math.PI);
      body.scale.set(R * k, R * (2 - k), R * k);
      g.rotation.z = 0.12 * Math.sin(s * Math.PI * 4);
    };
  },
});
