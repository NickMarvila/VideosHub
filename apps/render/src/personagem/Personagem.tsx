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
  /** aba_virada: chapéu de feltro de aba larga com um lado preso para cima (corFaixa = faixa da copa) */
  chapeu: { tipo: "bone" | "gorro" | "capacete" | "aba_virada" | "nenhum" | "elmo" | "elmo_aba"; cor: string; corFaixa?: string };
  cabelo?: string;
  barba: boolean;
  bigode?: boolean;
  detalhe?: "cinto_ferramentas" | "lenco" | "nenhum";
  corDetalhe?: string;
  /** "emu" desenha uma ave grande no lugar do corpo humano: camisa = penas, calca = pernas, sapato = pés,
   *  pele = bico, olhos = íris, cabelo = topete. Sem o campo, o boneco é o humano de sempre. */
  especie?: "emu" | "robo";
  /** cor do pescoço e da cabeça (emu) */
  pescoco?: string;
  /** largura do corpo (emu e robo), 1 = padrão */
  corpo?: number;
  /** "robo": robozinho de cabeça redonda com tela no rosto. camisa = casco (cabeça e tronco), calca = pernas,
   *  sapato = pés, pele = mãos e juntas, cabelo = fundo da tela, olhos = brilho dos olhos na tela,
   *  corDetalhe = antena, orelhas e painel do peito. */
  antena?: "bola" | "dupla" | "nenhuma";
  /** óculos de leitura: cor da armação e formato. Sem o campo, nada muda. */
  oculos?: { cor: string; forma: "redondo" | "meia_lua" | "quadrado" };
  /** topete da ave (emu) */
  topete?: "liso" | "arrepiado" | "nenhum";
  /** cor de um avental (couro, pano) por cima da camisa, com peitilho, alças e bolso. Sem o campo, nada muda. */
  avental?: string;
  /** objeto na mão da frente (direita). Sem o campo, a mão fica vazia. "lanca" = lança em pé, segura pela mão. */
  segura?: "martelo" | "lanca" | "prancheta" | "folha";
  /** colete de obra por cima da camisa: cor do colete e das duas faixas refletivas. Sem o campo, nada muda. */
  colete?: { cor: string; faixa: string };
  /** túnica medieval de duas cores por cima da camisa (que vira a cota de malha), descendo sobre as coxas.
   *  corte: "cruz" (cruz da cor2), "meio" (metade de cada cor) ou "faixa" (faixa horizontal da cor2). Sem o campo, nada muda. */
  tunica?: { cor: string; cor2: string; corte: "cruz" | "meio" | "faixa" };
  /** desenha os aros de cota de malha na camisa (no tronco). Sem o campo, nada muda. */
  malha?: boolean;
  /** moletom com capuz cobrindo a cabeça: rosto na sombra (cor `sombra`), só os olhos aparecem, brilhando na cor `olhos`.
   *  Some o cabelo, o chapéu, as sobrancelhas e a boca (ao falar, o brilho pulsa). cordao = cor dos cordões (sem o campo, sem cordões);
   *  bolso = bolso canguru na barriga. Sem o campo, nada muda. */
  capuz?: { cor: string; sombra?: string; cordao?: string; bolso?: boolean };
};

/** capuz por cima da cabeça (centro 180,118): casca, abertura escura e borda */
const Capuz: React.FC<{ c: NonNullable<Visual["capuz"]> }> = ({ c }) => (
  <g>
    <path d="M 102 200 Q 94 118 114 74 Q 140 26 180 24 Q 220 26 246 74 Q 266 118 258 200 Q 220 186 180 190 Q 140 186 102 200 Z" fill={c.cor} />
    <path d="M 180 26 Q 196 40 198 62" stroke="rgba(0,0,0,0.25)" strokeWidth={5} fill="none" strokeLinecap="round" />
    <ellipse cx={180} cy={126} rx={58} ry={62} fill="rgba(0,0,0,0.3)" />
    <ellipse cx={180} cy={128} rx={50} ry={55} fill={c.sombra ?? "#0E1014"} />
  </g>
);

