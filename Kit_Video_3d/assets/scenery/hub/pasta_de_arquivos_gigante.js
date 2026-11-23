import { register, bx } from '../kit.js';

// Letreiro em segmentos (estilo visor digital): cada caractere vira barrinhas.
const SEG = { '0': 'abcdef', '2': 'abged', '9': 'abcdfg', G: 'afedcH', B: 'abcdefg' };
function letreiro(g, cor, txt, x0, y, z, w = 0.075, h = 0.14, t = 0.022, passo = 0.1) {
  let x = x0;
  for (const ch of txt) {
    if (ch === ' ') { x += passo * 0.6; continue; }
    const cx = x + w / 2;
    for (const s of SEG[ch] || '') {
      if (s === 'a') bx(g, cor, w, t, t, cx, y + h - t, z, 0.005);
      if (s === 'g') bx(g, cor, w, t, t, cx, y + h / 2 - t / 2, z, 0.005);
      if (s === 'H') bx(g, cor, w / 2, t, t, cx + w / 4, y + h / 2 - t / 2, z, 0.005);
      if (s === 'd') bx(g, cor, w, t, t, cx, y, z, 0.005);
      if (s === 'f') bx(g, cor, t, h / 2, t, cx - w / 2 + t / 2, y + h / 2, z, 0.005);
      if (s === 'b') bx(g, cor, t, h / 2, t, cx + w / 2 - t / 2, y + h / 2, z, 0.005);
      if (s === 'e') bx(g, cor, t, h / 2, t, cx - w / 2 + t / 2, y, z, 0.005);
      if (s === 'c') bx(g, cor, t, h / 2, t, cx + w / 2 - t / 2, y, z, 0.005);
    }
    x += passo;
  }
}

register('pasta_de_arquivos_gigante', {
  category: 'objetos', label: 'Pasta de arquivos gigante',
  description: 'Pasta amarela de computador, enorme e estufada de papéis, com etiqueta branca "209 GB" na frente. 1,5 × 1,2 × 0,5 m.',
  params: { color: ['#f2c94c', 'cor da pasta'], back: ['#dca52c', 'cor da aba de trás'], label: ['#ffffff', 'cor da etiqueta'] },
  variants: { azul: { color: '#5aa9e6', back: '#3f86c4' }, vermelha: { color: '#e8604c', back: '#c4473a' } },
  make(g, p) {
    // painel de trás com a aba
    bx(g, p.back, 1.5, 1.12, 0.06, 0, 0, -0.24, 0.04);
    bx(g, p.back, 0.55, 0.16, 0.06, -0.44, 1.06, -0.24, 0.04);
    // papéis saindo por cima (cada folha um pouco torta)
    const folhas = [[-0.42, 0.05, '#ffffff'], [-0.05, -0.04, '#f1f1ea'], [0.3, 0.07, '#ffffff'], [0.5, -0.1, '#e9eef5']];
    folhas.forEach(([x, rot, cor], i) => {
      const f = bx(g, cor, 0.5, 1.1, 0.04, x, 0.02 + (i % 2) * 0.04, -0.16 + i * 0.07, 0.01);
      f.rotation.z = rot;
    });
    // corpo estufado
    bx(g, p.color, 1.5, 0.98, 0.46, 0, 0, 0, 0.16);
    bx(g, p.back, 1.42, 0.035, 0.03, 0, 0.9, 0.225, 0.01); // vinco da borda
    // etiqueta branca com contorno escuro
    bx(g, '#1e2227', 0.68, 0.3, 0.02, 0, 0.39, 0.225, 0.02);
    bx(g, p.label, 0.64, 0.26, 0.02, 0, 0.41, 0.235, 0.02);
    letreiro(g, '#1e2227', '209 GB', -0.268, 0.47, 0.25);
  },
});
