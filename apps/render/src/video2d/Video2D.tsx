import React from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Boca, Expressao, Personagem, Pose } from "../personagem/Personagem";
import { Legenda } from "../legenda/Legenda";
import { CenarioFundo } from "./Cenarios";
import { ObjetoCena, valorEm } from "./Objetos";
import type { Ator, Cena, Chave, Props2D, Texto } from "./tipos";

const CHAO = 1500;
const BOCAS: Boca[] = ["C", "B", "D", "E", "B", "C", "F", "A"];

const ultimo = <T,>(chaves: Chave<T>[] | undefined, t: number, padrao: T): T => {
  let v = padrao;
  for (const [tc, val] of chaves ?? []) if (t >= tc) v = val;
  return v;
};

const AtorCena: React.FC<{ a: Ator; t: number; cena: Cena; visual: Props2D["storyboard"]["personagens"][string]; palavras: Props2D["palavras"] }> = ({ a, t, cena, visual, palavras }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!visual) return null;
  const x = valorEm(a.x as never, t, 540);
  // anda quando a posição muda entre chaves
  const andando = Array.isArray(a.x) && a.x.length > 1 && t > a.x[0][0] && t < a.x[a.x.length - 1][0] &&
    Math.abs(valorEm(a.x as never, t + 0.05, 0) - x) > 0.5;
  const indo = andando ? Math.sign(valorEm(a.x as never, t + 0.05, 0) - x) : 0;
  const espelhar = indo ? indo < 0 : !!a.espelhar;
  const entrada = spring({ frame: frame - Math.round(cena.inicio * fps), fps, config: { damping: 15 } });
  const desloc = a.entra === "esquerda" ? [(entrada - 1) * 700, 0] : a.entra === "direita" ? [(1 - entrada) * 700, 0]
    : a.entra === "nenhum" ? [0, 0] : [0, (1 - entrada) * 260];
  const falaAgora = (a.fala ?? []).some(([de, ate]) => t >= de && t < ate) && palavras.some((p) => t >= p.inicio && t < p.fim);
  const boca: Boca = falaAgora ? BOCAS[Math.floor(frame / 3) % BOCAS.length] : "X";
  const altura = a.altura ?? 900;
  return (
    <div style={{ position: "absolute", left: x + desloc[0], top: (a.y ?? CHAO) + desloc[1], transform: `translate(-50%, -100%)` }}>
      <Personagem visual={visual} altura={altura} espelhar={espelhar}
        pose={ultimo<Pose>(a.poses, t, "neutro")} expressao={ultimo<Expressao>(a.expressoes, t, "neutro")}
        boca={boca} olhar={a.olhar ?? 0} piscando={(frame + a.id.length * 17) % 100 >= 94}
        respiro={Math.sin(frame / 18)} passo={andando ? t * 1.8 : undefined} />
    </div>
  );
};

const TextoTela: React.FC<{ tx: Texto; t: number; cena: Cena }> = ({ tx, t, cena }) => {
  const { fps } = useVideoConfig();
  const de = tx.de ?? cena.inicio + 0.1;
  const ate = tx.ate ?? cena.fim;
  if (t < de || t >= ate) return null;
  const pop = spring({ frame: Math.round((t - de) * fps), fps, config: { damping: 13, stiffness: 200 } });
  const base: React.CSSProperties = { position: "absolute", left: 60, right: 60, textAlign: "center", transform: `scale(${0.7 + pop * 0.3})`, fontFamily: "'Arial Black', 'Segoe UI Black', sans-serif" };
  if (tx.estilo === "carimbo")
    return <div style={{ ...base, top: 330, left: 70, right: "auto", textAlign: "left", transformOrigin: "left", fontFamily: "Consolas, monospace", fontWeight: 700, fontSize: 40, color: "#fff", background: "rgba(20,24,30,.55)", padding: "10px 18px", borderRadius: 10 }}>{tx.texto}</div>;
  if (tx.estilo === "pergunta")
    return <div style={{ ...base, top: 240, fontSize: 70, color: "#1E2227", background: "#FFD23F", borderRadius: 28, padding: "26px 30px", border: "8px solid #1E2227", lineHeight: 1.1 }}>{tx.texto}</div>;
  if (tx.estilo === "destaque")
    return <div style={{ ...base, top: 380, fontSize: 76, color: "#FFD23F", WebkitTextStroke: "4px #1E2227", transform: `scale(${0.7 + pop * 0.3}) rotate(-3deg)`, lineHeight: 1.05 }}>{tx.texto}</div>;
  return <div style={{ ...base, top: 170, fontSize: 64, color: "#fff", WebkitTextStroke: "3px rgba(0,0,0,.6)", textShadow: "0 6px 0 rgba(0,0,0,.45)", lineHeight: 1.1 }}>{tx.texto}</div>;
};

const CenaView: React.FC<{ cena: Cena; props: Props2D }> = ({ cena, props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [z0, z1] = cena.zoom ?? [1, 1.05];
  const zoom = interpolate(t, [cena.inicio, cena.fim], [z0, z1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const [fx, fy] = cena.foco ?? [540, 1100];
  const treme = cena.tremor && t >= cena.tremor[0] && t < cena.tremor[1] ? [Math.sin(frame * 2.1) * 14, Math.cos(frame * 2.7) * 10] : [0, 0];
  const desde = (t - cena.inicio) * fps;
  const deslize = cena.transicao === "deslize" ? interpolate(desde, [0, 9], [1080, 0], { extrapolateRight: "clamp", easing: (k) => 1 - (1 - k) ** 3 }) : 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${deslize}px)`, filter: cena.pretoEBranco ? "grayscale(1) contrast(1.1)" : undefined }}>
      <AbsoluteFill style={{ transform: `translate(${treme[0]}px, ${treme[1]}px) scale(${zoom})`, transformOrigin: `${fx}px ${fy}px` }}>
        <CenarioFundo cenario={cena.cenario} extras={props.storyboard.extras?.cenarios} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {(cena.objetos ?? []).filter((o) => o.tipo === "parati").map((o, i) => <ObjetoCena key={`p${i}`} o={o} t={t} extras={props.storyboard.extras?.objetos} />)}
        </svg>
        {(cena.atores ?? []).map((a, i) => <AtorCena key={i} a={a} t={t} cena={cena} visual={props.storyboard.personagens[a.id]} palavras={props.palavras} />)}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {(cena.objetos ?? []).filter((o) => o.tipo !== "parati").map((o, i) => <ObjetoCena key={i} o={o} t={t} extras={props.storyboard.extras?.objetos} />)}
        </svg>
      </AbsoluteFill>
      {(cena.textos ?? []).map((tx, i) => <TextoTela key={i} tx={tx} t={t} cena={cena} />)}
      {cena.transicao === "flash" && desde < 6 && <AbsoluteFill style={{ background: "#fff", opacity: 1 - desde / 6 }} />}
    </AbsoluteFill>
  );
};

export const Video2D: React.FC<Props2D> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { storyboard: sb, palavras } = props;
  const cena = sb.cenas.find((c) => t >= c.inicio && t < c.fim) ?? sb.cenas[sb.cenas.length - 1];
  const leg = sb.legenda ?? {};
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {cena && <CenaView cena={cena} props={props} />}
      {(leg as { ativo?: boolean }).ativo !== false && <Legenda palavras={palavras} porVez={leg.porVez ?? 3} y={leg.y ?? 1560} cor={leg.cor ?? "#FFFFFF"} destaque={leg.destaque ?? "#FF9F1C"} />}
      {sb.audio && <Audio src={staticFile(sb.audio)} />}
    </AbsoluteFill>
  );
};
