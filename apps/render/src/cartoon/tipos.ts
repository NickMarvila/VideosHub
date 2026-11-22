// Storyboard do estilo "Cartoon 3D" (storyboard_cartoon.json). Guia para a IA: apps/render/STORYBOARD_CARTOON.md
import type { Outfit } from "./ponte/toon";
import type { Palavra } from "../legenda/Legenda";

export type Chave<T> = [number, T];
type V3 = [number, number, number];

export type AtorCartoon = {
  id: string;                                // chave em "elenco"
  x: number | Chave<number>[];               // metros; com chaves, anda entre os pontos
  z: number | Chave<number>[];
  y?: number | Chave<number>[];              // altura dos pés (ex.: em cima da carroceria); padrão 0
  andar?: boolean;                           // false = desliza sem passo (vai montado num veículo)
  expressoes?: Chave<string>[];              // neutro, serio, sorriso, sorrisao, riso, assobio, nervoso, choque, alivio, tonto, dor
  acoes?: Chave<string>[];                   // parado, acena, senta, cai, comemora, maos_cabeca, abre, maos_cintura, aponta, pensa, segura, pulo, tremer
  olhar?: number | Chave<number>[];          // -1 (esquerda) a 1 (direita)
  escala?: number;
  espelhar?: boolean;
};
export type CameraChave = { t: number; pos: V3; olha: V3; fov?: number; roll?: number };
export type EfeitoCartoon = { tipo: "estrelas" | "explosao" | "notas" | "poeira"; de: number; ate: number; pos: V3; tamanho?: number };
export type ObjetoCartoon = {
  tipo: string;                              // 3D: parati, caixa_som, banco, poste, cone, mesa, caixote, pneu · 2D: dinheiro, moeda, relogio, celular, balao, pensamento, icone, seta
  x: number | Chave<number>[]; z: number | Chave<number>[]; y?: number | Chave<number>[];
  giro?: number | Chave<number>[];           // graus (3D: em volta do eixo vertical; 2D: inclinação da figurinha)
  escala?: number; aparece?: number; some?: number;
  movendo?: boolean;                         // parati: rodas giram e o carro aponta para onde anda
  etapa?: number | Chave<number>[];          // torre_de_pisa: 0..1 (3/8 = obra com 3 andares; 1 = completa)
  inclinacao?: number | Chave<number>[];     // torre_de_pisa: graus, tomba para +x (padrão 4)
  texto?: string; icone?: string; cor?: string;
};
export type CenaCartoon = {
  inicio: number; fim: number;
  cenario?: "vila" | "praca" | "campo";
  luz?: "day" | "golden" | "dia" | "fim_de_tarde";
  transicao?: "corte" | "flash";
  camera: CameraChave[];
  foco?: { desfoque?: number; alvo?: string | V3 };  // desfoque = raio em px a 1080 (0 = tudo nítido; close 12-16)
  solAz?: number; solEl?: number;
  atores?: AtorCartoon[];
  efeitos?: EfeitoCartoon[];
  objetos?: ObjetoCartoon[];
};
export type StoryboardCartoon = {
  titulo?: string;
  duracao: number;
  audio?: string;
  legenda?: { ativo?: boolean; cor?: string; destaque?: string; porVez?: number; y?: number };
  elenco: Record<string, Outfit>;
  cenas: CenaCartoon[];
};
export type PropsCartoon = { storyboard: StoryboardCartoon; palavras: Palavra[] };
