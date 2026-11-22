// Objetos de cena do estilo Cartoon 3D: peças 3D low-poly (recebem a tinta do mundo e a luz em dois tons) e
// figurinhas 2D desenhadas no canvas (dinheiro, smartwatch, balões, ícones), no mesmo traço dos personagens.
import * as THREE from "three";
import { twoTone } from "./ponte/shade";
import type { Pen } from "./ponte/toon";

export const OBJETOS_3D = ["parati", "caixa_som", "banco", "poste", "cone", "mesa", "caixote", "pneu", "caminhao", "metralhadora", "tanque_de_guerra", "plantacao_de_trigo", "torre_de_pisa", "esponja_molhada", "terra_retirada"] as const;
export const OBJETOS_2D = ["dinheiro", "moeda", "relogio", "celular", "balao", "pensamento", "icone", "seta"] as const;

const mats = new Map<string, THREE.Material>();
const mat = (cor: string, brilho = 0.18) => {
  const k = `${cor}|${brilho}`;
  let m = mats.get(k);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: cor }), brilho); mats.set(k, m); }
  return m;
};
const caixa = (g: THREE.Group, cor: string, w: number, h: number, d: number, x: number, y: number, z: number) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(cor)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};
const cil = (g: THREE.Group, cor: string, r: number, h: number, x: number, y: number, z: number, deitado = false) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat(cor)); m.position.set(x, y, z);
  if (deitado) m.rotation.x = Math.PI / 2;
  m.castShadow = true; g.add(m); return m;
};

/** metralhadora de cano grosso com carregador redondo; base 0 = tripé no chão, 1 = pedestal (no caminhão) */
function metralhadora(g: THREE.Group, base: 0 | 1) {
  const cinza = "#3d4248", topo = base ? 0.75 : 0.7;
  if (base) cil(g, "#4a4f45", 0.07, topo, 0, topo / 2, 0);
  else for (const a of [0, 2.1, 4.2]) {
    const p = cil(g, "#4a4f45", 0.035, 0.85, Math.cos(a) * 0.22, 0.36, Math.sin(a) * 0.22);
    p.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
  }
  caixa(g, cinza, 0.55, 0.2, 0.18, -0.05, topo, 0);                    // corpo
  const jaqueta = cil(g, "#55606a", 0.085, 0.7, 0.52, topo + 0.1, 0); jaqueta.rotation.z = Math.PI / 2;   // cano grosso
  const ponta = cil(g, "#25282d", 0.035, 0.22, 0.97, topo + 0.1, 0); ponta.rotation.z = Math.PI / 2;
  cil(g, "#2c3036", 0.2, 0.07, 0.0, topo + 0.26, 0);                   // carregador redondo
  caixa(g, "#7a5232", 0.3, 0.13, 0.12, -0.45, topo + 0.03, 0);         // coronha
}

/** cilindro (ou tronco de cone) com a base apoiada em y */
const cilB = (g: THREE.Object3D, cor: string, rTopo: number, rBase: number, h: number, x: number, y: number, z: number, seg = 16) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTopo, rBase, h, seg), mat(cor)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};
const bola = (g: THREE.Object3D, cor: string, r: number, x: number, y: number, z: number, esc: [number, number, number] = [1, 1, 1]) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat(cor)); m.position.set(x, y, z); m.scale.set(...esc); m.castShadow = true; g.add(m); return m;
};

/** Torre de Pisa (porte da peça do kit 3D): 8 andares (base, 6 galerias, campanário), ~12 m, tomba para +x.
 *  atualizar(etapa 0..1, inclinacao em graus, t): etapa 3/8 = obra com 3 andares; 1 = completa. */
