import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export type Palavra = { palavra: string; inicio: number; fim: number };

type Props = {
  palavras: Palavra[];
  /** máximo de palavras por bloco */
  porVez?: number;
  y?: number;
  cor?: string;
  destaque?: string;
};

/** Agrupa palavras em blocos curtos, quebrando também em pausas e pontuação final. */
const agrupar = (palavras: Palavra[], porVez: number): Palavra[][] => {
  const grupos: Palavra[][] = [];
  let atual: Palavra[] = [];
  palavras.forEach((p, i) => {
    atual.push(p);
    const prox = palavras[i + 1];
    const pausa = prox ? prox.inicio - p.fim > 0.25 : true;
    const fimFrase = /[.!?]$/.test(p.palavra);
    if (atual.length >= porVez || pausa || fimFrase) {
      grupos.push(atual);
      atual = [];
    }
  });
  if (atual.length) grupos.push(atual);
  return grupos;
};

/** Legenda palavra a palavra (estilo Reels): bloco de 2-3 palavras, a palavra falada em destaque. */
export const Legenda: React.FC<Props> = ({ palavras, porVez = 3, y = 1150, cor = "#FFFFFF", destaque = "#FF9F1C" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const grupos = agrupar(palavras, porVez);
  const grupo = grupos.find((g, i) => {
    const fim = grupos[i + 1]?.[0].inicio ?? g[g.length - 1].fim + 0.4;
    return t >= g[0].inicio && t < fim;
  });
  if (!grupo) return null;

  const pop = spring({ frame: frame - Math.round(grupo[0].inicio * fps), fps, config: { damping: 12, stiffness: 220 } });

  return (
    <div style={{
      position: "absolute", top: y, left: 40, right: 40, textAlign: "center",
      transform: `scale(${0.85 + pop * 0.15})`,
    }}>
      {grupo.map((p, i) => {
        // só a palavra mais recente que já começou fica em destaque
        const atual = grupo.reduce((idx, w, j) => (t >= w.inicio ? j : idx), -1);
        const ativa = i === atual;
        return (
          <span key={i} style={{
            fontFamily: "'Arial Black', 'Segoe UI Black', sans-serif",
            fontWeight: 900,
            fontSize: 92,
            letterSpacing: -1,
            textTransform: "uppercase",
            color: ativa ? destaque : cor,
            textShadow: ativa ? `0 0 28px ${destaque}99, 0 6px 0 rgba(0,0,0,0.6)` : "0 6px 0 rgba(0,0,0,0.6)",
            WebkitTextStroke: "3px rgba(0,0,0,0.55)",
            margin: "0 14px",
            display: "inline-block",
          }}>
            {p.palavra.replace(/[,.!?]+$/, "")}
          </span>
        );
      })}
    </div>
  );
};
