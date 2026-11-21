import React from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Boca, Expressao, Personagem, Pose, Visual } from "../personagem/Personagem";
import { Legenda, Palavra } from "../legenda/Legenda";
import sync from "../../public/teste/sync.json";

export const ZECA: Visual = {
  pele: "#E9D8B8",
  camisa: "#3C6FA8",
  calca: "#2D3B57",
  sapato: "#5A3B26",
  olhos: "#231B18",
  chapeu: { tipo: "bone", cor: "#E07B2E" },
  barba: true,
  detalhe: "cinto_ferramentas",
  corDetalhe: "#6B4A2B",
};

type Marca<T> = { t: number; v: T };
const POSES: Marca<Pose>[] = [
  { t: 0, v: "neutro" },
  { t: 0.8, v: "apontando" },
  { t: 3.2, v: "pensando" },
  { t: 4.4, v: "bracos_abertos" },
];
const EXPRESSOES: Marca<Expressao>[] = [
  { t: 0, v: "surpreso" },
  { t: 1.2, v: "feliz" },
  { t: 3.2, v: "duvida" },
  { t: 4.4, v: "feliz" },
];

const valorEm = <T,>(marcas: Marca<T>[], t: number): T => {
  let v = marcas[0].v;
  for (const m of marcas) if (t >= m.t) v = m.v;
  return v;
};

const bocaEm = (t: number): Boca => {
  const c = sync.bocas.find((b) => t >= b.inicio && t < b.fim);
  return (c?.boca as Boca) ?? "X";
};

// Estrelas com posições fixas (nada aleatório entre frames)
const ESTRELAS = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 337) % 1080,
  y: (i * 211) % 900,
  r: 1 + (i % 3),
}));

const CenarioNoite: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#141B33 0%, #1F2A4A 55%, #2A3550 100%)" }}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {ESTRELAS.map((e, i) => (
          <circle key={i} cx={e.x} cy={e.y} r={e.r} fill="#fff" opacity={0.35 + 0.35 * Math.sin(frame / 12 + i)} />
        ))}
        <path d="M 0 1050 Q 270 880 540 1000 T 1080 960 L 1080 1920 L 0 1920 Z" fill="#26344A" />
        <path d="M 0 1180 Q 360 1060 720 1150 T 1080 1120 L 1080 1920 L 0 1920 Z" fill="#2E3D52" />
        <rect x={0} y={1420} width={1080} height={500} fill="#3A3F48" />
        {/* caçamba de entulho */}
        <g transform="translate(700 1250)">
          <path d="M 0 0 L 320 0 L 290 170 L 30 170 Z" fill="#C9822B" />
          <rect x={10} y={-12} width={300} height={16} fill="#4FA3C7" />
          <rect x={40} y={170} width={30} height={20} fill="#222" />
          <rect x={250} y={170} width={30} height={20} fill="#222" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const TesteZeca: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const piscando = frame % 96 >= 90; // pisca a cada ~3,2 s
  const entrada = spring({ frame, fps, config: { damping: 14 } });
  const respiro = Math.sin(frame / 18);
  const zoom = interpolate(frame, [0, 200], [1, 1.06], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <CenarioNoite />
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380 }}>
          <div style={{ transform: `translateY(${(1 - entrada) * 300}px)` }}>
            <Personagem
              visual={ZECA}
              boca={bocaEm(t)}
              expressao={valorEm(EXPRESSOES, t)}
              pose={valorEm(POSES, t)}
              piscando={piscando}
              respiro={respiro}
              olhar={0.3}
              altura={1000}
            />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <Legenda palavras={sync.palavras as Palavra[]} y={1560} />

      <div style={{ position: "absolute", top: 120, left: 60, fontFamily: "Consolas, monospace", fontSize: 30, color: "#E8E2D0", opacity: 0.75, lineHeight: 1.4 }}>
        DIA 1 · 19:40<br />OBRA · RUA DE TRÁS
      </div>

      <Audio src={staticFile("teste/fala.wav")} />
    </AbsoluteFill>
  );
};
