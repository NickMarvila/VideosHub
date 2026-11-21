import React from "react";

/**
 * Rig vetorial de personagem no estilo flat minimalista.
 * Tudo é parâmetro: o mesmo desenho em todo vídeo, o que garante a persistência.
 *
 * Coordenadas: viewBox 0 0 360 540. Centro do corpo em x=180.
 */

export type Boca = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";
export type Expressao = "neutro" | "feliz" | "surpreso" | "bravo" | "triste" | "duvida";
export type Pose = "neutro" | "apontando" | "bracos_abertos" | "pensando" | "maos_na_cintura" | "comemorando" | "segurando";

export type Visual = {
  pele: string;
  camisa: string;
  calca: string;
  sapato: string;
  olhos: string;
  chapeu: { tipo: "bone" | "gorro" | "capacete" | "nenhum"; cor: string };
  cabelo?: string;
  barba: boolean;
  bigode?: boolean;
  detalhe?: "cinto_ferramentas" | "lenco" | "nenhum";
  corDetalhe?: string;
};

type Props = {
  visual: Visual;
  boca?: Boca;
  expressao?: Expressao;
  pose?: Pose;
  piscando?: boolean;
  /** -1 a 1: para onde os olhos olham na horizontal */
  olhar?: number;
  /** 0..1: respiração/balanço sutil, vem do frame */
  respiro?: number;
  /** espelha o personagem (olhando para a esquerda) */
  espelhar?: boolean;
  altura?: number;
  /** fase do passo (em ciclos): quando definido, as pernas andam */
  passo?: number;
};

// Ângulos [ombro, cotovelo] em graus. 0 = braço para baixo. Esq = lado esquerdo da tela.
const POSES: Record<Pose, { esq: [number, number]; dir: [number, number] }> = {
  neutro: { esq: [8, 0], dir: [-8, 0] },
  apontando: { esq: [8, 0], dir: [-100, -10] },
  bracos_abertos: { esq: [65, 15], dir: [-65, -15] },
  pensando: { esq: [8, 0], dir: [20, 150] },
  maos_na_cintura: { esq: [40, -95], dir: [-40, 95] },
  comemorando: { esq: [155, 20], dir: [-155, -20] },
  segurando: { esq: [8, 0], dir: [-55, -70] },
};

const SOBRANCELHAS: Record<Expressao, { esq: [number, number]; dir: [number, number] }> = {
  // [deslocamento vertical, rotação]
  neutro: { esq: [0, 0], dir: [0, 0] },
  feliz: { esq: [-4, -6], dir: [-4, 6] },
  surpreso: { esq: [-12, -4], dir: [-12, 4] },
  bravo: { esq: [3, 18], dir: [3, -18] },
  triste: { esq: [-2, -16], dir: [-2, 16] },
  duvida: { esq: [0, 0], dir: [-12, 8] },
};