/** olhos brilhando dentro do capuz; pálpebra escura para bravo/triste */
const OlhosBrilho: React.FC<{ cor: string; sombra: string; dx: number; ry: number; expressao: Expressao; pulso: number }> = ({ cor, sombra, dx, ry, expressao, pulso }) => (
  <g>
    {[158, 202].map((x, i) => {
      const cx = x + dx, cy = 124;
      const tampa = expressao === "bravo" ? (i ? -1 : 1) : expressao === "triste" ? (i ? 1 : -1) : 0;
      return (
        <g key={x}>
          <ellipse cx={cx} cy={cy} rx={13 + pulso} ry={Math.max(3, ry + 5 + pulso)} fill={cor} opacity={0.28} />
          <ellipse cx={cx} cy={cy} rx={9} ry={ry} fill={cor} />
          {ry > 3 && <circle cx={cx - 3} cy={cy - 3} r={2.4} fill="#FFFFFF" opacity={0.85} />}
          {tampa !== 0 && <polygon points={`${cx - 16},${cy - 16} ${cx + 16},${cy - 16} ${cx + 16},${cy - 4 - tampa * 6} ${cx - 16},${cy - 4 + tampa * 6}`} fill={sombra} />}
        </g>
      );
    })}
  </g>
);

/** elmo de ferro (cúpula + aro + rebites); com nariz = protetor de nariz, com aba = chapéu de ferro */
const Elmo: React.FC<{ cor: string; aba: boolean }> = ({ cor, aba }) => {
  const sombra = "rgba(0,0,0,0.18)", escuro = "rgba(0,0,0,0.32)";
  return (
    <g>
      {aba && <ellipse cx={180} cy={100} rx={118} ry={16} fill={cor} />}
      {aba && <ellipse cx={180} cy={104} rx={118} ry={10} fill={sombra} />}
      <path d="M 108 102 Q 106 34 180 30 Q 254 34 252 102 Z" fill={cor} />
      <path d="M 180 32 L 180 92" stroke={sombra} strokeWidth={6} strokeLinecap="round" />
      <rect x={106} y={88} width={148} height={16} rx={5} fill={cor} />
      <rect x={106} y={98} width={148} height={6} fill={sombra} />
      {[124, 152, 208, 236].map((x) => <circle key={x} cx={x} cy={96} r={3.5} fill={escuro} />)}
      {!aba && <path d="M 172 100 L 188 100 L 186 140 Q 180 146 174 140 Z" fill={cor} />}
      {!aba && <path d="M 182 100 L 188 100 L 186 140 Q 183 143 181 142 Z" fill={sombra} />}
    </g>
  );
};

/** aros de cota de malha num retângulo (x, y, largura, altura) */
const Malha: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => {
  const aros: React.ReactNode[] = [];
  for (let r = 0, yy = y + 6; yy < y + h; r++, yy += 12)
    for (let xx = x + 6 + (r % 2) * 7; xx < x + w - 2; xx += 14)
      aros.push(<path key={`${r}-${xx}`} d={`M ${xx - 5} ${yy - 2} Q ${xx} ${yy + 5} ${xx + 5} ${yy - 2}`} stroke="rgba(0,0,0,0.25)" strokeWidth={2.4} fill="none" strokeLinecap="round" />);
  return <g>{aros}</g>;
};

/** túnica (peito + aba sobre as coxas), com o recorte da segunda cor */
const Tunica: React.FC<{ t: NonNullable<Visual["tunica"]> }> = ({ t }) => {
  const contorno = "M 142 204 L 164 204 L 180 226 L 196 204 L 218 204 L 222 384 Q 180 392 138 384 Z";
  const id = `tun-${t.cor.slice(1)}-${t.cor2.slice(1)}-${t.corte}`;
  return (
    <g>
      <defs><clipPath id={id}><path d={contorno} /></clipPath></defs>
      <path d={contorno} fill={t.cor} />
      <g clipPath={`url(#${id})`}>
        {t.corte === "meio" && <rect x={180} y={196} width={50} height={200} fill={t.cor2} />}
        {t.corte === "faixa" && <rect x={130} y={262} width={100} height={26} fill={t.cor2} />}
        {t.corte === "cruz" && <rect x={170} y={196} width={20} height={200} fill={t.cor2} />}
        {t.corte === "cruz" && <rect x={130} y={240} width={100} height={20} fill={t.cor2} />}
        <rect x={130} y={318} width={100} height={12} fill="rgba(0,0,0,0.15)" />
      </g>
      <rect x={134} y={316} width={92} height={14} rx={4} fill="#5A3B26" />
      <rect x={172} y={315} width={16} height={16} rx={3} fill="#C9A23A" />
    </g>
  );
};

