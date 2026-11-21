// Gera storyboard.json do vídeo 'Tales e o décimo terceiro' (cenário fixo repetido em todas as cenas).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DUR = 29.92;
const r2 = (n) => Math.round(n * 100) / 100;

const TALES = { skin: "#d9a27a", top: { color: "#d62828" }, bottom: { color: "#2b2d42", type: "pants" },
  hair: { style: "short", color: "#3b2a1a" }, face: { mustache: true }, hat: { type: "none" } };

const CENARIO = [
  { id: "mercado", asset: "loja", variante: "mercado", pos: [0, 0, 0] },
  { id: "sobrado", asset: "sobrado", variante: "salmao", pos: [-11, 0, 0] },
  { id: "casa", asset: "casa_simples", variante: "azul", pos: [11, 0, 0] },
  { id: "arv1", asset: "arvore_redonda", pos: [-6, 0, 5.5], params: { seed: 2 } },
  { id: "arv2", asset: "arvore_redonda", pos: [7, 0, 5.8], params: { seed: 5 } },
  { id: "poste", asset: "poste_luz", pos: [-4.5, 0, 9] },
  { id: "lixeira", asset: "lixeira", variante: "azul", pos: [3.2, 0, 5.6] },
];
const CINZA = "#b8bec6";
const CORES = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c", "#f15bb5", "#00bbf9", "#c5ca30", "#ef476f"];
const ZC = 11; // z da Paratí
const XF = 3; // onde a Paratí para depois da lombada

const parati = (x = 6, extra = {}) => ({ id: "parati", asset: "carro_hatch", params: { color: CINZA }, pos: [x, 0, ZC], giro: 90, ...extra });

const LOMBADA = { id: "lombada", asset: "forma", params: { tipo: "caixa", tamanho: [0.7, 0.12, 2.6], cor: "#f2c94c" }, pos: [4.3, 0, ZC] };

const shape = (i, pos, giro = 90, extra = {}) => ({ id: `shape${i}`, asset: "forma",
  params: { tipo: "caixa", tamanho: [0.22, 0.04, 0.8], cor: CORES[i] }, pos, giro, ...extra });

// Duas pilhas de 5 shapes no teto da Paratí centrada em xc. mov = [de, ate, xFinal]
function shapesTeto(xc, { aparece, mov, anim } = {}) {
  const out = [];
  for (let i = 0; i < 10; i++) {
    const dz = i % 2 === 0 ? -0.28 : 0.28;
    const dx = 0.06 * ((Math.floor(i / 2) % 3) - 1);
    const y = r2(1.52 + 0.05 * Math.floor(i / 2));
    const s = shape(i, [r2(xc + dx), y, ZC + dz]);
    if (aparece != null) s.aparece = r2(aparece + 0.17 * i);
    if (mov) s.movimentos = [{ de: mov[0], ate: mov[1], para: [r2(mov[2] + dx), ZC + dz] }];
    if (anim) s.anim = anim;
    out.push(s);
  }
  return out;
}

// shapes espalhados no chão em volta da Paratí arriada
const ESPALHADOS = [[-1.5, 2.6, 30], [0.5, 3.4, 120], [2.6, 2.4, 70], [-3.2, 1.2, 160], [4.2, 3.6, 15],
  [-2.4, 4.2, 95], [1.8, 4.8, 140], [5.2, 1.6, 50], [-0.6, 5.4, 10], [3.6, 5.6, 105]];

function shapesChao(voando) {
  return ESPALHADOS.map(([dx, dz, g], i) => {
    const alvo = [r2(XF + dx), r2(ZC + dz)];
    if (voando != null) {
      const t0 = r2(voando + 0.08 * i);
      return shape(i, [r2(XF + dx * 0.15), 0.02, ZC + 0.6], g, {
        aparece: t0, movimentos: [{ de: t0, ate: r2(t0 + 0.55), para: alvo }], anim: { gira: 540, eixo: "y" } });
    }
    return shape(i, [alvo[0], 0.02, alvo[1]], g);
  });
}

const carroPassando = (de, ate, { z = 17, cor = "#3d6fb6", ida = true } = {}) => {
  const [x0, x1] = ida ? [-22, 22] : [22, -22];
  return { id: `carro_${de}`, asset: "carro_sedan", params: { color: cor }, pos: [x0, 0, z],
    giro: ida ? 90 : -90, movimentos: [{ de, ate, para: [x1, z] }] };
};

