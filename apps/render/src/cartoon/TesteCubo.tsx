import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { EffectComposer } from "@react-three/postprocessing";
import { Composer } from "./Composer";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });

export const TesteCubo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#223" }}>
      <ThreeCanvas width={1080} height={1920} camera={{ fov: 40, position: [0, 0, 6] }}>
        <ambientLight intensity={1} />
        <directionalLight position={[3, 4, 5]} intensity={2} />
        {(getInputProps() as { comp?: number }).comp === 3 ? <Composer etapas={[tone]} /> : null}
        {(getInputProps() as { comp?: number }).comp && (getInputProps() as { comp?: number }).comp !== 3 ? <EffectComposer multisampling={(getInputProps() as { comp?: number }).comp === 2 ? 4 : 0}><primitive object={tone} /></EffectComposer> : null}
        <mesh rotation={[0.4, f / 20, 0]}><boxGeometry args={[2, 2, 2]} /><meshStandardMaterial color="orange" /></mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