function torreDePisa(g: THREE.Group) {
  const marmore = "#f1e8d0", miolo = "#d8c9a3", R = 1.8, hG = 1.25;
  const torre = new THREE.Group(); g.add(torre);
  const andares: THREE.Group[] = [];
  const novo = (y: number) => { const a = new THREE.Group(); a.position.y = y; torre.add(a); andares.push(a); return a; };
  const colunata = (a: THREE.Group, h: number, n: number, r: number) => {
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2, tm = ((i + 0.5) / n) * Math.PI * 2, corda = 2 * r * Math.sin(Math.PI / n);
      cilB(a, marmore, 0.09, 0.1, h - 0.32, Math.cos(t) * r, 0.12, Math.sin(t) * r, 6);
      const arco = new THREE.Mesh(new THREE.BoxGeometry(corda * 0.95, 0.2, 0.16), mat(marmore));
      arco.position.set(Math.cos(tm) * r, h - 0.2, Math.sin(tm) * r); arco.rotation.y = -tm + Math.PI / 2; a.add(arco);
    }
    cilB(a, marmore, R + 0.12, R + 0.12, 0.12, 0, 0, 0, 20);         // piso da galeria
    cilB(a, marmore, R + 0.16, R + 0.16, 0.14, 0, h - 0.14, 0, 20);  // cornija
  };
  const b = novo(0);                                                  // base com arcos cegos
  cilB(b, marmore, R + 0.15, R + 0.25, 0.3, 0, 0, 0, 20);
  cilB(b, miolo, R - 0.05, R - 0.05, 2.0, 0, 0.3, 0, 20);
  for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; cilB(b, marmore, 0.12, 0.13, 1.7, Math.cos(t) * R, 0.3, Math.sin(t) * R, 6); }
  cilB(b, marmore, R + 0.18, R + 0.18, 0.16, 0, 2.0, 0, 20);
  for (let k = 0; k < 6; k++) { const a = novo(2.16 + k * hG); cilB(a, miolo, R - 0.45, R - 0.45, hG, 0, 0, 0, 16); colunata(a, hG, 14, R); }
  const c = novo(2.16 + 6 * hG);                                      // campanário com telhadinho e sino
  cilB(c, miolo, 1.0, 1.0, 1.35, 0, 0, 0, 14); colunata(c, 1.35, 10, 1.25);
  cilB(c, "#c96f4a", 0.2, 1.3, 0.55, 0, 1.35, 0, 14);
  const sino = new THREE.Group(); sino.position.set(0, 0.95, 1.0); c.add(sino);
  cilB(sino, "#b98a3a", 0.12, 0.3, 0.42, 0, -0.42, 0, 10);
  return (etapa: number, inclinacao: number, t: number) => {
    torre.rotation.z = -THREE.MathUtils.degToRad(inclinacao);
    const n = etapa * andares.length;
    andares.forEach((a, i) => { const k = Math.min(1, Math.max(0, n - i)); a.visible = k > 0.001; a.scale.y = Math.max(0.001, k); });
    sino.rotation.z = Math.sin(t * 3) * 0.25;
  };
}

