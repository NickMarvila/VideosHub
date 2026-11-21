import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Cenario } from "./tipos";

// Cenários flat 1080×1920. O chão dos personagens fica por volta de y = 1500.
// Tudo é determinístico (sem Math.random) para os quadros não mudarem entre renders.

const ESTRELAS = Array.from({ length: 60 }, (_, i) => ({ x: (i * 337) % 1080, y: (i * 211) % 900, r: 1 + (i % 3) }));

const Predios: React.FC<{ cores: string[]; janela: string; acesas?: boolean; base: number }> = ({ cores, janela, acesas, base }) => (
  <g>
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const w = 150 + ((i * 47) % 70);
      const h = 380 + ((i * 131) % 330);
      const x = i * 185 - 30;
      return (
        <g key={i}>
          <rect x={x} y={base - h} width={w} height={h} fill={cores[i % cores.length]} />
          {Array.from({ length: Math.floor(h / 70) }, (_, r) => [0, 1, 2].map((c) => (
            <rect key={`${r}-${c}`} x={x + 22 + c * ((w - 44) / 3)} y={base - h + 30 + r * 70} width={26} height={34}
              fill={acesas && (r * 3 + c + i) % 4 === 0 ? "#F6D77A" : janela} />
          )))}
        </g>
      );
    })}
  </g>
);

const RuaDia: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#8FD0F0 0%, #CDEBF7 60%, #EAF6FA 100%)" }}>
      <svg width={1080} height={1920}>
        {[0, 1, 2].map((i) => {
          const x = ((i * 420 + f * 0.6) % 1400) - 200;
          return <g key={i} transform={`translate(${x} ${180 + i * 140})`} fill="#fff" opacity={0.9}>
            <ellipse cx={0} cy={0} rx={90} ry={34} /><ellipse cx={60} cy={-18} rx={60} ry={38} /><ellipse cx={-55} cy={-10} rx={50} ry={28} />
          </g>;
        })}
        <Predios cores={["#F2C6A0", "#B9D7C9", "#F4DE9C", "#C9C3E6"]} janela="#7FB3D5" base={1260} />
        <rect x={0} y={1260} width={1080} height={110} fill="#C9CDD2" />
        <rect x={0} y={1370} width={1080} height={550} fill="#5B6470" />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={i * 240 + 40} y={1640} width={130} height={16} rx={8} fill="#F1F1E6" />)}
        <rect x={0} y={1356} width={1080} height={16} fill="#9EA5AD" />
      </svg>
    </AbsoluteFill>
  );
};

const RuaNoite: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#141B33 0%, #1F2A4A 55%, #2A3550 100%)" }}>
      <svg width={1080} height={1920}>
        {ESTRELAS.map((e, i) => <circle key={i} cx={e.x} cy={e.y} r={e.r} fill="#fff" opacity={0.35 + 0.35 * Math.sin(f / 12 + i)} />)}
        <circle cx={860} cy={260} r={70} fill="#F3EBC8" />
        <Predios cores={["#26344A", "#2E3D52", "#223047"]} janela="#1B2436" acesas base={1260} />
        <rect x={0} y={1260} width={1080} height={110} fill="#3A4250" />
        <rect x={0} y={1370} width={1080} height={550} fill="#2C313A" />
        <g transform="translate(120 760)"><rect x={0} y={0} width={14} height={600} fill="#5A6170" /><rect x={0} y={0} width={90} height={12} fill="#5A6170" />
          <ellipse cx={90} cy={18} rx={26} ry={10} fill="#F6D77A" /><path d="M 64 22 L 116 22 L 170 520 L 10 520 Z" fill="#F6D77A" opacity={0.07} /></g>
      </svg>
    </AbsoluteFill>
  );
};

