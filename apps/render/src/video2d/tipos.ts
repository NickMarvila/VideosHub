// Formato do storyboard 2D (storyboard2d.json). Documentação para a IA: apps/render/STORYBOARD2D.md
import type { Expressao, Pose, Visual } from "../personagem/Personagem";
import type { Palavra } from "../legenda/Legenda";

export type Cenario = "rua_dia" | "rua_noite" | "mercado" | "sala" | "estrada" | (string & {});
export type TipoObjeto =
  | "parati" | "dinheiro" | "moeda" | "relogio" | "celular" | "caixa_som" | "skate" | "pneu"
  | "balao" | "pensamento" | "seta" | "icone" | "placa" | (string & {});
export type Chave<T> = [number, T]; // [tempo em segundos, valor]

export type Ator = {
  id: string; // slug do personagem (personagens/<id>/personagem.json → rig2d)
  x: number | Chave<number>[]; // posição horizontal (0–1080); com chaves, ele anda entre elas
  y?: number; // linha do chão (padrão 1500)
  altura?: number; // padrão 900
  espelhar?: boolean; // olha para a esquerda
  entra?: "baixo" | "esquerda" | "direita" | "nenhum";
  poses?: Chave<Pose>[];
  expressoes?: Chave<Expressao>[];
  olhar?: number;
  fala?: [number, number][]; // trechos em que ESTE personagem mexe a boca
};

export type Objeto = {
  tipo: TipoObjeto;
  x: number | Chave<number>[];
  y: number | Chave<number>[];
  escala?: number;
  giro?: number | Chave<number>[];
  aparece?: number;
  some?: number;
  cor?: string;
  texto?: string; // balao, pensamento, placa
  icone?: "x" | "v" | "!" | "?" | "$" | "coracao";
  direcao?: "cima" | "baixo" | "esquerda" | "direita"; // seta
  movendo?: boolean; // parati: rodas girando
  quebrado?: boolean; // parati: sem freio / pneu murcho (fumaça)
};

export type Texto = { texto: string; estilo: "titulo" | "carimbo" | "pergunta" | "destaque"; de?: number; ate?: number };

export type Cena = {
  inicio: number;
  fim: number;
  cenario: Cenario;
  transicao?: "corte" | "flash" | "deslize";
  zoom?: [number, number]; // zoom no começo e no fim da cena (padrão [1, 1.05])
  foco?: [number, number]; // ponto que o zoom mira (padrão centro do chão)
  tremor?: [number, number]; // de, até
  pretoEBranco?: boolean;
  atores?: Ator[];
  objetos?: Objeto[];
  textos?: Texto[];
};

export type Storyboard2D = {
  titulo?: string;
  duracao: number;
  audio?: string;
  legenda?: { cor?: string; destaque?: string; porVez?: number; y?: number };
  personagens: Record<string, Visual>;
  cenas: Cena[];
  /** assets da biblioteca (assets2d/): SVG por slug, preenchido pelo render */
  extras?: { objetos?: Record<string, string>; cenarios?: Record<string, string> };
};

export type Props2D = { storyboard: Storyboard2D; palavras: Palavra[] };