const Braco: React.FC<{ x: number; y: number; angulos: [number, number]; cor: string; pele: string }> = ({
  x, y, angulos, cor, pele,
}) => {
  const SEG = 62;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angulos[0]})`}>
      <rect x={-12} y={-6} width={24} height={SEG + 10} rx={12} fill={cor} />
      <g transform={`translate(0 ${SEG}) rotate(${angulos[1]})`}>
        <rect x={-11} y={-10} width={22} height={SEG} rx={11} fill={cor} />
        <circle cx={0} cy={SEG} r={14} fill={pele} />
      </g>
    </g>
  );
};

const BocaForma: React.FC<{ boca: Boca; expressao: Expressao }> = ({ boca, expressao }) => {
  const escuro = "#3A2420";
  const lingua = "#C9605A";
  const dente = "#F4F1EA";
  switch (boca) {
    case "A": // M B P: fechada
      return <rect x={-12} y={-2} width={24} height={4} rx={2} fill={escuro} />;
    case "B": // levemente aberta, dentes
      return (
        <g>
          <rect x={-13} y={-4} width={26} height={8} rx={4} fill={escuro} />
          <rect x={-10} y={-4} width={20} height={3} fill={dente} />
        </g>
      );
    case "C": // aberta (EH)
      return (
        <g>
          <ellipse cx={0} cy={1} rx={13} ry={8} fill={escuro} />
          <rect x={-9} y={-7} width={18} height={3} fill={dente} />
        </g>
      );
    case "D": // bem aberta (AA)
      return (
        <g>
          <ellipse cx={0} cy={3} rx={15} ry={12} fill={escuro} />
          <rect x={-10} y={-8} width={20} height={3} fill={dente} />
          <ellipse cx={0} cy={10} rx={8} ry={4} fill={lingua} />
        </g>
      );
    case "E": // arredondada (AO)
      return <ellipse cx={0} cy={2} rx={9} ry={10} fill={escuro} />;
    case "F": // bico (UW, OO)
      return <ellipse cx={0} cy={1} rx={6} ry={7} fill={escuro} />;
    case "G": // F, V: dentes no lábio
      return (
        <g>
          <rect x={-12} y={-3} width={24} height={7} rx={3} fill={escuro} />
          <rect x={-10} y={-3} width={20} height={4} fill={dente} />
        </g>
      );
    case "H": // L: língua
      return (
        <g>
          <ellipse cx={0} cy={1} rx={12} ry={9} fill={escuro} />
          <ellipse cx={0} cy={-2} rx={6} ry={4} fill={lingua} />
        </g>
      );
    case "X":
    default: {
      // repouso: depende da expressão
      if (expressao === "feliz") return <path d="M -14 -3 Q 0 10 14 -3" stroke={escuro} strokeWidth={4} fill="none" strokeLinecap="round" />;
      if (expressao === "triste" || expressao === "bravo") return <path d="M -12 5 Q 0 -5 12 5" stroke={escuro} strokeWidth={4} fill="none" strokeLinecap="round" />;
      if (expressao === "surpreso") return <ellipse cx={0} cy={2} rx={6} ry={7} fill={escuro} />;
      return <rect x={-12} y={-2} width={24} height={4} rx={2} fill={escuro} />;
    }
  }
};

const Chapeu: React.FC<{ tipo: Visual["chapeu"]["tipo"]; cor: string }> = ({ tipo, cor }) => {
  if (tipo === "nenhum") return null;
  const sombra = "rgba(0,0,0,0.18)";
  if (tipo === "gorro")
    return (
      <g>
        <path d="M 110 104 A 70 70 0 0 1 250 104 Z" fill={cor} />
        <rect x={108} y={92} width={144} height={20} rx={6} fill={cor} />
        <rect x={108} y={104} width={144} height={8} fill={sombra} />
      </g>
    );
  if (tipo === "capacete")
    return (
      <g>
        <path d="M 108 106 A 72 72 0 0 1 252 106 Z" fill={cor} />
        <rect x={98} y={100} width={164} height={12} rx={6} fill={cor} />
        <rect x={172} y={36} width={16} height={66} rx={6} fill={sombra} />
      </g>
    );
  // boné
  return (
    <g>
      <path d="M 112 102 A 68 68 0 0 1 248 102 Z" fill={cor} />
      <path d="M 200 98 Q 262 94 288 106 L 288 110 Q 250 112 200 110 Z" fill={cor} />
      <rect x={112} y={98} width={136} height={8} fill={sombra} />
      <circle cx={180} cy={36} r={6} fill={cor} />
    </g>
  );
};

// Pontinhos da barba por fazer: posições fixas (determinístico, então nunca muda entre frames)
const BARBA: [number, number][] = [
  [140, 150], [148, 160], [156, 168], [166, 174], [178, 177], [190, 175], [201, 170], [210, 162], [217, 152],
  [146, 146], [214, 146], [152, 175], [208, 176], [164, 183], [180, 186], [196, 183], [172, 166], [188, 167],
];

export const Personagem: React.FC<Props> = ({
  visual, boca = "X", expressao = "neutro", pose = "neutro", piscando = false, olhar = 0, respiro = 0,
  espelhar = false, altura = 900, passo,
}) => {
  const anda = passo === undefined ? 0 : Math.sin(passo * Math.PI * 2);
  const pulinho = passo === undefined ? 0 : Math.abs(Math.cos(passo * Math.PI * 2)) * 6;
  const p = POSES[pose];
  const s = SOBRANCELHAS[expressao];
  const olhoR = expressao === "surpreso" ? 8 : 6.5;
  const olhoRy = piscando ? 1.2 : olhoR;
  const dx = olhar * 4;
  const falando = boca !== "X" && boca !== "A";
  const cabecaY = falando ? -1.5 : 0;
  const peito = 1 + respiro * 0.012;

  return (
    <svg viewBox="0 0 360 540" height={altura} style={{ overflow: "visible", transform: espelhar ? "scaleX(-1)" : undefined }}>
      {/* sombra no chão */}
      <ellipse cx={180} cy={528} rx={78} ry={10} fill="rgba(0,0,0,0.25)" />

      {/* pernas */}
      <g transform={`rotate(${anda * 16} 161 334)`}>
        <rect x={146} y={330} width={30} height={180} rx={8} fill={visual.calca} />
        <rect x={136} y={498} width={44} height={22} rx={9} fill={visual.sapato} />
      </g>
      <g transform={`rotate(${-anda * 16} 199 334)`}>
        <rect x={184} y={330} width={30} height={180} rx={8} fill={visual.calca} />
        <rect x={180} y={498} width={44} height={22} rx={9} fill={visual.sapato} />
      </g>
      <g transform={`translate(0 ${-pulinho})`}>

      {/* braço de trás (esquerdo) */}
      <Braco x={128} y={204} angulos={[p.esq[0] - anda * 12 * (pose === "neutro" ? 1 : 0), p.esq[1]]} cor={visual.camisa} pele={visual.pele} />

      {/* tronco */}
      <g transform={`translate(180 340) scale(1 ${peito}) translate(-180 -340)`}>
        <rect x={124} y={190} width={112} height={152} rx={16} fill={visual.camisa} />
        <path d="M 162 190 L 180 214 L 198 190 Z" fill={visual.pele} />
        <rect x={124} y={318} width={112} height={14} fill="rgba(0,0,0,0.15)" />
        {visual.detalhe === "cinto_ferramentas" && (
          <g>
            <rect x={122} y={316} width={116} height={14} rx={3} fill={visual.corDetalhe ?? "#6B4A2B"} />
            <rect x={206} y={322} width={20} height={26} rx={3} fill={visual.corDetalhe ?? "#6B4A2B"} />
            <rect x={212} y={312} width={5} height={20} fill="#9AA0A6" />
          </g>
        )}
      </g>

      {/* braço da frente (direito) */}
      <Braco x={232} y={204} angulos={[p.dir[0] + anda * 12 * (pose === "neutro" ? 1 : 0), p.dir[1]]} cor={visual.camisa} pele={visual.pele} />

      {/* cabeça */}
      <g transform={`translate(0 ${cabecaY})`}>
        <rect x={166} y={170} width={28} height={26} fill={visual.pele} />
        <circle cx={180} cy={118} r={68} fill={visual.pele} />
        {visual.detalhe === "lenco" && (
          <path d="M 140 172 Q 180 200 220 172 L 214 196 Q 180 214 146 196 Z" fill={visual.corDetalhe ?? "#C0392B"} />
        )}

        {visual.barba && BARBA.map(([x, y], i) => <circle key={i} cx={x} cy={y - 10} r={2.2} fill="rgba(60,40,30,0.55)" />)}

        {/* olhos */}
        <ellipse cx={156 + dx} cy={118} rx={olhoR} ry={olhoRy} fill={visual.olhos} />
        <ellipse cx={204 + dx} cy={118} rx={olhoR} ry={olhoRy} fill={visual.olhos} />

        {/* sobrancelhas */}
        <rect x={142} y={96 + s.esq[0]} width={28} height={6} rx={3} fill="#2E2420"
          transform={`rotate(${s.esq[1]} 156 ${99 + s.esq[0]})`} />
        <rect x={190} y={96 + s.dir[0]} width={28} height={6} rx={3} fill="#2E2420"
          transform={`rotate(${s.dir[1]} 204 ${99 + s.dir[0]})`} />

        {/* boca */}
        <g transform="translate(180 152)">
          <BocaForma boca={boca} expressao={expressao} />
        </g>

        {visual.bigode && <path d="M 158 141 Q 170 133 180 139 Q 190 133 202 141 Q 196 149 180 144 Q 164 149 158 141 Z" fill={visual.cabelo ?? "#3B2A1A"} />}

        {visual.chapeu.tipo === "nenhum" && visual.cabelo && (
          <path d="M 112 112 Q 110 50 180 46 Q 250 50 248 112 Q 236 84 214 78 Q 190 92 150 80 Q 124 86 112 112 Z" fill={visual.cabelo} />
        )}
        <Chapeu tipo={visual.chapeu.tipo} cor={visual.chapeu.cor} />
      </g>
      </g>
    </svg>
  );
};
