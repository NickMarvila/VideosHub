import { Composition } from "remotion";
import { TesteZeca } from "./cenas/TesteZeca";
import { Video2D } from "./video2d/Video2D";
import { BridgeShort, BRIDGE_FRAMES } from "./cartoon/ponte/Bridge";
import { TesteCubo } from "./cartoon/TesteCubo";
import { Cartoon3D } from "./cartoon/Cartoon3D";
import type { PropsCartoon } from "./cartoon/tipos";

const EXEMPLO_CARTOON: PropsCartoon = {
  palavras: [],
  storyboard: {
    duracao: 8,
    elenco: {
      tales: { jacket: "#d62828", pants: "#2b2d42", boots: "#3b2a1a", hat: "hair", hair: "#3b2a1a", moustache: "#3b2a1a", skin: "#f5c9a0" },
      zeca: { jacket: "#3c6fa8", pants: "#2d3b57", boots: "#5a3b26", hat: "cap", cap: "#e07b2e", skin: "#ecd0b6", build: "stout" },
    },
    cenas: [
      { inicio: 0, fim: 4, cenario: "vila", luz: "dia", camera: [{ t: 0, pos: [0, 1.6, 9], olha: [0, 1.4, 0], fov: 40 }, { t: 3.5, pos: [0.6, 1.5, 5.5], olha: [0, 1.5, 0], fov: 38 }],
        foco: { desfoque: 12, alvo: "tales" },
        atores: [{ id: "tales", x: [[0, -1.6], [2.5, 0]], z: 0.5, expressoes: [[0, "sorriso"], [2.6, "sorrisao"]], acoes: [[2.7, "acena"]] },
                 { id: "zeca", x: 2.6, z: -1.5, expressoes: [[0, "neutro"], [3, "nervoso"]] }] },
      { inicio: 4, fim: 8, cenario: "vila", luz: "fim_de_tarde", transicao: "flash",
        camera: [{ t: 4, pos: [-8, 4, 16], olha: [0, 1.5, 0], fov: 40 }, { t: 7.5, pos: [-4, 2.5, 11], olha: [0, 1.4, 0], fov: 40 }],
        foco: { desfoque: 0 },
        atores: [{ id: "tales", x: 0, z: 0.5, expressoes: [[4, "riso"]] }, { id: "zeca", x: 2.6, z: -1.5, expressoes: [[4, "choque"]] }],
        efeitos: [{ tipo: "estrelas", de: 5, ate: 6.5, pos: [2.6, 2.6, -1.5], tamanho: 1.2 }] },
    ],
  },
};
import type { Props2D } from "./video2d/tipos";
import { ZECA } from "./cenas/TesteZeca";

const EXEMPLO: Props2D = {
  palavras: [],
  storyboard: {
    duracao: 4,
    personagens: { zeca: ZECA },
    cenas: [{ inicio: 0, fim: 4, cenario: "rua_dia", atores: [{ id: "zeca", x: [[0, 300], [3, 700]] }],
      objetos: [{ tipo: "parati", x: 600, y: 1520, escala: 1 }], textos: [{ texto: "EXEMPLO 2D", estilo: "titulo" }] }],
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="TesteZeca" component={TesteZeca} durationInFrames={195} fps={30} width={1080} height={1920} />
      <Composition
        id="Video2D"
        component={Video2D}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={120}
        defaultProps={EXEMPLO}
        calculateMetadata={({ props }) => ({ durationInFrames: Math.max(30, Math.ceil(props.storyboard.duracao * 30)) })}
      />
      <Composition id="Cartoon3D" component={Cartoon3D} fps={30} width={1080} height={1920} durationInFrames={240} defaultProps={EXEMPLO_CARTOON}
        calculateMetadata={({ props }) => ({ durationInFrames: Math.max(30, Math.ceil(props.storyboard.duracao * 30)) })} />
      <Composition id="TesteCubo" component={TesteCubo} durationInFrames={60} fps={30} width={1080} height={1920} />
      <Composition id="PonteTeste" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    </>
  );
};
