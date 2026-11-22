// Cadeia de pós-processamento montada à mão (postprocessing "puro"), no lugar do <EffectComposer> do
// @react-three/postprocessing, que deixa o quadro vazio dentro do ThreeCanvas do Remotion nesta combinação de versões.
// Recebe a lista de passes/efeitos em ordem; cada efeito de convolução fica no seu próprio EffectPass.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, EffectPass, Pass, RenderPass, Effect } from "postprocessing";

export const Composer: React.FC<{ etapas: (Pass | Effect | Effect[])[]; multisampling?: number }> = ({ etapas, multisampling = 4 }) => {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const c = new EffectComposer(gl, { multisampling, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    for (const e of etapas) {
      if (e instanceof Pass) c.addPass(e);
      else c.addPass(new EffectPass(camera, ...(Array.isArray(e) ? e : [e])));
    }
    return c;
  }, [gl, scene, camera, etapas, multisampling]);
  useEffect(() => { composer.setSize(size.width, size.height); }, [composer, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame((_, delta) => { composer.render(delta); }, 1);
  return null;
};
