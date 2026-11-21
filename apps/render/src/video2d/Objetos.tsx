import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Objeto } from "./tipos";

// Objetos flat. Cada desenho é centrado em (0,0) e tem cerca de 200 px de largura em escala 1.

const Roda: React.FC<{ x: number; y: number; giro: number }> = ({ x, y, giro }) => (
  <g transform={`translate(${x} ${y}) rotate(${giro})`}>
    <circle r={46} fill="#1E2227" /><circle r={22} fill="#AEB6BF" />
    <rect x={-3} y={-22} width={6} height={44} fill="#6B737C" /><rect x={-22} y={-3} width={44} height={6} fill="#6B737C" />
  </g>
);

// A "Paratí": perua compacta com bagageiro (desenho original, sem marca).
const Parati: React.FC<{ cor: string; movendo?: boolean; quebrado?: boolean }> = ({ cor, movendo, quebrado }) => {
  const f = useCurrentFrame();
  const giro = movendo ? f * 24 : 0;
  const pula = movendo ? Math.sin(f / 2.5) * 3 : 0;
  return (
    <g transform={`translate(-300 ${-170 + pula})`}>
      <rect x={60} y={20} width={420} height={14} rx={7} fill="#3A4048" />
      <path d="M 40 120 L 120 40 L 470 40 L 520 120 Z" fill={cor} />
      <path d="M 140 56 L 240 56 L 240 116 L 92 116 Z" fill="#BFE3F2" /><rect x={256} y={56} width={110} height={60} fill="#BFE3F2" /><rect x={382} y={56} width={84} height={60} fill="#BFE3F2" />
      <rect x={10} y={116} width={580} height={110} rx={28} fill={cor} />
      <rect x={10} y={168} width={580} height={12} fill="rgba(0,0,0,.12)" />
      <rect x={560} y={140} width={34} height={22} rx={6} fill="#F6D77A" /><rect x={8} y={140} width={26} height={22} rx={6} fill="#E2453C" />
      <Roda x={140} y={226} giro={giro} /><Roda x={460} y={226} giro={giro} />
      {quebrado && [0, 1, 2].map((i) => (
        <circle key={i} cx={-20 - ((f * 3 + i * 30) % 90)} cy={190 - ((f * 2 + i * 20) % 60)} r={18 + ((f + i * 10) % 20)} fill="#9AA0A6" opacity={0.6 - ((f + i * 10) % 30) / 60} />
      ))}
    </g>
  );
};

const Balao: React.FC<{ texto: string; pensamento?: boolean }> = ({ texto, pensamento }) => {
  const largura = Math.min(760, 120 + texto.length * 30);
  return (
    <g>
      <rect x={-largura / 2} y={-90} width={largura} height={150} rx={60} fill="#fff" stroke="#1E2227" strokeWidth={8} />
      {pensamento
        ? <g fill="#fff" stroke="#1E2227" strokeWidth={6}><circle cx={-60} cy={100} r={20} /><circle cx={-90} cy={150} r={12} /></g>
        : <path d="M -60 56 L -100 140 L -10 60 Z" fill="#fff" stroke="#1E2227" strokeWidth={8} strokeLinejoin="round" />}
      {!pensamento && <rect x={-58} y={50} width={46} height={14} fill="#fff" />}
      <text x={0} y={6} textAnchor="middle" dominantBaseline="middle" fontFamily="'Arial Black', sans-serif" fontSize={54} fill="#1E2227">{texto}</text>
    </g>
  );
};

const Icone: React.FC<{ icone: NonNullable<Objeto["icone"]> }> = ({ icone }) => {
  const cores = { x: "#E2453C", v: "#3C9D5D", "!": "#F2B134", "?": "#3C6FA8", $: "#3C9D5D", coracao: "#E2453C" } as const;
  const simbolo = { x: "✕", v: "✓", "!": "!", "?": "?", $: "$", coracao: "♥" }[icone];
  return (
    <g>
      <circle r={90} fill={cores[icone]} stroke="#1E2227" strokeWidth={10} />
      <text y={6} textAnchor="middle" dominantBaseline="middle" fontFamily="'Arial Black', sans-serif" fontSize={110} fill="#fff">{simbolo}</text>
    </g>
  );
};