const Mercado: React.FC = () => (
  <AbsoluteFill style={{ background: "#F3EFE6" }}>
    <svg width={1080} height={1920}>
      <rect x={0} y={0} width={1080} height={300} fill="#E2453C" />
      <text x={540} y={200} textAnchor="middle" fontFamily="'Arial Black', sans-serif" fontSize={96} fill="#fff">SUPERMERCADO</text>
      {[0, 1, 2].map((r) => (
        <g key={r} transform={`translate(0 ${430 + r * 300})`}>
          <rect x={40} y={200} width={1000} height={22} fill="#B9BFC6" />
          {Array.from({ length: 13 }, (_, i) => (
            <rect key={i} x={60 + i * 75} y={200 - (90 + ((i * 37 + r * 11) % 60))} width={58} height={90 + ((i * 37 + r * 11) % 60)} rx={6}
              fill={["#F2B134", "#3C9D5D", "#3C6FA8", "#E07B2E", "#C64B8C"][(i + r) % 5]} />
          ))}
        </g>
      ))}
      <rect x={0} y={1370} width={1080} height={550} fill="#D8D2C4" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={i * 160} y={1370} width={2} height={550} fill="#C6BFAF" />)}
    </svg>
  </AbsoluteFill>
);

const Sala: React.FC = () => (
  <AbsoluteFill style={{ background: "#F1E3C8" }}>
    <svg width={1080} height={1920}>
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 90} y={0} width={45} height={1370} fill="#EAD7B4" />)}
      <rect x={640} y={420} width={300} height={360} rx={10} fill="#8FC7E8" stroke="#FFFFFF" strokeWidth={18} />
      <rect x={784} y={420} width={12} height={360} fill="#fff" />
      <rect x={90} y={500} width={220} height={150} rx={8} fill="#2F3640" /><rect x={104} y={514} width={192} height={122} fill="#4B6584" />
      <rect x={60} y={1080} width={420} height={200} rx={30} fill="#3C6FA8" /><rect x={40} y={1020} width={460} height={110} rx={40} fill="#5585BD" />
      <rect x={0} y={1370} width={1080} height={550} fill="#B07A4C" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={0} y={1420 + i * 110} width={1080} height={4} fill="#9A6840" />)}
    </svg>
  </AbsoluteFill>
);

const Estrada: React.FC = () => {
  const f = useCurrentFrame();
  const desloca = (f * 26) % 300;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#9AD8F2, #DDF1F8)" }}>
      <svg width={1080} height={1920}>
        <path d="M 0 1000 Q 300 820 620 960 T 1080 900 L 1080 1300 L 0 1300 Z" fill="#8CC48A" />
        <path d="M 0 1120 Q 400 1020 800 1100 T 1080 1080 L 1080 1300 L 0 1300 Z" fill="#6FAE6C" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = ((i * 260 - f * 6) % 1560 + 1560) % 1560 - 240;
          return <g key={i} transform={`translate(${x} 1150)`}><rect x={-10} y={0} width={20} height={130} fill="#7A5230" /><circle cx={0} cy={-20} r={70} fill="#4F9A4C" /></g>;
        })}
        <rect x={0} y={1300} width={1080} height={620} fill="#4C535C" />
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={i * 300 - desloca} y={1610} width={170} height={18} rx={9} fill="#F1E9A8" />)}
        <rect x={0} y={1290} width={1080} height={14} fill="#B8BEC5" />
      </svg>
    </AbsoluteFill>
  );
};

export const CenarioFundo: React.FC<{ cenario: Cenario; extras?: Record<string, string> }> = ({ cenario, extras }) => {
  if (extras?.[cenario]) return <AbsoluteFill><svg width={1080} height={1920} viewBox="0 0 1080 1920" dangerouslySetInnerHTML={{ __html: extras[cenario] }} /></AbsoluteFill>;
  switch (cenario) {
    case "rua_noite": return <RuaNoite />;
    case "mercado": return <Mercado />;
    case "sala": return <Sala />;
    case "estrada": return <Estrada />;
    case "rua_dia":
    default: return <RuaDia />;
  }
};
