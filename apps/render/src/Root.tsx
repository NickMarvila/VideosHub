import { Composition } from "remotion";
import { TesteZeca } from "./cenas/TesteZeca";
import { Video2D } from "./video2d/Video2D";
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
    </>
  );
};