/** lança em pé, vertical, passando pela mão (hx, hy) */
const Lanca: React.FC<{ hx: number; hy: number }> = ({ hx, hy }) => (
  <g>
    <rect x={hx - 5} y={hy - 300} width={10} height={Math.min(470, 524 - (hy - 300))} rx={4} fill="#8A5A34" />
    <rect x={hx - 7} y={hy - 306} width={14} height={14} rx={3} fill="#5A3B26" />
    <path d={`M ${hx} ${hy - 372} L ${hx + 13} ${hy - 330} L ${hx} ${hy - 304} L ${hx - 13} ${hy - 330} Z`} fill="#C9CCD2" />
    <path d={`M ${hx} ${hy - 366} L ${hx} ${hy - 310}`} stroke="rgba(0,0,0,0.2)" strokeWidth={3} />
  </g>
);

/** posição da mão do braço com ombro em (x, y) e ângulos [ombro, cotovelo] (mesma conta do Braco) */
const maoDe = (x: number, y: number, [a0, a1]: [number, number]): [number, number] => {
  const r = Math.PI / 180, SEG = 62;
  const ex = x - SEG * Math.sin(a0 * r), ey = y + SEG * Math.cos(a0 * r);
  return [ex - SEG * Math.sin((a0 + a1) * r), ey + SEG * Math.cos((a0 + a1) * r)];
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

const Martelo: React.FC<{ y: number }> = ({ y }) => (
  <g>
    <rect x={-5} y={y - 8} width={10} height={70} rx={4} fill="#8A5A34" />
    <rect x={-24} y={y + 54} width={48} height={20} rx={4} fill="#7D848C" />
    <rect x={-24} y={y + 68} width={48} height={6} rx={3} fill="rgba(0,0,0,0.2)" />
  </g>
);

/** prancheta presa pela mão (0, y), sempre em pé (giro desfaz a rotação do braço) */
const Prancheta: React.FC<{ y: number; giro: number }> = ({ y, giro }) => (
  <g transform={`translate(0 ${y}) rotate(${giro})`}>
    <rect x={-26} y={-58} width={52} height={70} rx={5} fill="#A8743F" />
    <rect x={-20} y={-48} width={40} height={54} rx={2} fill="#F4F1EA" />
    {[-36, -26, -16, -6].map((yy, i) => <rect key={yy} x={-14} y={yy} width={i % 2 ? 20 : 28} height={4} rx={2} fill="#9AA0A6" />)}
    <rect x={-11} y={-64} width={22} height={14} rx={3} fill="#7D848C" />
  </g>
);

/** folha de papel solta presa pela mão (0, y), sempre em pé, com a ponta dobrada e linhas de texto */
const Folha: React.FC<{ y: number; giro: number }> = ({ y, giro }) => (
  <g transform={`translate(0 ${y}) rotate(${giro})`}>
    <path d="M -24 -70 L 14 -70 L 26 -58 L 26 8 L -24 8 Z" fill="#FBFAF5" />
    <path d="M 14 -70 L 14 -58 L 26 -58 Z" fill="#D9D5CA" />
    <rect x={-24} y={2} width={50} height={6} fill="rgba(0,0,0,0.08)" />
    {[-58, -48, -38, -28, -18].map((yy, i) => <rect key={yy} x={-17} y={yy} width={i % 2 ? 24 : 34} height={4} rx={2} fill="#9AA0A6" />)}
  </g>
);

/** óculos de leitura com as lentes centradas em (ex, ey) e (dx, ey) */
const Oculos: React.FC<{ o: NonNullable<Visual["oculos"]>; e: number; d: number; y: number; r: number }> = ({ o, e, d, y, r }) => {
  const lente = (cx: number) => {
    if (o.forma === "quadrado") return <rect x={cx - r} y={y - r * 0.8} width={r * 2} height={r * 1.6} rx={r * 0.3} />;
    if (o.forma === "meia_lua") return <path d={`M ${cx - r} ${y} L ${cx + r} ${y} A ${r} ${r} 0 0 1 ${cx - r} ${y} Z`} />;
    return <circle cx={cx} cy={y} r={r} />;
  };
  return (
    <g stroke={o.cor} strokeWidth={5} fill="rgba(255,255,255,0.18)" strokeLinejoin="round">
      {lente(e)}
      {lente(d)}
      <path d={`M ${e + r} ${y} Q ${(e + d) / 2} ${y - 7} ${d - r} ${y}`} fill="none" />
    </g>
  );
};

const Colete: React.FC<{ c: NonNullable<Visual["colete"]> }> = ({ c }) => (
  <g>
    <path d="M 124 206 Q 124 190 140 190 L 160 190 L 174 252 L 174 342 L 124 342 Z" fill={c.cor} />
    <path d="M 236 206 Q 236 190 220 190 L 200 190 L 186 252 L 186 342 L 236 342 Z" fill={c.cor} />
    <rect x={124} y={268} width={50} height={12} fill={c.faixa} />
    <rect x={186} y={268} width={50} height={12} fill={c.faixa} />
    <rect x={124} y={300} width={50} height={12} fill={c.faixa} />
    <rect x={186} y={300} width={50} height={12} fill={c.faixa} />
    <rect x={124} y={330} width={112} height={12} fill="rgba(0,0,0,0.12)" />
  </g>
);

const Braco: React.FC<{ x: number; y: number; angulos: [number, number]; cor: string; pele: string; segura?: Visual["segura"] }> = ({
  x, y, angulos, cor, pele, segura,
}) => {
  const SEG = 62;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angulos[0]})`}>
      <rect x={-12} y={-6} width={24} height={SEG + 10} rx={12} fill={cor} />
      <g transform={`translate(0 ${SEG}) rotate(${angulos[1]})`}>
        <rect x={-11} y={-10} width={22} height={SEG} rx={11} fill={cor} />
        {segura === "martelo" && <Martelo y={SEG} />}
        {segura === "prancheta" && <Prancheta y={SEG} giro={-(angulos[0] + angulos[1])} />}
        {segura === "folha" && <Folha y={SEG} giro={-(angulos[0] + angulos[1])} />}
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

const Chapeu: React.FC<{ tipo: Visual["chapeu"]["tipo"]; cor: string; corFaixa?: string }> = ({ tipo, cor, corFaixa }) => {
  if (tipo === "nenhum") return null;
  if (tipo === "elmo" || tipo === "elmo_aba") return <Elmo cor={cor} aba={tipo === "elmo_aba"} />;
  const sombra = "rgba(0,0,0,0.18)";
  if (tipo === "aba_virada")
    return (
      <g>
        {/* aba larga (mais curta do lado esquerdo, que fica virado para cima) */}
        <ellipse cx={196} cy={100} rx={106} ry={13} fill={cor} />
        <ellipse cx={196} cy={104} rx={106} ry={9} fill={sombra} />
        {/* copa arredondada com vinco */}
        <path d="M 120 100 Q 122 28 180 26 Q 238 28 240 100 Z" fill={cor} />
        <path d="M 168 34 L 180 48 L 192 34" stroke={sombra} strokeWidth={5} fill="none" strokeLinecap="round" />
        <rect x={120} y={76} width={120} height={18} fill={corFaixa ?? "#5A4A32"} />
        {/* lado preso para cima, com o broche */}
        <path d="M 124 102 L 86 98 L 92 36 L 122 58 Z" fill={cor} />
        <path d="M 124 102 L 86 98 L 88 82 L 122 90 Z" fill={sombra} />
        <circle cx={106} cy={68} r={8} fill="#D9B24A" />
      </g>
    );
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

const pts = (l: [number, number][]) => l.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Emu: corpo redondo de penas desgrenhadas, pescoço comprido, olhos arregalados e pernas finas (de frente). */
const Emu: React.FC<Props> = ({
  visual, boca = "X", expressao = "neutro", pose = "neutro", piscando = false, olhar = 0, respiro = 0,
  espelhar = false, altura = 900, passo,
}) => {
  const anda = passo === undefined ? 0 : Math.sin(passo * Math.PI * 2);
  const pulinho = passo === undefined ? 0 : Math.abs(Math.cos(passo * Math.PI * 2)) * 8;
  const k = visual.corpo ?? 1;
  const cx = 170, cy = 335 - pulinho, rx = 100 * k, ry = 72 * (0.88 + 0.12 * k) * (1 + respiro * 0.012);
  const hx = 196 + olhar * 6, hy = 108 - pulinho;
  const sombra = "rgba(0,0,0,0.16)";
  // franja de penas: pontas alternadas, mais compridas embaixo
  const franja: [number, number][] = [];
  for (let i = 0; i < 44; i++) {
    const t = (i / 44) * Math.PI * 2, s = Math.sin(t), r = i % 2 ? 1 + (s > -0.25 ? 0.16 : 0.06) : 1;
    franja.push([cx + rx * r * Math.cos(t), cy + ry * r * s]);
  }
  const topete = visual.topete ?? "liso";
  const tufo: [number, number][] = [];
  if (topete !== "nenhum") {
    const n = topete === "arrepiado" ? 7 : 9, alto = topete === "arrepiado" ? 30 : 10;
    for (let i = 0; i <= n * 2; i++) {
      const a = ((200 + (140 * i) / (n * 2)) * Math.PI) / 180, r = i % 2 ? 34 + alto * (0.75 + 0.25 * Math.sin(i * 2.1)) : 31;
      tufo.push([hx + r * Math.cos(a), hy - 5 + r * 0.95 * Math.sin(a)]);
    }
    tufo.push([hx + 24, hy - 16], [hx, hy - 20], [hx - 24, hy - 16]);
  }
  const arregalado = expressao === "surpreso";
  const fechado = piscando;
  const falando = boca !== "X" && boca !== "A";
  const abre = falando ? (boca === "D" || boca === "C" ? 1 : 0.5) : expressao === "surpreso" ? 0.8 : expressao === "feliz" ? 0.4 : 0;
  const asaCima = pose === "comemorando" || pose === "bracos_abertos";
  const pescoco = visual.pescoco ?? "#7FA6C9";
  const brow = expressao === "bravo" ? [6, -4] : expressao === "triste" || expressao === "duvida" ? [-4, 4] : arregalado ? [-8, -8] : null;
  return (
    <svg viewBox="0 0 360 540" height={altura} style={{ overflow: "visible", transform: espelhar ? "scaleX(-1)" : undefined }}>
      <ellipse cx={180} cy={528} rx={74 * k} ry={10} fill="rgba(0,0,0,0.25)" />
      {/* pernas finas com o tornozelo dobrado e três dedos */}
      {[-1, 1].map((lado) => {
        const ox = lado * anda * 14, up = passo === undefined ? 0 : Math.max(0, Math.sin((passo + (lado > 0 ? 0.5 : 0)) * Math.PI * 2)) * 22;
        const qx = cx + lado * 24, qy = cy + ry * 0.55, px = cx + lado * 30 + ox, py = 512 - up;
        const jx = (qx + px) / 2 + lado * 10, jy = (qy + py) / 2 + 14 - up * 0.3;
        return (
          <g key={lado}>
            <path d={`M ${qx} ${qy} Q ${jx} ${jy} ${px} ${py}`} stroke={visual.calca} strokeWidth={8} fill="none" strokeLinecap="round" />
            <circle cx={jx - lado * 2} cy={jy - 4} r={5.5} fill={visual.calca} />
            {[[-18, 3], [-1, 7], [16, 3]].map(([dx, dy], i) => (
              <line key={i} x1={px} y1={py} x2={px + dx} y2={py + dy} stroke={visual.sapato} strokeWidth={6} strokeLinecap="round" />
            ))}
          </g>
        );
      })}
      {/* pescoço comprido */}
      <path d={`M ${cx + rx * 0.3} ${cy - ry * 0.5} Q ${hx + 34} ${(cy + hy) / 2 + 6} ${hx} ${hy + 20}`} stroke={pescoco} strokeWidth={24} fill="none" strokeLinecap="round" />
      {/* asinhas */}
      {[-1, 1].map((lado) => (
        <polygon key={lado} fill={visual.camisa} transform={`rotate(${lado * (asaCima ? -55 : 20)} ${cx + lado * rx * 0.86} ${cy - 6})`}
          points={pts([[cx + lado * rx * 0.86, cy - 16], [cx + lado * (rx * 0.86 + 30), cy], [cx + lado * (rx * 0.86 + 20), cy + 6], [cx + lado * (rx * 0.86 + 26), cy + 16], [cx + lado * rx * 0.86, cy + 14]])} />
      ))}
      {/* corpo de penas */}
      <polygon points={pts(franja)} fill={visual.camisa} />
      <ellipse cx={cx + rx * 0.18} cy={cy + ry * 0.25} rx={rx * 0.8} ry={ry * 0.7} fill={sombra} />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => {
        const x = cx + (c - 1.5) * rx * 0.42 + (r % 2) * rx * 0.2, y = cy - ry * 0.4 + r * ry * 0.42;
        return <path key={`${r}${c}`} d={`M ${x - 10} ${y - 6} L ${x} ${y + 4} L ${x + 10} ${y - 6}`} stroke="rgba(0,0,0,0.22)" strokeWidth={3} fill="none" strokeLinecap="round" />;
      }))}
      {/* cabeça e topete */}
      <ellipse cx={hx} cy={hy} rx={34} ry={31} fill={pescoco} />
      <ellipse cx={hx + 12} cy={hy + 9} rx={24} ry={20} fill="rgba(0,0,0,0.1)" />
      {tufo.length > 0 && <polygon points={pts(tufo)} fill={visual.cabelo ?? "#5E5245"} />}
      {/* olhos laranja arregalados */}
      {[-1, 1].map((lado) => {
        const ex = hx + lado * 14, ey = hy - 2, R = arregalado ? 14.5 : 12;
        if (fechado) return <line key={lado} x1={ex - 9} y1={ey} x2={ex + 9} y2={ey} stroke="#231B18" strokeWidth={4} strokeLinecap="round" />;
        return (
          <g key={lado}>
            <circle cx={ex} cy={ey} r={R} fill="#FFFFFF" />
            <circle cx={ex + olhar * 3} cy={ey} r={arregalado ? 6 : 7} fill={visual.olhos} />
            <circle cx={ex + olhar * 3} cy={ey} r={arregalado ? 2.6 : 3.4} fill="#231B18" />
            {(expressao === "bravo" || expressao === "triste") && <path d={`M ${ex - R} ${ey - 1} A ${R} ${R} 0 0 1 ${ex + R} ${ey - 1} Z`} fill={pescoco} />}
          </g>
        );
      })}
      {brow && [-1, 1].map((lado) => (
        <line key={lado} x1={hx + lado * 10} y1={hy - 20 + brow[0]} x2={hx + lado * 26} y2={hy - 20 + brow[1]} stroke="#2E2420" strokeWidth={5} strokeLinecap="round" />
      ))}
      {/* bico curto e achatado */}
      {abre > 0 && (
        <g>
          <ellipse cx={hx} cy={hy + 19 + 3 * abre} rx={10} ry={4 + 6 * abre} fill="#3A2420" />
          <polygon points={pts([[hx - 10, hy + 19 + 8 * abre], [hx + 10, hy + 19 + 8 * abre], [hx, hy + 27 + 9 * abre]])} fill={visual.pele} />
        </g>
      )}
      <polygon points={pts([[hx - 14, hy + 10], [hx + 14, hy + 10], [hx + 9, hy + 18], [hx, hy + 24], [hx - 9, hy + 18]])} fill={visual.pele} />
      <circle cx={hx - 4} cy={hy + 13} r={1.5} fill="#231B18" />
      <circle cx={hx + 4} cy={hy + 13} r={1.5} fill="#231B18" />
    </svg>
  );
};

/** Robozinho: cabeça redonda com tela de olhos, tronco de casco, antena e perninhas curtas (de frente). */
const Robo: React.FC<Props> = ({
  visual, boca = "X", expressao = "neutro", pose = "neutro", piscando = false, olhar = 0, respiro = 0,
  espelhar = false, altura = 900, passo,
}) => {
  const anda = passo === undefined ? 0 : Math.sin(passo * Math.PI * 2);
  const pulinho = passo === undefined ? 0 : Math.abs(Math.cos(passo * Math.PI * 2)) * 6;
  const p = POSES[pose];
  const k = visual.corpo ?? 1;
  const casco = visual.camisa, junta = visual.pele, det = visual.corDetalhe ?? "#2F80ED";
  const tela = visual.cabelo ?? "#14213D", brilho = visual.olhos;
  const sombra = "rgba(0,0,0,0.14)";
  const falando = boca !== "X" && boca !== "A";
  const cabecaY = falando ? -1.5 : 0;
  const peito = 1 + respiro * 0.012;
  const ox = 180 - 54 * k, lx = 108 * k; // tronco
  const ombroE = ox - 2, ombroD = ox + lx + 2;
  const angFrente: [number, number] = [p.dir[0] + anda * 12 * (pose === "neutro" ? 1 : 0), p.dir[1]];
  const dx = olhar * 5;
  // olhos na tela
  const olho = (cx: number, lado: number) => {
    const cy = 132;
    if (piscando) return <rect x={cx - 12} y={cy - 2} width={24} height={5} rx={2.5} fill={brilho} />;
    if (expressao === "feliz") return <path d={`M ${cx - 12} ${cy + 5} Q ${cx} ${cy - 12} ${cx + 12} ${cy + 5}`} stroke={brilho} strokeWidth={6} fill="none" strokeLinecap="round" />;
    const r = expressao === "surpreso" ? 15 : expressao === "duvida" && lado > 0 ? 8 : 12;
    const ry = expressao === "triste" || expressao === "bravo" ? r * 0.7 : r;
    const inclina = expressao === "bravo" ? lado * 16 : expressao === "triste" ? -lado * 16 : 0;
    return (
      <g transform={`rotate(${inclina} ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy + (r - ry)} rx={r} ry={ry} fill={brilho} />
        <circle cx={cx + r * 0.35} cy={cy - r * 0.35 + (r - ry)} r={r * 0.28} fill="rgba(255,255,255,0.75)" />
      </g>
    );
  };
  const abre = falando ? ({ B: 5, C: 9, D: 13, E: 10, F: 7, G: 5, H: 9 } as Record<string, number>)[boca] ?? 6
    : expressao === "surpreso" ? 8 : 0;
  const largBoca = boca === "E" || boca === "F" ? 12 : 20;
  return (
    <svg viewBox="0 0 360 540" height={altura} style={{ overflow: "visible", transform: espelhar ? "scaleX(-1)" : undefined }}>
      <ellipse cx={180} cy={528} rx={70 * k} ry={10} fill="rgba(0,0,0,0.25)" />
      {/* perninhas */}
      {[-1, 1].map((lado) => (
        <g key={lado} transform={`rotate(${lado * anda * 14} ${180 + lado * 26} 380)`}>
          <rect x={180 + lado * 26 - 13} y={372} width={26} height={120} rx={10} fill={visual.calca} />
          <rect x={180 + lado * 26 - 15} y={430} width={30} height={10} rx={5} fill={junta} />
          <path d={`M ${180 + lado * 26 - 28} 520 L ${180 + lado * 26 - 28} 506 Q ${180 + lado * 26} 486 ${180 + lado * 26 + 28} 506 L ${180 + lado * 26 + 28} 520 Z`} fill={visual.sapato} />
        </g>
      ))}
      <g transform={`translate(0 ${-pulinho})`}>
        {/* braço de trás */}
        <Braco x={ombroE} y={262} angulos={[p.esq[0] - anda * 12 * (pose === "neutro" ? 1 : 0), p.esq[1]]} cor={casco} pele={junta} />
        {/* tronco */}
        <g transform={`translate(180 380) scale(1 ${peito}) translate(-180 -380)`}>
          <rect x={ox} y={244} width={lx} height={136} rx={30} fill={casco} />
          <rect x={ox + lx * 0.55} y={252} width={lx * 0.4} height={120} rx={20} fill={sombra} />
          <rect x={180 - 30} y={280} width={60} height={46} rx={12} fill={det} />
          <circle cx={168} cy={303} r={7} fill={brilho} />
          <rect x={182} y={297} width={18} height={5} rx={2.5} fill="rgba(255,255,255,0.7)" />
          <rect x={182} y={307} width={12} height={5} rx={2.5} fill="rgba(255,255,255,0.7)" />
          <rect x={ox + 6} y={356} width={lx - 12} height={10} rx={5} fill={sombra} />
        </g>
        {/* braço da frente */}
        <Braco x={ombroD} y={262} angulos={angFrente} cor={casco} pele={junta} segura={visual.segura} />
        {/* cabeça */}
        <g transform={`translate(0 ${cabecaY})`}>
          <rect x={164} y={222} width={32} height={26} rx={6} fill={junta} />
          {visual.antena !== "nenhuma" && (visual.antena === "dupla" ? [-1, 1] : [0]).map((l) => (
            <g key={l}>
              <path d={`M ${180 + l * 34} 52 L ${180 + l * 46} 18`} stroke={junta} strokeWidth={7} strokeLinecap="round" />
              <circle cx={180 + l * 46} cy={16} r={11} fill={det} />
            </g>
          ))}
          {[-1, 1].map((l) => <rect key={l} x={180 + l * 94 - 12} y={110} width={24} height={46} rx={10} fill={det} />)}
          <circle cx={180} cy={134} r={90} fill={casco} />
          <path d="M 236 64 A 90 90 0 0 1 236 204 A 110 110 0 0 0 236 64 Z" fill={sombra} />
          <rect x={112} y={86} width={136} height={100} rx={44} fill={tela} />
          <rect x={126} y={94} width={44} height={8} rx={4} fill="rgba(255,255,255,0.16)" />
          {olho(156 + dx, -1)}
          {olho(204 + dx, 1)}
          {abre > 0
            ? <rect x={180 - largBoca / 2} y={166 - abre / 2} width={largBoca} height={abre} rx={Math.min(abre, largBoca) / 2} fill={brilho} />
            : expressao === "feliz"
              ? <path d="M 168 164 Q 180 174 192 164" stroke={brilho} strokeWidth={5} fill="none" strokeLinecap="round" />
              : expressao === "triste" || expressao === "bravo"
                ? <path d="M 168 170 Q 180 160 192 170" stroke={brilho} strokeWidth={5} fill="none" strokeLinecap="round" />
                : <rect x={168} y={164} width={24} height={5} rx={2.5} fill={brilho} />}
          {visual.oculos && <Oculos o={visual.oculos} e={156 + dx} d={204 + dx} y={134} r={21} />}
        </g>
      </g>
    </svg>
  );
};