/** monta a peça 3D; devolve o grupo, as rodas (para girar quando o objeto anda) e, se houver, o atualizar(etapa, inclinacao, t) */
export function construir3D(tipo: string, cor?: string): { g: THREE.Group; rodas: THREE.Object3D[]; atualizar?: (etapa: number, inclinacao: number, t: number) => void } {
  const g = new THREE.Group(), rodas: THREE.Object3D[] = [];
  if (tipo === "torre_de_pisa") return { g, rodas, atualizar: torreDePisa(g) };
  if (tipo === "esponja_molhada") { // esponja amarela com face verde, gotas azuis e poça (0,5 × 0,32 m)
    cilB(g, "#7fc3ee", 0.32, 0.32, 0.01, 0, 0, 0, 16);
    caixa(g, cor ?? "#f7d046", 0.5, 0.17, 0.32, 0, 0.01, 0);
    caixa(g, "#3fa34d", 0.5, 0.05, 0.32, 0, 0.18, 0);
    for (const [x, z] of [[-0.27, 0.12], [0.27, -0.06], [0.1, 0.2], [-0.12, 0.2]]) bola(g, "#4fa3e0", 0.022, x, 0.04, z, [1, 1.4, 1]);
    return { g, rodas };
  }
  if (tipo === "terra_retirada") { // monte de terra marrom com pá fincada (~1,4 m de base)
    const terra = cor ?? "#8a5a36";
    bola(g, terra, 0.7, 0, 0.05, 0, [1.0, 0.42, 0.8]); bola(g, terra, 0.48, -0.08, 0.3, 0.02, [1.0, 0.6, 0.85]); bola(g, terra, 0.3, 0.05, 0.5, 0, [1.0, 0.65, 0.9]);
    for (const [x, z, r] of [[0.62, 0.35, 0.09], [-0.6, 0.4, 0.07], [0.45, -0.45, 0.08], [-0.2, 0.6, 0.06], [0.75, -0.05, 0.06]]) bola(g, "#6b4327", r, x, r * 0.6, z, [1, 0.7, 1]);
    const s = new THREE.Group(); s.position.set(0.08, 0.62, 0.02); s.rotation.set(0.12, 0, -0.28); g.add(s);
    caixa(s as THREE.Group, "#8c939b", 0.24, 0.3, 0.035, 0, -0.41, 0);
    cilB(s, "#a87a4a", 0.028, 0.028, 0.78, 0, 0.12, 0, 8);
    caixa(s as THREE.Group, "#5a3b26", 0.16, 0.05, 0.05, 0, 0.86, 0);
    return { g, rodas };
  }
  if (tipo === "parati") { // perua compacta com bagageiro, frente para +x
    const c = cor ?? "#b8bec6";
    caixa(g, c, 4.3, 0.75, 1.7, 0, 0.35, 0);
    caixa(g, c, 3.0, 0.62, 1.6, -0.35, 1.1, 0);
    caixa(g, "#9fd3ef", 2.6, 0.48, 1.62, -0.32, 1.16, 0);       // vidros
    caixa(g, c, 0.12, 0.56, 1.64, 0.3, 1.12, 0);                 // coluna do meio
    caixa(g, "#3a4048", 2.4, 0.06, 1.3, -0.35, 1.72, 0);         // bagageiro
    caixa(g, "#f6d77a", 0.06, 0.18, 0.4, 2.16, 0.72, 0.55); caixa(g, "#f6d77a", 0.06, 0.18, 0.4, 2.16, 0.72, -0.55);
    caixa(g, "#e2453c", 0.06, 0.18, 0.3, -2.16, 0.72, 0.6); caixa(g, "#e2453c", 0.06, 0.18, 0.3, -2.16, 0.72, -0.6);
    for (const [x, z] of [[1.4, 0.82], [1.4, -0.82], [-1.45, 0.82], [-1.45, -0.82]]) {
      const r = new THREE.Group(); r.position.set(x, 0.36, z);
      const pneu = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 20), mat("#25282d")); pneu.rotation.x = Math.PI / 2; r.add(pneu);
      const calota = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.28), mat("#aeb6bf")); r.add(calota);
      g.add(r); rodas.push(r);
    }
  } else if (tipo === "caixa_som") {
    caixa(g, cor ?? "#2b2f36", 0.8, 1.4, 0.6, 0, 0, 0);
    for (const [y, r] of [[1.05, 0.2], [0.45, 0.3]]) { const m = cil(g, "#4a5058", r, 0.06, 0, y, 0.31, true); m.rotation.x = Math.PI / 2; cil(g, "#16181c", r * 0.4, 0.07, 0, y, 0.33, true); }
  } else if (tipo === "banco") {
    caixa(g, cor ?? "#a9743f", 1.8, 0.08, 0.45, 0, 0.42, 0); caixa(g, cor ?? "#a9743f", 1.8, 0.4, 0.06, 0, 0.62, -0.2);
    for (const x of [-0.75, 0.75]) caixa(g, "#3a4048", 0.08, 0.42, 0.42, x, 0, 0);
  } else if (tipo === "poste") {
    cil(g, "#5a6170", 0.07, 4.2, 0, 2.1, 0); caixa(g, "#5a6170", 0.9, 0.08, 0.1, 0.4, 4.1, 0);
    const luz = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.6) })); luz.position.set(0.8, 4.0, 0); g.add(luz);
  } else if (tipo === "cone") {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 16), mat(cor ?? "#f28c28")); m.position.y = 0.3; m.castShadow = true; g.add(m);
    caixa(g, "#f4f4ef", 0.26, 0.08, 0.26, 0, 0.32, 0).scale.set(0.9, 1, 0.9);
  } else if (tipo === "mesa") {
    caixa(g, cor ?? "#b07a4c", 1.4, 0.08, 0.8, 0, 0.74, 0);
    for (const [x, z] of [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]]) caixa(g, "#7a5232", 0.07, 0.74, 0.07, x, 0, z);
  } else if (tipo === "caixote") {
    caixa(g, cor ?? "#b88a52", 0.8, 0.8, 0.8, 0, 0, 0); caixa(g, "#7a5232", 0.84, 0.08, 0.84, 0, 0.36, 0);
  } else if (tipo === "pneu") {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.14, 10, 22), mat("#25282d")); m.position.y = 0.47; g.add(m);
  } else if (tipo === "metralhadora") { // metralhadora antiga de tripé, cano para +x, carregador redondo em cima
    metralhadora(g, 0);
  } else if (tipo === "caminhao") { // caminhãozinho anos 1930, carroceria aberta com a metralhadora presa; frente para +x
    const c = cor ?? "#6f7d4c";
    caixa(g, "#3a3f2e", 4.4, 0.22, 1.5, 0, 0.5, 0);                        // chassi
    caixa(g, c, 1.2, 0.7, 1.4, 1.55, 0.72, 0);                              // capô
    caixa(g, "#3a4048", 0.08, 0.6, 1.1, 2.18, 0.76, 0);                     // grade
    caixa(g, c, 1.1, 1.25, 1.6, 0.5, 0.72, 0);                              // cabine
    caixa(g, "#9fd3ef", 0.06, 0.5, 1.3, 1.06, 1.35, 0);                     // para-brisa
    caixa(g, "#9fd3ef", 0.7, 0.42, 1.62, 0.5, 1.38, 0);                     // vidros laterais
    caixa(g, c, 1.2, 0.08, 1.7, 0.5, 1.97, 0);                              // teto
    caixa(g, "#9a7a4e", 2.4, 0.1, 1.7, -1.25, 0.72, 0);                     // assoalho da carroceria
    for (const z of [0.82, -0.82]) caixa(g, "#a9864f", 2.4, 0.42, 0.08, -1.25, 0.82, z);
    caixa(g, "#a9864f", 0.08, 0.42, 1.7, -2.42, 0.82, 0);
    for (const [x, z] of [[1.45, 0.78], [1.45, -0.78], [-1.3, 0.85], [-1.3, -0.85]]) {     // para-lamas
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16, 1, false, 0, Math.PI), mat(c));
      pl.rotation.set(Math.PI / 2, 0, -Math.PI / 2); pl.position.set(x, 0.5, z); pl.castShadow = true; g.add(pl);
    }
    for (const z of [0.5, -0.5]) { const f = cil(g, "#f6d77a", 0.13, 0.1, 2.2, 1.05, z); f.rotation.z = Math.PI / 2; }   // faróis redondos
    for (const [x, z] of [[1.45, 0.8], [1.45, -0.8], [-1.3, 0.8], [-1.3, -0.8]]) {
      const r = new THREE.Group(); r.position.set(x, 0.42, z);
      const pneu = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 20), mat("#25282d")); pneu.rotation.x = Math.PI / 2; r.add(pneu);
      const calota = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.26), mat("#8a8f78")); r.add(calota);
      g.add(r); rodas.push(r);
    }
    const mg = new THREE.Group(); mg.position.set(-1.2, 0.82, 0); metralhadora(mg, 1); g.add(mg);
  } else if (tipo === "tanque_de_guerra") { // tanque cartoon verde-oliva, esteiras e canhão curto para +x
    const c = cor ?? "#5f6e3e";
    for (const z of [0.85, -0.85]) {
      caixa(g, "#2e3128", 3.0, 0.7, 0.5, 0, 0, z);
      for (const x of [-1.1, -0.37, 0.37, 1.1]) { const r = cil(g, "#4a4e40", 0.28, 0.52, x, 0.35, z); r.rotation.x = Math.PI / 2; }
    }
    caixa(g, c, 2.8, 0.55, 1.4, 0, 0.55, 0);
    caixa(g, c, 0.5, 0.3, 1.4, 1.45, 0.62, 0).rotation.z = -0.5;
    const torre = cil(g, c, 0.62, 0.5, -0.15, 1.35, 0); torre.scale.set(1.15, 1, 1);
    const cano = cil(g, "#4f5c33", 0.11, 1.4, 0.95, 1.38, 0); cano.rotation.z = Math.PI / 2;
    cil(g, c, 0.2, 0.18, -0.25, 1.68, 0);                                     // escotilha
  } else if (tipo === "plantacao_de_trigo") { // touceira de trigo dourado (~0,8 m) para espalhar como lavoura
    const ouro = cor ?? "#e0b84a";
    for (let i = 0; i < 11; i++) {
      const a = i * 2.39, r = 0.12 + (i % 4) * 0.09, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = 0.62 + ((i * 37) % 10) / 40;
      const haste = cil(g, "#c9a23f", 0.018, h, x, h / 2, z); haste.rotation.z = (x) * 0.4; haste.rotation.x = -z * 0.4;
      const esp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(ouro)); esp.scale.set(1, 2.6, 1);
      esp.position.set(x * 1.25, h + 0.1, z * 1.25); esp.castShadow = true; g.add(esp);
    }
  }
  return { g, rodas };
}

