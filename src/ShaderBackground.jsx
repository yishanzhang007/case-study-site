import { Shader, Dither, GridDistortion, Plasma } from 'shaders/react';

export default function ShaderBackground() {
  return (
    <Shader style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0, animation: 'shaderFadeIn 600ms ease 300ms forwards' }}>
      <Dither
        colorA="#ffffff"
        colorB="#9e9e9e"
        pattern="bayer8"
        pixelSize={2}
        spread={0.99}
        threshold={0.43}
        transform={{ scale: 1.33 }}>
        <Plasma
          colorA="#ffffff"
          contrast={0.9}
          density={0.3}
          intensity={0.8}
          speed={1}
          warp={0.52} />
      </Dither>
      <GridDistortion
        decay={5.3}
        gridSize={105}
        intensity={5}
        radius={1.5} />
    </Shader>
  );
}
