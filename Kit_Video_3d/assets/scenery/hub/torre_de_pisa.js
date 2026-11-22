import * as THREE from 'three';
import { register, bx, cyl, ball, mesh, rbox } from '../kit.js';

// Torre inclinada de mármore creme: base, 6 galerias com colunata e arcos, campanário com sino.
// setProgress(p): sobe andar por andar (p = 3/8 → obra parada com 3 andares; p = 1 → completa com sino).
const ANDARES = 8; // base + 6 galerias + campanário

register('torre_de_pisa', {
  category: 'predios',
  label: 'Torre de Pisa',
  description: 'Torre cilíndrica de mármore creme com colunatas em arcos em cada andar e sino no topo, inclinada (inclinacao em graus, para +X). ~12 m de altura, 3,6 m de diâmetro. setProgress(p) constrói andar por andar: variante "obra" = 3 andares, "completa" = torre inteira.',
  params: {
    progress: [1, 'etapa 0..1 (3/8 = 3 andares; 1 = completa)'],
    inclinacao: [4, 'inclinação em graus (para +X)'],
    marmore: ['#f1e8d0', 'mármore das colunas e cornijas'],
    miolo: ['#d8c9a3', 'parede de dentro das galerias'],
    sino: ['#b98a3a', 'cor do sino'],
  },
  variants: { obra: { progress: 3 / 8 }, completa: { progress: 1 }, reta: { inclinacao: 0 }, quase_reta: { inclinacao: 1.5 } },
  make(g, p) {
    const torre = new THREE.Group();
    torre.rotation.z = -THREE.MathUtils.degToRad(p.inclinacao); // pivô na base, tomba para +X
    g.add(torre);
    const R = 1.8; // raio externo (colunas)
    const andares = [];
    const novo = (y) => { const a = new THREE.Group(); a.position.y = y; torre.add(a); andares.push(a); return a; };
    const colunata = (a, h, n, r) => {
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        cyl(a, p.marmore, 0.09, 0.1, h - 0.32, Math.cos(t) * r, 0.12, Math.sin(t) * r, 6);
        const tm = ((i + 0.5) / n) * Math.PI * 2; // arco entre duas colunas
        const corda = 2 * r * Math.sin(Math.PI / n);
        mesh(rbox(corda * 0.95, 0.2, 0.16, 0.06), p.marmore, { pos: [Math.cos(tm) * r, h - 0.3, Math.sin(tm) * r], rot: [0, -tm + Math.PI / 2, 0], parent: a });
        ball(a, p.marmore, 0.11, Math.cos(tm) * r, h - 0.34, Math.sin(tm) * r, [corda * 3.2, 0.9, 0.9], 0);
      }
      cyl(a, p.marmore, R + 0.12, R + 0.12, 0.12, 0, 0, 0, 20); // piso da galeria
      cyl(a, p.marmore, R + 0.16, R + 0.16, 0.14, 0, h - 0.14, 0, 20); // cornija
    };

    // andar 1: base fechada com arcos cegos
    const b = novo(0);
    cyl(b, p.marmore, R + 0.15, R + 0.25, 0.3, 0, 0, 0, 20);
    cyl(b, p.miolo, R - 0.05, R - 0.05, 2.0, 0, 0.3, 0, 20);
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 2;
      cyl(b, p.marmore, 0.12, 0.13, 1.7, Math.cos(t) * R, 0.3, Math.sin(t) * R, 6);
    }
    cyl(b, p.marmore, R + 0.18, R + 0.18, 0.16, 0, 2.0, 0, 20);

    // andares 2..7: galerias abertas com colunata
    const hG = 1.25;
    for (let k = 0; k < 6; k++) {
      const a = novo(2.16 + k * hG);
      cyl(a, p.miolo, R - 0.45, R - 0.45, hG, 0, 0, 0, 16);
      colunata(a, hG, 14, R);
    }

    // andar 8: campanário menor, com telhadinho e sino
    const c = novo(2.16 + 6 * hG);
    cyl(c, p.miolo, 1.0, 1.0, 1.35, 0, 0, 0, 14);
    colunata(c, 1.35, 10, 1.25);
    cyl(c, '#c96f4a', 0.2, 1.3, 0.55, 0, 1.35, 0, 14); // telhadinho
    cyl(c, p.marmore, 0.08, 0.08, 0.3, 0, 1.9, 0, 6);
    const sino = new THREE.Group();
    sino.position.set(0, 0.95, 1.0);
    c.add(sino);
    cyl(sino, p.sino, 0.12, 0.3, 0.42, 0, -0.42, 0, 10);
    ball(sino, p.sino, 0.07, 0, -0.47, 0, [1, 1, 1], 0);
    bx(sino, '#6b4a2b', 0.5, 0.06, 0.06, 0, 0, 0, 0.01);

    g.userData.setProgress = (t) => {
      const n = t * ANDARES;
      andares.forEach((a, i) => { const k = Math.min(1, Math.max(0, n - i)); a.visible = k > 0.001; a.scale.y = Math.max(0.001, k); });
    };
    g.userData.setProgress(p.progress);
    g.userData.update = (t) => { sino.rotation.z = Math.sin(t * 3) * 0.25; }; // sino balança
  },
});