const tales = (pos, giro = 0, extra = {}) => ({ id: "tales", preset: "homem", overrides: TALES, pos, giro, ...extra });

const cena = (inicio, fim, { objetos = [], personagens = [], camera, ...extra }) =>
  ({ inicio, fim, objetos: [...CENARIO, ...objetos], personagens, camera, ...extra });

// pneu dianteiro do lado da câmera (local do carro)
const PNEU = [-0.9, 0.3, 1.3];
const TALES_CHAO = [XF + 1, 0, ZC + 3.4];

const cenas = [
  // 1-2. Esse é o Tales. Vive dizendo que tá sem dinheiro.
  cena(0, 2.87, {
    objetos: [parati(), carroPassando(0, 2.87)],
    personagens: [tales([-3, 0, 8], 90, {
      movimentos: [{ de: 0, ate: 0.75, para: [-1.5, 8], clip: "walk" }],
      viraPara: [{ em: 0.75, alvo: "camera" }],
      acoes: [{ clip: "wave", de: 0.8, ate: 1.4, expressao: "happy" },
        { clip: "shrug", de: 1.5, ate: 2.87, expressao: "sad" }] })],
    elementos: [{ tipo: "icone", icone: "dinheiro", ancora: "tales", alturaRel: 1.25, dx: 0.17, tamanho: 0.14, de: 1.6, ate: 2.87 },
      { tipo: "icone", icone: "x", ancora: "tales", alturaRel: 1.25, dx: 0.17, tamanho: 0.15, de: 2.0, ate: 2.87 }],
    camera: { tipo: "enquadrar", alvo: "tales", plano: "medio", angulo: 0, elevacao: 8, aproxima: 0.85 },
    textos: [{ texto: "O 13º DO TALES DUROU 1 HORA", de: 0.05, ate: 2.8, estilo: "titulo" }] }),
  // 3. Hoje caiu o décimo terceiro.
  cena(2.87, 5.0, {
    transicao: "flash",
    objetos: [parati(), carroPassando(2.87, 5.0, { cor: "#f2c94c", ida: false })],
    personagens: [tales([-1.5, 0, 8], 0, { viraPara: [{ em: 2.87, alvo: "camera" }],
      acoes: [{ clip: "cheer", de: 3.0, ate: 5.0, expressao: "laugh" }] })],
    fluxos: [{ material: "luz", origem: { ancora: "tales", desloca: [0, 1.2, 0] }, taxa: 40, dispersao: 0.8, de: 3.1, ate: 5.0 }],
    elementos: [{ tipo: "icone", icone: "dinheiro", ancora: "tales", alturaRel: 1.3, dx: 0.2, tamanho: 0.17, pulsa: true, de: 3.2, ate: 5.0 }],
    camera: { tipo: "enquadrar", alvo: "tales", plano: "close", angulo: 10, elevacao: 6, aproxima: 0.9 },
    textos: [{ texto: "CAIU O 13º!", de: 3.4, ate: 5.0, estilo: "destaque" }] }),
  // 4-5. Sabe quanto tempo durou? Uma hora.
  cena(5.0, 7.57, {
    objetos: [parati(), carroPassando(5.0, 7.57, { cor: "#4f9d5a" })],
    personagens: [tales([-1.5, 0, 8], 0, { viraPara: [{ em: 5.0, alvo: "camera" }],
      acoes: [{ clip: "think", de: 5.0, ate: 6.6, expressao: "thinking" },
        { clip: "surprised", de: 6.6, ate: 7.57, expressao: "surprised" }] })],
    elementos: [{ tipo: "icone", icone: "relogio", ancora: "tales", alturaRel: 1.3, dx: -0.2, tamanho: 0.17, pulsa: true, de: 5.3, ate: 7.57 },
      { tipo: "etiqueta", texto: "60 MINUTOS", pos: [0.5, 0.2], ponto: "#ffd60a", de: 6.65, ate: 7.57 }],
    camera: { tipo: "enquadrar", alvo: "tales", plano: "close", angulo: -15, elevacao: 5, aproxima: 0.85 } }),
  // 6-7. Ele comprou dez shapes de skate... e encheu a Paratí.
  cena(7.57, 11.42, {
    transicao: "flash",
    objetos: [parati(), ...shapesTeto(6, { aparece: 9.4 })],
    personagens: [tales([0, 0, 5.4], 0, {
      movimentos: [{ de: 7.65, ate: 9.4, para: [4.6, 9.3], clip: "carry" }],
      acoes: [{ clip: "carry", de: 7.65, ate: 9.4, params: { walking: 1 } },
        { clip: "cheer", de: 10.0, ate: 11.42, expressao: "happy" }],
      viraPara: [{ em: 9.5, alvo: "camera" }] })],
    fluxos: [{ material: "fumaca", origem: { ancora: "parati", desloca: [0, 0.3, -2.1] }, taxa: 10, de: 7.57, ate: 11.42 }],
    camera: { tipo: "travelling", de: { pos: [1, 2.6, 15], olha: [1, 1.2, 5] },
      para: { pos: [5.2, 3.0, 17], olha: [5.4, 1.3, 10.5] } } }),
  // 8-9. Só que tinha um detalhe... o pneu já tava careca.
  cena(11.42, 14.37, {
    transicao: "flash",
    objetos: [parati(), ...shapesTeto(6, { anim: { oscila: { eixo: "y", amp: 0.02, freq: 2 } } })],
    personagens: [tales([8.6, 0, 12.6], 0, { viraPara: [{ em: 11.42, alvo: [7.3, 11.9] }],
      acoes: [{ clip: "crouch", de: 11.5, ate: 14.37, expressao: "worried" }] })],
    fluxos: [{ material: "ar", origem: { ancora: "parati", desloca: PNEU }, taxa: 14, de: 12.9, ate: 14.37 }],
    elementos: [{ tipo: "icone", icone: "alerta", pos: [0.3, 0.3], tamanho: 0.16, pulsa: true, de: 12.9, ate: 14.37 }],
    camera: { tipo: "fixa", pos: [7.6, 0.9, 15.2], olha: [7.6, 0.45, 11.9], fov: 40 } }),
  // 10-11. Na primeira lombada... pou!
  cena(14.37, 16.35, {
    transicao: "flash",
    objetos: [parati(-10, { movimentos: [{ de: 14.4, ate: 15.82, para: [XF, ZC] }] }), LOMBADA,
      ...shapesTeto(-10, { mov: [14.4, 15.82, XF] })],
    fluxos: [{ material: "fumaca", origem: { ancora: "parati", desloca: [0, 0.3, -2.1] }, taxa: 14, de: 14.4, ate: 15.82 },
      { material: "fumaca", origem: { ancora: "parati", desloca: PNEU }, taxa: 70, dispersao: 0.5, de: 15.82, ate: 16.35 },
      { material: "poeira", origem: { ancora: "parati", desloca: PNEU }, taxa: 60, dispersao: 0.6, de: 15.82, ate: 16.3 }],
    efeitos: [{ tipo: "tremor", de: 15.82, ate: 16.3, intensidade: 0.8 }],
    elementos: [{ tipo: "icone", icone: "raio", pos: [0.62, 0.36], tamanho: 0.2, de: 15.82, ate: 16.35 }],
    camera: { tipo: "travelling", de: { pos: [-9, 2.6, 19], olha: [-9, 1, 11] },
      para: { pos: [3.5, 2.2, 18.5], olha: [3.8, 0.8, 11] } } }),
  // 12. Pneu no chão...
  cena(16.35, 18.06, {
    objetos: [parati(XF, { anim: { giro: [[16.35, 0], [16.7, -5]], eixo: "x" } }), LOMBADA, ...shapesTeto(XF)],
    personagens: [tales([6.2, 0, 13.4], 0, { viraPara: [{ em: 16.35, alvo: "parati" }],
      acoes: [{ clip: "surprised", de: 16.4, ate: 18.06, expressao: "surprised" }] })],
    fluxos: [{ material: "fumaca", origem: { ancora: "parati", desloca: PNEU }, taxa: 25, de: 16.35, ate: 18.06 }],
    efeitos: [{ tipo: "pretoebranco", de: 16.4, ate: 18.06, zoom: 1.08 }],
    elementos: [{ tipo: "icone", icone: "x", pos: [0.3, 0.32], tamanho: 0.16, de: 16.6, ate: 18.06 }],
    camera: { tipo: "fixa", pos: [5.6, 1.4, 18.2], olha: [4.8, 0.7, 12], fov: 40 } }),
  // 13. e shape pra todo lado.
  cena(18.06, 20.07, {
    transicao: "flash",
    objetos: [parati(XF), LOMBADA, ...shapesChao(18.1)],
    personagens: [tales(TALES_CHAO, 0, { viraPara: [{ em: 18.06, alvo: "camera" }],
      acoes: [{ clip: "shrug", de: 18.9, ate: 20.07, expressao: "sad" }] })],
    fluxos: [{ material: "poeira", origem: [XF + 1, 0.05, ZC + 2.8], taxa: 40, dispersao: 2.5, de: 18.1, ate: 19.2 }],
    camera: { tipo: "fixa", pos: [XF + 1, 9, ZC + 13], olha: [XF + 1, 0.4, ZC + 3], fov: 42 } }),
  // 14-15. Aaai, ai... Esse Tales.
  cena(20.07, 22.48, {
    objetos: [parati(XF), LOMBADA, carroPassando(20.07, 22.48, { z: 19, cor: "#d9473a" }), ...shapesChao()],
    personagens: [{ id: "velho", preset: "velhinho", pos: [XF + 5.5, 0, ZC + 5], giro: -20,
      viraPara: [{ em: 20.07, alvo: "camera" }],
      acoes: [{ clip: "shake_head", de: 20.2, ate: 22.48, expressao: "sleepy" }] },
    tales(TALES_CHAO, 0, { acoes: [{ clip: "sit", de: 20.07, ate: 22.48, expressao: "sad", params: { seatHeight: 0.0 } }] })],
    camera: { tipo: "enquadrar", alvo: "velho", plano: "medio", angulo: 15, elevacao: 6, deriva: 6 } }),
  // 16. Não pode sobrar um dinheirinho que já quer gastar.
  cena(22.48, 25.36, {
    transicao: "flash",
    objetos: [parati(XF), LOMBADA, ...shapesChao()],
    personagens: [tales(TALES_CHAO, 0, { movimentos: [{ de: 22.6, ate: 25.0, para: [0.5, 5.6], clip: "run" }] })],
    fluxos: [{ material: "luz", origem: { ancora: "tales", desloca: [0.3, 0.9, 0] }, taxa: 20, de: 22.6, ate: 25.0 },
      { material: "poeira", origem: { ancora: "tales", desloca: [0, 0.05, 0] }, taxa: 16, de: 22.6, ate: 25.0 }],
    camera: { tipo: "enquadrar", alvo: "mercado", plano: "geral", angulo: 30, elevacao: 16, deriva: 10 },
    textos: [{ texto: "13º: R$ 0,00", de: 22.7, ate: 25.3, estilo: "destaque" }] }),
  // 17-18. E você? Gastava o décimo terceiro no pneu ou no skate?
  cena(25.36, DUR, {
    transicao: "flash",
    objetos: [parati(XF), LOMBADA, carroPassando(25.36, DUR, { z: 19, ida: false }), ...shapesChao()],
    personagens: [tales(TALES_CHAO, 0, { viraPara: [{ em: 25.36, alvo: "camera" }],
      acoes: [{ clip: "talk", de: 25.36, ate: 28.0, expressao: "happy" },
        { clip: "wave", de: 28.0, ate: DUR, expressao: "laugh" }] })],
    camera: { tipo: "enquadrar", alvo: "tales", plano: "medio", angulo: 0, elevacao: 8, aproxima: 0.85 },
    textos: [{ texto: "PNEU OU SKATE?", de: 25.45, ate: DUR, estilo: "pergunta" }] }),
];

const sb = {
  versao: 1, titulo: "Tales e o décimo terceiro",
  formato: { largura: 1080, altura: 1920, fps: 30 },
  duracao: DUR, audio: "narracao.wav", palavras: "palavras.json",
  legendas: { ativo: true, palavrasPorBloco: 1, corDestaque: "#ffd60a" },
  ambiente: { horario: "dia", fundo: "cidade", chao: "concreto", nuvens: true },
  cenas,
};
writeFileSync(join(AQUI, "storyboard.json"), JSON.stringify(sb, null, 1), "utf8");
console.log("ok", cenas.length, "cenas");
