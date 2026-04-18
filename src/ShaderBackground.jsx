import { useRef, useState, useEffect } from 'react';
import { Shader, Dither, GridDistortion, Plasma } from 'shaders/react';

const SHADER_DURATION = 15000; // ms of live animation before freezing to save GPU

const shaderStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
};

export default function ShaderBackground({ onReady }) {
  const containerRef = useRef(null);
  const [staticFrame, setStaticFrame] = useState(null);

  // Signal ready after first frame renders
  useEffect(() => {
    const readyTimer = setTimeout(() => onReady?.(), 300);
    return () => clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    if (!isFinite(SHADER_DURATION)) return; // never freeze
    const timer = setTimeout(() => {
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) {
        try {
          setStaticFrame(canvas.toDataURL('image/png'));
        } catch (e) {
          // WebGL context lost or tainted — keep live shader as fallback
        }
      }
    }, SHADER_DURATION);
    return () => clearTimeout(timer);
  }, []);

  if (staticFrame) {
    return (
      <img
        src={staticFrame}
        alt=""
        style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <div ref={containerRef}>
      <Shader style={shaderStyle}>
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
    </div>
  );
}