const Desenho: React.FC<{ o: Objeto; extras?: Record<string, string> }> = ({ o, extras }) => {
  const f = useCurrentFrame();
  if (extras?.[o.tipo]) return <g dangerouslySetInnerHTML={{ __html: extras[o.tipo] }} />;
  switch (o.tipo) {
    case "parati": return <Parati cor={o.cor ?? "#B8BEC6"} movendo={o.movendo} quebrado={o.quebrado} />;
    case "dinheiro": return (
      <g transform="rotate(-8)"><rect x={-120} y={-60} width={240} height={120} rx={10} fill="#7CC48A" stroke="#2F7A45" strokeWidth={8} />
        <circle r={36} fill="#A9DDB2" stroke="#2F7A45" strokeWidth={6} /><text y={14} textAnchor="middle" fontFamily="'Arial Black', sans-serif" fontSize={44} fill="#2F7A45">R$</text></g>);
    case "moeda": return <g><circle r={60} fill="#F2C94C" stroke="#B8902A" strokeWidth={8} /><text y={18} textAnchor="middle" fontFamily="'Arial Black', sans-serif" fontSize={56} fill="#B8902A">$</text></g>;
    case "relogio": return (
      <g><rect x={-34} y={-130} width={68} height={260} rx={20} fill="#2F3640" />
        <rect x={-75} y={-85} width={150} height={170} rx={34} fill="#1E2227" stroke="#AEB6BF" strokeWidth={8} />
        <rect x={-56} y={-66} width={112} height={132} rx={22} fill="#1F6FA8" />
        <text y={14} textAnchor="middle" fontFamily="'Arial Black', sans-serif" fontSize={44} fill="#fff">12:00</text></g>);
    case "celular": return <g><rect x={-60} y={-110} width={120} height={220} rx={20} fill="#1E2227" /><rect x={-48} y={-92} width={96} height={180} rx={10} fill="#4B8BD0" /></g>;
    case "caixa_som": {
      const pulsa = 1 + Math.abs(Math.sin(f / 3)) * 0.08;
      return (<g><rect x={-130} y={-200} width={260} height={400} rx={18} fill="#2B2F36" />
        <circle cy={-90} r={70 * pulsa} fill="#4A5058" /><circle cy={-90} r={28} fill="#1E2227" />
        <circle cy={90} r={90 * pulsa} fill="#4A5058" /><circle cy={90} r={36} fill="#1E2227" /></g>);
    }
    case "skate": return (<g><rect x={-170} y={-20} width={340} height={40} rx={20} fill={o.cor ?? "#E07B2E"} stroke="#1E2227" strokeWidth={6} />
      <circle cx={-110} cy={34} r={18} fill="#F2E3B3" /><circle cx={110} cy={34} r={18} fill="#F2E3B3" /></g>);
    case "pneu": return <g><circle r={90} fill="#1E2227" /><circle r={44} fill="#5B6470" />{o.quebrado && <path d="M -90 40 Q 0 110 90 40" fill="#1E2227" />}</g>;
    case "seta": {
      const ang = { direita: 0, baixo: 90, esquerda: 180, cima: 270 }[o.direcao ?? "baixo"];
      const bal = Math.sin(f / 5) * 12;
      return <g transform={`rotate(${ang}) translate(${bal} 0)`}><path d="M -110 -30 L 30 -30 L 30 -70 L 120 0 L 30 70 L 30 30 L -110 30 Z" fill="#3C8EE0" stroke="#1E2227" strokeWidth={10} strokeLinejoin="round" /></g>;
    }
    case "icone": return <Icone icone={o.icone ?? "!"} />;
    case "balao": return <Balao texto={o.texto ?? ""} />;
    case "pensamento": return <Balao texto={o.texto ?? ""} pensamento />;
    case "placa": return (<g><rect x={-10} y={0} width={20} height={260} fill="#6B737C" />
      <rect x={-200} y={-110} width={400} height={130} rx={14} fill={o.cor ?? "#F2B134"} stroke="#1E2227" strokeWidth={8} />
      <text y={-28} textAnchor="middle" dominantBaseline="middle" fontFamily="'Arial Black', sans-serif" fontSize={50} fill="#1E2227">{o.texto ?? ""}</text></g>);
    default: return null;
  }
};

const valor = (v: number | [number, number][] | undefined, t: number, padrao = 0): number => {
  if (v === undefined) return padrao;
  if (typeof v === "number") return v;
  if (t <= v[0][0]) return v[0][1];
  for (let i = 1; i < v.length; i++) {
    if (t <= v[i][0]) {
      const [t0, a] = v[i - 1]; const [t1, b] = v[i];
      const k = (t - t0) / Math.max(0.001, t1 - t0);
      const suave = k * k * (3 - 2 * k);
      return a + (b - a) * suave;
    }
  }
  return v[v.length - 1][1];
};
export const valorEm = valor;

export const ObjetoCena: React.FC<{ o: Objeto; t: number; extras?: Record<string, string> }> = ({ o, t, extras }) => {
  const { fps } = useVideoConfig();
  if (o.aparece !== undefined && t < o.aparece) return null;
  if (o.some !== undefined && t >= o.some) return null;
  const desde = o.aparece !== undefined ? (t - o.aparece) * fps : 99;
  const pop = Math.min(1, desde / 6);
  const esc = (o.escala ?? 1) * (o.aparece !== undefined ? 0.4 + 0.6 * pop + Math.sin(Math.min(1, desde / 10) * Math.PI) * 0.12 : 1);
  return (
    <g transform={`translate(${valor(o.x, t)} ${valor(o.y, t)}) rotate(${valor(o.giro, t)}) scale(${esc})`}>
      <Desenho o={o} extras={extras} />
    </g>
  );
};
