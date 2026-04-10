import { useEffect, useRef } from 'react';

const CENTER_X = 700;
const BASE_WIDTH = 1440;
const MIN_VISIBLE_PX = 240;
// On narrow viewports, ensure each card's left edge sticks out at least this many
// pixels past the next card to its right (the next card paints on top via DOM order).
const MIN_GAP_BETWEEN_CARDS = 90;

export default function useSpreadLayout(sceneRef) {
  const elDataRef = useRef([]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Collect elements and their original left positions from data attributes (immutable source of truth)
    const els = scene.querySelectorAll('[data-orig-left]');
    const elData = [];
    els.forEach((el) => {
      if (el.style.position === 'fixed') return;
      const left = parseFloat(el.dataset.origLeft);
      if (!isNaN(left)) {
        const isDeco = el.classList.contains('deco-img');
        const cardWidth = parseFloat(el.dataset.cardWidth);
        elData.push({ el, origLeft: left, isDeco, cardWidth: isNaN(cardWidth) ? null : cardWidth });
      }
    });
    elDataRef.current = elData;

    function updateScene() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const extraWidth = vw - BASE_WIDTH;
      const halfShift = extraWidth / 2;

      // Pass 1: compute spread-based + per-card-clamp positions
      const sceneMargin = halfShift; // matches scene.style.marginLeft below
      const updates = elDataRef.current.map((d) => {
        const isLeftGroup = d.origLeft < CENTER_X;
        let newLeft;
        if (extraWidth >= 0) {
          // Group-based: left cards anchor to viewport-left, right cards anchor to viewport-right
          newLeft = d.origLeft + (isLeftGroup ? -halfShift : halfShift);
        } else {
          // Narrow viewport: keep existing inward compression
          const spread = extraWidth / BASE_WIDTH;
          const distFromCenter = d.origLeft - CENTER_X;
          newLeft = d.origLeft + distFromCenter * spread * 0.4;
        }

        // Clamp narrow-viewport positions so each card retains MIN_VISIBLE_PX on screen.
        // No-op on wide viewports because the spread already keeps cards in bounds.
        let minLeft = null;
        if (d.cardWidth) {
          const viewportLeft = newLeft + sceneMargin;
          const minViewportLeft = MIN_VISIBLE_PX - d.cardWidth;
          const maxViewportLeft = vw - MIN_VISIBLE_PX;
          const clamped = Math.max(minViewportLeft, Math.min(maxViewportLeft, viewportLeft));
          newLeft = clamped - sceneMargin;
          minLeft = minViewportLeft - sceneMargin;
        }

        return { el: d.el, left: newLeft, origLeft: d.origLeft, cardWidth: d.cardWidth, minLeft };
      });

      // Pass 2: enforce minimum gap between adjacent cards in DOM order so a later
      // card (which paints on top) can't fully cover an earlier one. Walk
      // right-to-left, pulling earlier cards leftward when they're too close.
      const cards = updates
        .filter((u) => u.cardWidth)
        .sort((a, b) => a.origLeft - b.origLeft); // matches DOM order
      for (let i = cards.length - 2; i >= 0; i--) {
        const me = cards[i];
        const next = cards[i + 1];
        const maxLeftAllowed = next.left - MIN_GAP_BETWEEN_CARDS;
        if (me.left > maxLeftAllowed) {
          me.left = Math.max(maxLeftAllowed, me.minLeft != null ? me.minLeft : maxLeftAllowed);
        }
      }

      updates.forEach(({ el, left }) => { el.style.left = left + 'px'; });

      scene.style.height = vh + 'px';
      scene.style.top = '0';
      scene.style.transformOrigin = 'top left';
      scene.style.transform = 'none';
      // Center the scene: when viewport is narrower than content, center so equal crop on both sides
      scene.style.marginLeft = ((vw - BASE_WIDTH) / 2) + 'px';
    }

    let pendingFrame = null;
    function scheduleUpdate() {
      if (pendingFrame !== null) return;
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;
        updateScene();
      });
    }

    updateScene(); // initial synchronous run for correct first paint
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
      elDataRef.current = [];
    };
  }, [sceneRef]);
}
