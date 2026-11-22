// Mundo genérico do estilo "Cartoon 3D" do VideosHub: o mesmo visual do motor da skill cartoon-audio-short
// (github.com/mromidev/claude-animated-shorts, MIT): céu em 5 faixas, sol relativo à câmera, luz em dois tons,
// casas pintadas, personagens-figurinha com cabeça de feijão, mas montado a partir de um storyboard em JSON.
import * as THREE from "three";
import { Batch, house, lam, definirVisao, Ray } from "./ponte/build";
import { grassHD, cobbleHD, cloudHD, rep } from "./ponte/paint";
import { bodyFront, fxContact, fxStars, fxBurst, fxNote, fxPuff, Pen, Outfit, Expr, INK, SKIN } from "./ponte/toon";
import { LIGHTS, LOOK } from "./ponte/lights";
import { TONE, CHAR, untone, twoTone } from "./ponte/shade";
import { NOINK } from "./ponte/ink";
import { Pool, Actor, Fx } from "./ponte/cast";
import type { CenaCartoon, StoryboardCartoon, AtorCartoon, Chave } from "./tipos";
import { construir3D, desenhar2D, OBJETOS_3D } from "./objetos";
const POSES = new Set(["comemora", "maos_cabeca", "abre", "maos_cintura", "aponta", "pensa", "segura", "decepcao"]);

export const FPS = 30;
type V3 = [number, number, number];
const ss = (u: number) => { const x = Math.min(1, Math.max(0, u)); return x * x * x * (x * (x * 6 - 15) + 10); }; // smootherstep

/** valor numérico com chaves [tempo, valor] (interpolação suave) */
export const valor = (v: number | Chave<number>[] | undefined, t: number, padrao = 0): number => {
  if (v === undefined) return padrao;
  if (typeof v === "number") return v;
  if (!v.length) return padrao;
  if (t <= v[0][0]) return v[0][1];
  for (let i = 1; i < v.length; i++) if (t <= v[i][0]) { const [t0, a] = v[i - 1], [t1, b] = v[i]; return a + (b - a) * ss((t - t0) / Math.max(1e-3, t1 - t0)); }
  return v[v.length - 1][1];
};
const ultimo = <T,>(v: Chave<T>[] | undefined, t: number, padrao: T): T => { let r = padrao; for (const [tt, x] of v ?? []) if (t >= tt) r = x; return r; };

// expressões em português → nomes do motor
const EXPR: Record<string, Expr> = {
  neutro: "neutral", serio: "stern", sorriso: "smile", sorriso_fechado: "smile_closed", sorrisao: "grin", riso: "laugh",
  assobio: "whistle", nervoso: "nervous", choque: "shock", susto: "shock", alivio: "relief", alivio_aberto: "relief_open",
  tonto: "dazed", dor: "pained", lambendo: "lick", decepcao: "disappointed", decepcionado: "disappointed",
};
const expr = (e: string): Expr => EXPR[e] ?? (e as Expr);

// câmera: chaves { t, pos, olha, fov, roll } com deslizamento suave; segurar = aproximação lenta automática
export function cameraEm(cena: CenaCartoon, t: number) {
  const ks = cena.camera ?? [];
  if (!ks.length) return { pos: [0, 1.7, 9] as V3, olha: [0, 1.3, 0] as V3, fov: 40, roll: 0 };
  let a = ks[0], b = ks[0], u = 0;
  for (let i = 0; i < ks.length; i++) {
    if (t >= ks[i].t) { a = ks[i]; b = ks[i + 1] ?? ks[i]; u = b === a ? 0 : (t - a.t) / Math.max(1e-3, b.t - a.t); }
  }
  u = ss(u);
  const L = (x: V3, y: V3): V3 => [x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u, x[2] + (y[2] - x[2]) * u];
  let pos = L(a.pos, b.pos);
  const olha = L(a.olha, b.olha);
  // nada fica parado: durante a última chave a câmera se aproxima 0,2 % por quadro
  const parado = t - (ks[ks.length - 1].t);
  if (parado > 0) {
    const k = Math.min(0.25, parado * FPS * 0.002);
    pos = [pos[0] + (olha[0] - pos[0]) * k, pos[1] + (olha[1] - pos[1]) * k, pos[2] + (olha[2] - pos[2]) * k];
  }
  return { pos, olha, fov: (a.fov ?? 40) + ((b.fov ?? a.fov ?? 40) - (a.fov ?? 40)) * u, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * u };
}

