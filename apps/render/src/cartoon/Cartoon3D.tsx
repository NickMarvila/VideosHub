// Composição "Cartoon3D": o visual da skill cartoon-audio-short (personagens-figurinha num mundo 3D com tinta, desfoque
// de lente e cor de cinema), movido por um storyboard em JSON. Pós-processamento na mesma ordem do motor original:
// tinta -> desfoque (pre + main) -> bloom + tone mapping NEUTRAL + grade.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "./ponte/ink";
import { LensBlur } from "./ponte/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./ponte/grade";
import { Composer } from "./Composer";
import { Mundo, FPS, valor } from "./mundo";
import { Legenda } from "../legenda/Legenda";
import type { PropsCartoon, StoryboardCartoon } from "./tipos";

const bloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3();

const Interno: React.FC<{ sb: StoryboardCartoon; idx: number }> = ({ sb, idx }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const mundo = useMemo(() => new Mundo(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: bloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const etapas = useMemo(() => [fx.ink, fx.lens.pre, fx.lens.main, [fx.bloom, fx.tone, fx.grade]], [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const cena = sb.cenas[idx];
  const t = f / FPS;
  const alvoPadrao = mundo.update(sb, idx, f, cam, scene);
  noInkFallback(mundo.root);
  // foco da lente: num ator (cabeça), num ponto, ou para onde a câmera olha
  const foco = cena.foco ?? {};
  let ponto = alvoPadrao.clone();
  if (typeof foco.alvo === "string") {
    const a = cena.atores?.find((x) => x.id === foco.alvo);
    if (a) ponto = new THREE.Vector3(valor(a.x as never, t, 0), 1.75 * (a.escala ?? 1), valor(a.z as never, t, 0));
  } else if (Array.isArray(foco.alvo)) ponto = new THREE.Vector3(...foco.alvo);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, ponto.sub(cam.position).dot(fwd));
  fx.lens.cInf = foco.desfoque ?? 0;
  gradeFor(fx.grade, cena.luz === "golden" || cena.luz === "fim_de_tarde" ? "golden" : "day");
  return (<><primitive object={mundo.root} dispose={null} /><Composer etapas={etapas} /></>);
};

export const Cartoon3D: React.FC<PropsCartoon> = ({ storyboard: sb, palavras }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const idx = Math.max(0, sb.cenas.findIndex((c) => t >= c.inicio && t < c.fim) === -1 ? sb.cenas.length - 1 : sb.cenas.findIndex((c) => t >= c.inicio && t < c.fim));
  const cena = sb.cenas[idx];
  const desde = f - Math.round(cena.inicio * FPS);
  const flash = cena.transicao === "flash" && desde >= 0 && desde < 6 ? [1, 0.8, 0.55, 0.35, 0.18, 0.06][desde] : 0;
  const leg = sb.legenda ?? {};
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <ThreeCanvas key={idx} width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.2, far: 1500 }}>
        <Interno sb={sb} idx={idx} />
      </ThreeCanvas>
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      {leg.ativo === true && <Legenda palavras={palavras} porVez={leg.porVez ?? 3} y={leg.y ?? 1560} cor={leg.cor ?? "#FFFFFF"} destaque={leg.destaque ?? "#FFD23F"} />}
      {sb.audio && <Audio src={staticFile(sb.audio)} />}
    </AbsoluteFill>
  );
};
