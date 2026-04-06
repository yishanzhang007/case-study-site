import { useEffect, useRef } from 'react';

const CENTER_X = 700;
const BASE_WIDTH = 1440;

export default function useSpreadLayout(sceneRef) {
  const elDataRef = useRef([]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Collect elements and their original left positions
    const els = scene.querySelectorAll('[class*="positioned"], [class*="deco-img"]');
    const elData = [];
    els.forEach((el) => {
      const left = parseFloat(el.style.left);
      if (!isNaN(left)) {
        const isDeco = el.classList.contains('deco-img');
        elData.push({ el, origLeft: left, isDeco });
      }
    });
    elDataRef.current = elData;

    function updateScene() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const spread = (vw - BASE_WIDTH) / BASE_WIDTH;

      // Batch all DOM writes together (no reads between writes)
      const updates = elDataRef.current.map((d) => {
        const distFromCenter = d.origLeft - CENTER_X;
        const factor = spread >= 0 ? spread * 0.35 : spread * 0.4;
        return { el: d.el, left: d.origLeft + distFromCenter * factor };
      });
      updates.forEach(({ el, left }) => { el.style.left = left + 'px'; });

      scene.style.height = vh + 'px';
      scene.style.top = '0';
      scene.style.transformOrigin = 'top left';
      scene.style.transform = 'none';
      // Center the scene: when viewport is narrower than content, center so equal crop on both sides
      scene.style.marginLeft = ((vw - BASE_WIDTH) / 2) + 'px';
    }

    updateScene();
    window.addEventListener('resize', updateScene);
    return () => window.removeEventListener('resize', updateScene);
  }, [sceneRef]);
}