const plano = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  return g;
};
const rnd = (i: number, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

export class Mundo {
  root = new THREE.Group();
  private pool = new Pool();
  private atores: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sol: THREE.DirectionalLight;
  private ceu: THREE.Mesh; private ceuMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private disco: THREE.Sprite;
  private nuvens: THREE.Mesh[] = [];
  private nuvemMaps: Record<"day" | "golden", THREE.Texture[]>;
  private cenarios = new Map<string, THREE.Group>();
  private solCache = new Map<number, THREE.Vector3>();
  private pecas = new Map<string, { g: THREE.Group; rodas: THREE.Object3D[] }>();

  constructor() {
    const R = this.root;
    this.ceuMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.ceu = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.ceuMat);
    this.ceu.renderOrder = -1; this.ceu.frustumCulled = false; this.ceu.layers.set(NOINK); R.add(this.ceu);
    const dc = document.createElement("canvas"); dc.width = dc.height = 128;
    const g = dc.getContext("2d")!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.45, "#ffffff"); gr.addColorStop(0.6, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    this.disco = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(dc), color: new THREE.Color(6, 4.4, 2.4), fog: false, depthWrite: false }));
    this.disco.layers.set(NOINK); this.disco.frustumCulled = false; R.add(this.disco);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sol = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sol.castShadow = true; this.sol.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sol, this.sol.target);
    this.nuvemMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.nuvemMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.nuvens.push(m); R.add(m);
    }
  }

  // ---------------- cenários prontos ----------------
  private cenario(nome: string, sb?: StoryboardCartoon) {
    let grp = this.cenarios.get(nome);
    if (grp) return grp;
    // linhas de visão de todas as câmeras que usam este cenário: casas e árvores no caminho não são construídas
    const raios: Ray[] = [];
    for (const c of sb?.cenas ?? []) if ((c.cenario || "vila") === nome) for (const k of c.camera ?? []) {
      const o = new THREE.Vector3(...k.pos), alvo = new THREE.Vector3(...k.olha), d = alvo.clone().sub(o), len = d.length();
      if (len < 0.01) continue;
      d.normalize();
      raios.push({ o, d, len: len + 2, core: true });
      for (const lado of [-1, 1]) { // um pouco para os lados (o quadro vertical é estreito, mas o fundo do desfoque não)
        const lat = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(lado * 1.2);
        raios.push({ o: o.clone().add(lat), d, len: len * 0.8, core: false });
      }
    }
    definirVisao(raios);
    const noCaminho = (x: number, z: number, r: number) => raios.some(({ o, d, len }) => {
      const px = x - o.x, pz = z - o.z, dh = Math.hypot(d.x, d.z) || 1, ux = d.x / dh, uz = d.z / dh;
      const s = Math.max(0, Math.min(len * dh, px * ux + pz * uz));
      return Math.hypot(px - ux * s, pz - uz * s) < r;
    });
    grp = new THREE.Group();
    const b = new Batch();
    const grama = lam("gramaHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const pedra = lam("paraleloHD", () => ({ map: rep(cobbleHD(), 1, 1) }));
    b.add(plano(-900, 900, -900, 900, 450, 450, -0.01), grama);
    if (nome === "vila" || nome === "praca") {
      // rua de paralelepípedo ao longo de x (z de -4 a 4) e casas pintadas dos dois lados
      b.add(plano(-140, 140, -4, 4, 70, 2, 0.01), pedra);
      if (nome === "praca") b.add(plano(-14, 14, -14, 14, 7, 7, 0.012), pedra);
      for (const lado of [-1, 1]) {
        let x = -70, i = lado > 0 ? 0 : 3;
        while (x < 70) {
          const w = 7 + Math.round(rnd(i, 1) * 3), h = [7, 8.4, 9.8][i % 3], d = 8;
          const z = lado * (nome === "praca" ? 19 : 10.5);
          if (!(nome === "praca" && Math.abs(x) < 16 && false)) house(b, x + w / 2, z, lado > 0 ? Math.PI : 0, w, d, h, i, 0);
          x += w + 0.6 + rnd(i, 2) * 1.5; i++;
        }
      }
    }
    // colinas ao longe (esferas meio enterradas) e árvores de copa redonda
    const morro = twoTone(new THREE.MeshLambertMaterial({ color: "#6fae5a" }), 0.2);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, d = 260 + rnd(i, 3) * 120, r = 70 + rnd(i, 4) * 60;
      const geo = new THREE.SphereGeometry(r, 18, 10); geo.translate(Math.cos(a) * d, -r * 0.55, Math.sin(a) * d);
      b.add(geo, morro);
    }
    const copa = twoTone(new THREE.MeshLambertMaterial({ color: "#5d9e4a" }), 0.2);
    const tronco = twoTone(new THREE.MeshLambertMaterial({ color: "#7a5232" }), 0.15);
    const arvores = nome === "campo" ? 40 : 18;
    for (let i = 0; i < arvores; i++) {
      const lado = rnd(i, 5) > 0.5 ? 1 : -1;
      const x = (rnd(i, 6) - 0.5) * (nome === "campo" ? 160 : 140);
      const z = nome === "campo" ? (rnd(i, 7) - 0.5) * 160 : lado * (18 + rnd(i, 7) * 30);
      if (nome === "campo" && Math.abs(z) < 6 && Math.abs(x) < 12) continue;
      if (noCaminho(x, z, 3.5)) continue;
      const h = 3 + rnd(i, 8) * 2.5;
      const tg = new THREE.CylinderGeometry(0.18, 0.26, h, 8); tg.translate(x, h / 2, z); b.add(tg, tronco);
      for (let k = 0; k < 4; k++) {
        const r = 1.3 + rnd(i * 7 + k, 9) * 0.9;
        const sg = new THREE.SphereGeometry(r, 14, 10);
        sg.translate(x + (rnd(i, k + 10) - 0.5) * 1.6, h + r * 0.5 + (rnd(i, k + 20) - 0.3) * 1.2, z + (rnd(i, k + 30) - 0.5) * 1.6);
        b.add(sg, copa);
      }
    }
    if (nome === "campo") { // uma casinha de fazenda e uma trilha de terra
      const terra = twoTone(new THREE.MeshLambertMaterial({ color: "#c9a36b" }), 0.15);
      b.add(plano(-120, 120, -1.6, 1.6, 60, 1, 0.012), terra);
      house(b, 12, -14, 0, 8, 7, 7, 2, 0);
    }
    b.build(grp);
    grp.visible = false;
    this.root.add(grp);
    this.cenarios.set(nome, grp);
    return grp;
  }

  private ator(i: number) { while (this.atores.length <= i) this.atores.push(new Actor(this.root)); return this.atores[i]; }
  private efeito(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private solDaCena(idx: number, cena: CenaCartoon, luz: "day" | "golden") {
    let v = this.solCache.get(idx);
    if (v) return v;
    const c = cameraEm(cena, cena.inicio);
    let fx = c.olha[0] - c.pos[0], fz = c.olha[2] - c.pos[2]; const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const L = LIGHTS[luz];
    const az = THREE.MathUtils.degToRad(cena.solAz ?? L.az), el = THREE.MathUtils.degToRad(cena.solEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.solCache.set(idx, v);
    return v;
  }

  /** posa o mundo no quadro f da cena idx; devolve o ponto de foco padrão (para onde a câmera olha) */
  update(sb: StoryboardCartoon, idx: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const cena = sb.cenas[idx], t = f / FPS;
    const luz = cena.luz === "golden" || cena.luz === "fim_de_tarde" ? "golden" : "day";
    const L = LIGHTS[luz], K = LOOK[luz];
    for (const [nome, g] of this.cenarios) g.visible = nome === (cena.cenario || "vila");
    this.cenario(cena.cenario || "vila", sb).visible = true;
    // câmera
    const c = cameraEm(cena, t);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.olha); cam.rotateZ(THREE.MathUtils.degToRad(c.roll));
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const foco = new THREE.Vector3(...c.olha);
    // luz em dois tons + sol relativo à câmera, congelado por cena
    const sunDir = this.solDaCena(idx, cena, luz);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sol.color.set(L.sunCol); this.sol.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(cam.position.distanceTo(foco) * 1.15 + 7, 12, 95);
    if (luz === "golden") Rr = Math.max(Rr, 30);
    this.sol.position.copy(foco).addScaledVector(sunDir, 220); this.sol.target.position.copy(foco);
    const sc = this.sol.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sol.shadow.bias = L.bias; this.sol.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.ceuMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.ceu.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    this.disco.visible = luz === "golden";
    if (this.disco.visible) { this.disco.position.copy(cam.position).addScaledVector(sunDir, 900); this.disco.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.nuvens.length; i++) {
      const m = this.nuvens[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.nuvemMaps[luz][i % 4];
    }
    // elenco: figurinhas viradas para a câmera (só no eixo vertical), com sombra de contato
    let ai = 0, fi = 0;
    const luzAng = Math.PI * 0.75; // de onde vem a luz no desenho
    for (const a of cena.atores ?? []) {
      const roupa = sb.elenco[a.id];
      if (!roupa) continue;
      const x = valor(a.x as never, t, 0), z = valor(a.z as never, t, 0);
      const anda = a.andar === false ? false : Array.isArray(a.x) || Array.isArray(a.z) ? Math.hypot(valor(a.x as never, t + 0.05, 0) - x, valor(a.z as never, t + 0.05, 0) - z) > 0.01 : false;
      const seed = [...a.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 7 + 1;
      const pisca = ((f + seed * 37) % 96) < 4 ? 1 : 0;
      const ex = expr(ultimo(a.expressoes, t, "neutro"));
      const acao = ultimo(a.acoes, t, "parado");
      const olhar = valor(a.olhar as never, t, 0);
      const fase = anda ? t * 1.9 : 0;
      const aceno = acao === "acena" ? (Math.sin(t * 9) + 1) / 2 : undefined;
      const pose = POSES.has(acao) ? acao : acao === "pulo" ? "comemora" : undefined;
      const desdeAcao = t - ([...(a.acoes ?? [])].reverse().find(([tt]) => t >= tt)?.[0] ?? 0);
      const pulo = acao === "pulo" ? Math.abs(Math.sin(desdeAcao * Math.PI * 2.4)) * 0.38 : 0;
      const tremor = acao === "tremer" ? Math.sin(f * 2.3) * 0.035 : 0;
      const modo = acao === "senta" ? "sit" : acao === "cai" ? "fall" : anda ? "stroll" : "stand";
      const d = cam.position.distanceTo(new THREE.Vector3(x, 1.2, z));
      const [w, h, k] = d < 5 ? [600, 1000, 1] : d < 14 ? [420, 700, 0.7] : [300, 500, 0.5];
      const chave = `${a.id}|${ex}|${modo}|${anda ? Math.round((fase % 1) * 24) : 0}|${pisca}|${aceno !== undefined ? Math.round(aceno * 8) : -1}|${Math.round(olhar * 4)}|${pose ?? ""}|${w}`;
      const ac = this.ator(ai++);
      ac.r = this.pool.req(chave, w, h, k, (p: Pen) => bodyFront(p, roupa, { phase: fase, expr: ex, mode: modo as never, look: olhar, blink: pisca, light: luzAng, seed, wave: aceno, pose, headTilt: pose === "decepcao" ? 7 : 0 }));
      ac.mesh.visible = true;
      const altura = valor(a.y as never, t, 0);
      ac.mesh.position.set(x + tremor, pulo + altura, z);
      ac.mesh.rotation.set(0, Math.atan2(cam.position.x - x, cam.position.z - z), 0);
      const esc = a.escala ?? 1;
      ac.mesh.scale.set(a.espelhar ? -esc : esc, esc, esc);
      ac.mesh.castShadow = L.actorShadow;
      // sombra de contato no chão
      const fx = this.efeito(fi++);
      const cc = luz === "golden" ? "#3d3554" : "#353a55";
      fx.r = this.pool.req(`blob|contact|${cc}`, 128, 128, 1, (p: Pen) => fxContact(p, cc));
      fx.mesh.visible = true; fx.mesh.position.set(x, 0.02 + altura, z); fx.mesh.rotation.set(-Math.PI / 2, 0, 0); fx.mesh.scale.set(0.6 * esc, 0.45 * esc, 1);
    }
    // objetos: peças 3D (com tinta e sombra) e figurinhas 2D desenhadas
    for (const [, pc] of this.pecas) pc.g.visible = false;
    (cena.objetos ?? []).forEach((o, i) => {
      if (o.aparece !== undefined && t < o.aparece) return;
      if (o.some !== undefined && t >= o.some) return;
      const pop = o.aparece !== undefined ? Math.min(1, (t - o.aparece) / 0.2) : 1;
      const esc = (o.escala ?? 1) * (0.5 + 0.5 * pop + Math.sin(Math.min(1, (t - (o.aparece ?? -9)) / 0.33) * Math.PI) * 0.12);
      const x = valor(o.x as never, t, 0), z = valor(o.z as never, t, 0);
      if ((OBJETOS_3D as readonly string[]).includes(o.tipo)) {
        const k = `${idx}:${i}`;
        let pc = this.pecas.get(k);
        if (!pc) { pc = construir3D(o.tipo, o.cor); this.pecas.set(k, pc); this.root.add(pc.g); }
        pc.g.visible = true;
        pc.g.position.set(x, valor(o.y as never, t, 0), z);
        let giro = THREE.MathUtils.degToRad(valor(o.giro as never, t, 0));
        if (o.movendo && (Array.isArray(o.x) || Array.isArray(o.z))) {
          const dx = valor(o.x as never, t + 0.05, 0) - x, dz = valor(o.z as never, t + 0.05, 0) - z;
          if (Math.hypot(dx, dz) > 1e-3) giro = Math.atan2(-dz, dx);
          const dist = Math.hypot(valor(o.x as never, t, 0) - valor(o.x as never, cena.inicio, 0), valor(o.z as never, t, 0) - valor(o.z as never, cena.inicio, 0));
          for (const r of pc.rodas) r.rotation.z = -dist / 0.36;
        }
        pc.g.rotation.set(0, giro, 0);
        pc.g.scale.setScalar(esc);
      } else {
        const fx = this.efeito(fi++);
        fx.r = this.pool.req(`obj|${o.tipo}|${o.texto ?? ""}|${o.icone ?? ""}|${o.cor ?? ""}`, 512, 512, 1, desenhar2D(o));
        fx.use(false);
        fx.mesh.visible = true;
        fx.mesh.position.set(x, valor(o.y as never, t, 2.2), z);
        fx.mesh.quaternion.copy(cam.quaternion);
        fx.mesh.rotateZ(THREE.MathUtils.degToRad(valor(o.giro as never, t, 0)));
        const tam = 0.8 * esc; fx.mesh.scale.set(tam, tam, 1);
      }
    });
    // efeitos 2D (estrelas, explosão, notas, poeira) colados na cena
    for (const e of cena.efeitos ?? []) {
      if (t < e.de || t >= e.ate) continue;
      const u = (t - e.de) / Math.max(0.05, e.ate - e.de);
      const fx = this.efeito(fi++);
      const desenho = e.tipo === "estrelas" ? (p: Pen) => fxStars(p, u) : e.tipo === "notas" ? (p: Pen) => fxNote(p, Math.floor(t * 4) % 3)
        : e.tipo === "poeira" ? (p: Pen) => fxPuff(p, u) : (p: Pen) => fxBurst(p, u);
      fx.r = this.pool.req(`fx|${e.tipo}|${Math.round(u * 20)}`, 512, 512, 1, desenho);
      fx.use(e.tipo === "poeira");
      fx.mesh.visible = true;
      fx.mesh.position.set(...e.pos);
      fx.mesh.quaternion.copy(cam.quaternion);
      const tam = e.tamanho ?? 1; fx.mesh.scale.set(tam, tam, 1);
    }
    for (let i = ai; i < this.atores.length; i++) this.atores[i].mesh.visible = false;
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.atores[i].bind();
    for (let i = 0; i < fi; i++) this.fxs[i].bind();
    return foco;
  }
}

export { INK, SKIN };
export type { Outfit, AtorCartoon };