export const Personagem: React.FC<Props> = (props) => {
  if (props.visual.especie === "emu") return <Emu {...props} />;
  if (props.visual.especie === "robo") return <Robo {...props} />;
  return <Humano {...props} />;
};

const Humano: React.FC<Props> = ({
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
  const angFrente: [number, number] = [p.dir[0] + anda * 12 * (pose === "neutro" ? 1 : 0), p.dir[1]];

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
        {visual.avental && (
          <g>
            <path d="M 150 214 L 138 196 M 210 214 L 222 196" stroke={visual.avental} strokeWidth={7} strokeLinecap="round" />
            <path d="M 150 212 L 210 212 L 212 268 L 230 274 L 232 352 Q 180 360 128 352 L 130 274 L 148 268 Z" fill={visual.avental} />
            <rect x={128} y={270} width={104} height={8} fill="rgba(0,0,0,0.18)" />
            <rect x={160} y={292} width={40} height={30} rx={4} fill="rgba(0,0,0,0.16)" />
          </g>
        )}
        {visual.malha && <Malha x={124} y={194} w={112} h={124} />}
        {visual.tunica && <Tunica t={visual.tunica} />}
        {visual.colete && <Colete c={visual.colete} />}
        {visual.capuz && (
          <g>
            <path d="M 162 190 L 180 214 L 198 190 Z" fill={visual.capuz.sombra ?? "#0E1014"} />
            {visual.capuz.bolso && <path d="M 146 266 L 214 266 L 226 316 L 134 316 Z" fill="rgba(0,0,0,0.16)" />}
            {visual.capuz.cordao && [168, 192].map((x) => (
              <g key={x}>
                <line x1={x} y1={196} x2={x - (x < 180 ? 2 : -2)} y2={246} stroke={visual.capuz!.cordao} strokeWidth={4} strokeLinecap="round" />
                <rect x={x - (x < 180 ? 2 : -2) - 3} y={244} width={6} height={10} rx={2} fill={visual.capuz!.cordao} />
              </g>
            ))}
          </g>
        )}
      </g>

      {/* lança em pé na mão da frente */}
      {visual.segura === "lanca" && <Lanca hx={maoDe(232, 204, angFrente)[0]} hy={maoDe(232, 204, angFrente)[1]} />}

      {/* braço da frente (direito) */}
      <Braco x={232} y={204} angulos={angFrente} cor={visual.camisa} pele={visual.pele} segura={visual.segura} />

      {/* cabeça */}
      {visual.capuz ? (
      <g transform={`translate(0 ${cabecaY})`}>
        <Capuz c={visual.capuz} />
        <OlhosBrilho cor={visual.olhos} sombra={visual.capuz.sombra ?? "#0E1014"} dx={dx} ry={piscando ? 1.5 : expressao === "surpreso" ? 12 : 9}
          expressao={expressao} pulso={falando ? (boca === "D" || boca === "C" ? 4 : 2) : 0} />
      </g>
      ) : (
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

        {visual.oculos && <Oculos o={visual.oculos} e={156 + dx} d={204 + dx} y={118} r={17} />}

        {visual.bigode &&<path d="M 158 141 Q 170 133 180 139 Q 190 133 202 141 Q 196 149 180 144 Q 164 149 158 141 Z" fill={visual.cabelo ?? "#3B2A1A"} />}

        {visual.chapeu.tipo === "nenhum" && visual.cabelo && (
          <path d="M 112 112 Q 110 50 180 46 Q 250 50 248 112 Q 236 84 214 78 Q 190 92 150 80 Q 124 86 112 112 Z" fill={visual.cabelo} />
        )}
        <Chapeu tipo={visual.chapeu.tipo} cor={visual.chapeu.cor} corFaixa={visual.chapeu.corFaixa} />
      </g>
      )}
      </g>
    </svg>
  );
};