// ---------------- figurinhas 2D (canvas 512 x 512, desenho centrado) ----------------
const TINTA = "#1e2227";
export type Obj2D = { tipo: string; texto?: string; icone?: string; cor?: string };
export function desenhar2D(o: Obj2D) {
  return (p: Pen) => {
    const g = p.g;
    g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = TINTA; g.lineWidth = 14;
    const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    const txt = (s: string, y: number, tam: number, cor = TINTA) => { g.fillStyle = cor; g.font = `900 ${tam}px Arial Black, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, 256, y); };
    if (o.tipo === "dinheiro") {
      g.save(); g.translate(256, 256); g.rotate(-0.15); g.translate(-256, -256);
      rr(46, 150, 420, 212, 22); g.fillStyle = o.cor ?? "#7cc48a"; g.fill(); g.stroke();
      g.beginPath(); g.arc(256, 256, 62, 0, 7); g.fillStyle = "#a9ddb2"; g.fill(); g.lineWidth = 10; g.stroke(); txt("R$", 258, 62, "#2f7a45"); g.restore();
    } else if (o.tipo === "moeda") {
      g.beginPath(); g.arc(256, 256, 170, 0, 7); g.fillStyle = o.cor ?? "#f2c94c"; g.fill(); g.stroke();
      g.beginPath(); g.arc(256, 256, 120, 0, 7); g.lineWidth = 8; g.strokeStyle = "#b8902a"; g.stroke(); txt("$", 262, 170, "#b8902a");
    } else if (o.tipo === "relogio") {
      rr(206, 40, 100, 432, 30); g.fillStyle = "#2f3640"; g.fill(); g.stroke();
      rr(136, 126, 240, 260, 60); g.fillStyle = "#1e2227"; g.fill(); g.stroke();
      rr(162, 152, 188, 208, 40); g.fillStyle = o.cor ?? "#1f6fa8"; g.fill(); txt(o.texto ?? "12:00", 256, 64, "#ffffff");
    } else if (o.tipo === "celular") {
      rr(156, 46, 200, 420, 36); g.fillStyle = "#1e2227"; g.fill(); g.stroke(); rr(176, 82, 160, 340, 14); g.fillStyle = o.cor ?? "#4b8bd0"; g.fill();
      if (o.texto) txt(o.texto, 252, 44, "#ffffff");
    } else if (o.tipo === "balao" || o.tipo === "pensamento") {
      const t = o.texto ?? "";
      const tam = t.length > 14 ? 44 : t.length > 9 ? 56 : 70;
      rr(26, 90, 460, 260, 120); g.fillStyle = "#ffffff"; g.fill(); g.stroke();
      if (o.tipo === "balao") { g.beginPath(); g.moveTo(170, 336); g.lineTo(120, 470); g.lineTo(250, 342); g.fillStyle = "#ffffff"; g.fill(); g.stroke(); g.fillRect(168, 326, 84, 26); }
      else for (const [x, y, r] of [[150, 400, 30], [110, 456, 18]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = "#ffffff"; g.fill(); g.lineWidth = 10; g.stroke(); }
      const linhas = t.length > 18 ? [t.slice(0, t.lastIndexOf(" ", 18) > 0 ? t.lastIndexOf(" ", 18) : 18), t.slice((t.lastIndexOf(" ", 18) > 0 ? t.lastIndexOf(" ", 18) : 18) + 1)] : [t];
      linhas.forEach((l, i) => txt(l, 220 + (i - (linhas.length - 1) / 2) * (tam + 6), tam));
    } else if (o.tipo === "icone") {
      const cores: Record<string, string> = { "!": "#f2b134", "?": "#3c6fa8", "x": "#e2453c", "v": "#3c9d5d", "$": "#3c9d5d", "coracao": "#e2453c" };
      const ic = o.icone ?? "!";
      g.beginPath(); g.arc(256, 256, 180, 0, 7); g.fillStyle = cores[ic] ?? "#f2b134"; g.fill(); g.stroke();
      txt(({ x: "✕", v: "✓", coracao: "♥" } as Record<string, string>)[ic] ?? ic, 268, 220, "#ffffff");
    } else if (o.tipo === "seta") {
      g.beginPath(); g.moveTo(60, 200); g.lineTo(300, 200); g.lineTo(300, 120); g.lineTo(460, 256); g.lineTo(300, 392); g.lineTo(300, 312); g.lineTo(60, 312); g.closePath();
      g.fillStyle = o.cor ?? "#3c8ee0"; g.fill(); g.stroke();
    }
  };
}
