import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { HalftoneDots, Dithering, Water } from '@paper-design/shaders-react';
import { Shader, Dither, GridDistortion, Plasma, WaveDistortion } from 'shaders/react';
import { FunkyShadow } from 'funky-shadow';
import useSpreadLayout from './useSpreadLayout';

const DotBackground = React.memo(function DotBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const spacing = 14;
    const minR = 0.6;
    const maxR = 0.9;

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#c8c7c4';

      for (let x = 0; x < w; x += spacing) {
        for (let y = 0; y < h; y += spacing) {
          // Distance from center on both axes (0 at center, 1 at edges)
          // Keep minR for center 60%, grow in outer 20% on all 4 edges
          const dx = Math.abs(x - w / 2) / (w / 2);
          const dy = Math.abs(y - h / 2) / (h / 2);
          const dist = Math.max(dx, dy); // use whichever axis is closer to edge
          const edgeStart = 0.6; // dots stay minR until 60% from center
          const t = dist <= edgeStart ? 0 : (dist - edgeStart) / (1 - edgeStart);
          const r = minR + (maxR - minR) * t;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}
    />
  );
});

const ProximityText = React.memo(function ProximityText({ text, radius = 50, hoverColor = '#EF5E06', baseColor = 'var(--fg-primary)' }) {
  const containerRef = useRef(null);
  const spansRef = useRef([]);
  const rectsRef = useRef([]);
  const rafRef = useRef(null);
  const words = text.split(' ');

  // Cache span positions (update on resize)
  const cacheRects = useCallback(() => {
    rectsRef.current = spansRef.current.map(span => {
      if (!span) return null;
      const rect = span.getBoundingClientRect();
      return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    });
  }, []);

  useEffect(() => {
    cacheRects();
    window.addEventListener('resize', cacheRects);
    return () => window.removeEventListener('resize', cacheRects);
  }, [cacheRects]);

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) return; // throttle to rAF
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const mx = e.clientX, my = e.clientY;
      const rects = rectsRef.current;
      const spans = spansRef.current;
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i], r = rects[i];
        if (!span || !r) continue;
        const dist = Math.sqrt((mx - r.cx) ** 2 + (my - r.cy) ** 2);
        const t = Math.max(0, 1 - dist / radius);
        const smooth = t * t * (3 - 2 * t);
        span.style.color = smooth > 0.01 ? hoverColor : baseColor;
        span.style.opacity = 1 - smooth * 0.5;
      }
    });
  }, [radius, hoverColor, baseColor]);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    spansRef.current.forEach((span) => {
      if (!span) return;
      span.style.color = baseColor;
      span.style.opacity = 1;
    });
  }, [baseColor]);

  return (
    <p
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ pointerEvents: 'auto', cursor: 'default' }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          ref={(el) => (spansRef.current[i] = el)}
          style={{ transition: 'color 150ms ease, opacity 150ms ease', display: 'inline' }}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  );
});

function BottomNavButton({ label, src, isActive, isHidden, isRemoved, activeWidth, activeHeight, isCompact, onMouseEnter, onMouseLeave, onClick }) {
  // Delay the label's re-appearance until after the image finishes collapsing,
  // otherwise it flashes during the 150ms shrink animation.
  const [showLabel, setShowLabel] = useState(!isActive);
  useEffect(() => {
    if (isActive) {
      setShowLabel(false);
      return;
    }
    const t = setTimeout(() => setShowLabel(true), isCompact ? 0 : 150);
    return () => clearTimeout(t);
  }, [isActive]);

  // When expanded, shift the card horizontally via transform so it stays
  // within the viewport with 16px padding. Transform doesn't affect layout,
  // so no hover-blink.
  const wrapperRef = useRef(null);
  const [shiftX, setShiftX] = useState(0);
  useEffect(() => {
    if (!isActive || !wrapperRef.current) {
      setShiftX(0);
      return;
    }
    const rect = wrapperRef.current.getBoundingClientRect();
    const cardWidth = activeWidth + 24; // 24 = padding
    const rightOverflow = (rect.left + cardWidth) - (window.innerWidth - 16);
    const leftOverflow = 16 - rect.left;
    if (rightOverflow > 0) {
      setShiftX(-rightOverflow);
    } else if (leftOverflow > 0) {
      setShiftX(leftOverflow);
    } else {
      setShiftX(0);
    }
  }, [isActive, activeWidth]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'relative',
        zIndex: isActive ? 10 : 1,
        flexShrink: isActive ? 0 : undefined,
        display: isRemoved ? 'none' : undefined,
        visibility: isHidden && !isRemoved ? 'hidden' : undefined,
      }}
    >
      <motion.div
        onClick={onClick}
        animate={isActive
          ? { background: 'rgba(255,255,255,0.2)' }
          : { background: 'rgba(255,255,255,0.2)' }
        }
        transition={{ duration: 0.15 }}
        style={{
          cursor: 'pointer', overflow: 'hidden',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          border: 'none', position: 'relative', zIndex: 1,
          padding: '12px',
          minWidth: isActive && !isCompact ? activeWidth : undefined,
          borderRadius: isActive ? 16 : 8,
          ...(isActive && isCompact ? {
            position: 'fixed',
            bottom: 12,
            left: 12,
            right: 12,
            zIndex: 30,
            width: 'auto',
            minWidth: 0,
          } : {
            transform: isActive && shiftX ? `translateX(${shiftX}px)` : undefined,
            transition: isActive ? 'transform 0.2s ease-out' : 'none',
          }),
        }}
      >
        {showLabel && (
          <span style={{ display: 'block', fontFamily: "'Tobias', serif", fontWeight: 300, fontSize: 14, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        )}
        <motion.div
          animate={isActive
            ? { opacity: 1, height: activeHeight, width: activeWidth }
            : { opacity: 0, height: 0, width: 0 }
          }
          transition={isActive
            ? { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
            : { duration: isCompact ? 0 : 0.15, ease: [0.4, 0, 1, 1] }
          }
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, overflow: 'hidden' }}
        >
          <img
            src={src}
            alt={`${label} preview`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

const CARD_CONFIGS = {
  onboarding: { src: '/assets/Onboarding.svg', width: 432, radius: 16, fullscreen: true, customModal: 'onboarding' },
  kb: { src: '/assets/kb.svg', width: 446, radius: 12 },
  scheduling: { src: '/assets/scheduling.svg', width: 411, radius: 12, fullscreen: true, customModal: 'scheduling' },
  chat: { src: '/assets/Onboarding.svg', width: 584, radius: 12 },
  medication: { src: '/assets/test call.svg', width: 398, radius: 12, fullscreen: true, customModal: 'testcall' },
  notes: { src: '/assets/Notes.svg', width: 382, radius: 14, fullscreen: true, customModal: true },
  testcall: { src: '/assets/test call.svg', width: 398, radius: 12 },
  inbox: { src: '/assets/front desk inbox.svg', width: 383, radius: 16, fullscreen: true, customModal: true },
};

const springTransition = {
  layout: { type: 'spring', stiffness: 500, damping: 40, mass: 0.5 },
};

const NOIR_SHADOW = {
  offsetX: -10,
  offsetY: -1,
  blur: 20,
  opacity: 0.61,
  shape: 'radial',
  angle: 45,
  spread: 0,
  pixelScale: 1,
  dither: '4x4',
  quantLevels: 3,
  dotFalloff: 'uniform',
  contrast: 130,
  brightness: 0,
  preset: 'noir',
};

const THERMAL_SHADOW = {
  offsetX: -25,
  offsetY: -25,
  blur: 30,
  opacity: 0.7,
  shape: 'radial',
  angle: 45,
  spread: 120,
  pixelScale: 2,
  dither: '4x4',
  quantLevels: 4,
  dotFalloff: 'uniform',
  brightness: -22,
  preset: 'thermal',
};

const GALAXY_SHADOW = { ...THERMAL_SHADOW, preset: 'galaxy' };
const OCEAN_SHADOW = { ...THERMAL_SHADOW, preset: 'ocean', offsetX: -17 };
const SYNTHWAVE_SHADOW = { ...THERMAL_SHADOW, preset: 'synthwave' };
const FOREST_SHADOW = { ...THERMAL_SHADOW, preset: 'forest' };
const NOIR_HOVER_SHADOW = { ...THERMAL_SHADOW, preset: 'noir' };

// "ultraviolet" / "retro" aren't built-in funky-shadow presets, so we pass
// custom color stops via the `colors` prop (which overrides `preset`).
const ULTRAVIOLET_SHADOW = {
  ...THERMAL_SHADOW,
  colors: [
    [25, 0, 50],
    [60, 0, 130],
    [130, 0, 220],
    [200, 80, 255],
    [255, 180, 255],
    [255, 255, 255],
  ],
};
const RETRO_SHADOW = {
  ...THERMAL_SHADOW,
  colors: [
    [40, 20, 30],
    [120, 30, 60],
    [220, 60, 50],
    [255, 140, 40],
    [255, 200, 80],
    [255, 240, 200],
  ],
};

export default function App() {
  const sceneRef = useRef(null);
  const [activeCard, setActiveCard] = useState(null);
  const [originRect, setOriginRect] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const shouldReduceMotion = useReducedMotion();
  useSpreadLayout(sceneRef);

  // Hover handlers — toggle a body class instead of React state to avoid re-rendering
  // the heavy shader components (FunkyShadow, Dithering) on every hover.
  const handleCardHover = useCallback(() => {
    document.body.classList.add('any-card-hovered');
  }, []);
  const handleCardLeave = useCallback(() => {
    document.body.classList.remove('any-card-hovered');
  }, []);

  // Capture the source card's bounding rect on click so the modal can morph
  // out of (and back into) the card's position.
  const handleCardClick = useCallback((cardKey) => (event) => {
    const wrapper = event.currentTarget.closest('.positioned');
    if (wrapper) {
      const r = wrapper.getBoundingClientRect();
      setOriginRect({ x: r.x, y: r.y, width: r.width, height: r.height });
    }
    setActiveCard(cardKey);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setActiveCard(null); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Delay scene entrance — paper lands at ~700ms, then pause, then cards slide in
  useEffect(() => {
    const timer = setTimeout(() => setSceneReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup hover class on unmount
  useEffect(() => {
    return () => document.body.classList.remove('any-card-hovered');
  }, []);

  // Touch-device detection via pointer capability (not viewport width).
  // Desktop always hovers; only touch devices tap-to-open.
  const [isTouchDevice, setIsTouchDevice] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const handler = (e) => setIsTouchDevice(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Compact viewport (<840px) — hide siblings when one button is expanded
  const [isCompactScreen, setIsCompactScreen] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 839px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 839px)');
    const handler = (e) => setIsCompactScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Small viewport (<480px) — column layout, all siblings hard-removed on hover
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 479px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 479px)');
    const handler = (e) => setIsSmallScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Hover card dimensions. Fixed on wide viewports, fluid below 480.
  const [cardSize, setCardSize] = useState(() => {
    if (typeof window === 'undefined') return { width: 416, height: 216 };
    if (window.matchMedia('(max-width: 479px)').matches) {
      const outerW = window.innerWidth - 32;
      const innerW = Math.max(0, outerW - 24);
      const innerH = Math.round(innerW * 216 / 416);
      return { width: innerW, height: innerH };
    }
    return { width: 416, height: 216 };
  });
  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(max-width: 479px)').matches) {
        const outerW = window.innerWidth - 32;
        const innerW = Math.max(0, outerW - 24);
        const innerH = Math.round(innerW * 216 / 416);
        setCardSize({ width: innerW, height: innerH });
      } else {
        setCardSize({ width: 416, height: 216 });
      }
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // On touch devices, tap outside nav to collapse expanded button
  useEffect(() => {
    if (!isTouchDevice) return;
    const handleOutsideClick = (e) => {
      if (hoveredBtn && !e.target.closest('.bottom-nav')) {
        setHoveredBtn(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [isTouchDevice, hoveredBtn]);


  return (
    <>
      {/* ====== SHADER BACKGROUND ====== */}
      <Shader style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}>
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
            intensity={1.6}
            speed={1}
            warp={0.52} />
          <WaveDistortion
            angle={6}
            edges="mirror"
            frequency={1.8}
            speed={3.9}
            strength={0.15}
            transform={{ rotation: 0 }}
            visible={true} />
        </Dither>
        <GridDistortion
          decay={5.3}
          gridSize={105}
          intensity={5}
          radius={1.5} />
      </Shader>

      {/* ====== BOTTOM NAV BUTTONS ====== */}
      {/* On compact row layouts (480-839), pin the hovered button's right edge to
          the nav's right edge so its expanded card gets 16px padding from the viewport.
          Disabled at <480 where the nav is a left-anchored vertical column. */}
      <div
        className={`bottom-nav${hoveredBtn ? ' has-active-card' : ''}`}
        onMouseLeave={isTouchDevice ? undefined : () => setHoveredBtn(null)}
      >
        {[
          { key: 'inbox', label: 'Front desk inbox', modal: 'inbox', src: '/assets/Inbox.svg' },
          { key: 'agent', label: 'Agent playground', modal: 'medication', src: '/assets/agent playground.svg' },
          { key: 'onboarding', label: 'Onboarding', modal: 'onboarding', src: '/assets/Onboarding.svg' },
          { key: 'routing', label: 'Routing', modal: 'scheduling', src: '/assets/routing.svg' },
        ].map(({ key, label, modal, src }, currentIdx, arr) => {
          const isActive = hoveredBtn === key;
          const hoveredIdx = hoveredBtn ? arr.findIndex((b) => b.key === hoveredBtn) : -1;
          // At <480 (column layout) all non-active siblings are hard-removed so the
          // hovered card centers horizontally. At 480-839 (row layout) siblings to
          // the *right* of the hovered one are removed (so flex-end anchors the
          // hovered card to the nav right edge), while siblings to the *left* stay
          // in layout via visibility: hidden — that keeps the hovered button's
          // flex position stable under the cursor, preventing hover-blink.
          const isRemoved = false;
          const isHidden = isCompactScreen && hoveredBtn && !isActive;
          return (
            <BottomNavButton
              key={key}
              label={label}
              src={src}
              isActive={isActive}
              isHidden={isHidden}
              isRemoved={isRemoved}
              isCompact={isCompactScreen}
              activeWidth={cardSize.width}
              activeHeight={cardSize.height}
              onMouseEnter={isTouchDevice ? undefined : () => setHoveredBtn(key)}
              onMouseLeave={undefined}
              onClick={(e) => {
                if (isTouchDevice && !isActive) {
                  setHoveredBtn(key);
                  return;
                }
                const r = e.currentTarget.getBoundingClientRect();
                setOriginRect({ x: r.x, y: r.y, width: r.width, height: r.height });
                setActiveCard(modal);
              }}
            />
          );
        })}
      </div>

      {/* ====== CENTER TEXT ====== */}
      <div className="center-text-wrap">
        <div className="center-text" style={{ padding: '16px', borderRadius: 12, overflow: 'hidden' }}>
          {/* Text content — mix-blend-mode makes text look printed on paper */}
          <div style={{ position: 'relative', zIndex: 1, mixBlendMode: 'multiply' }}>
            {/* About */}
            <p style={{ color: '#D75606', marginBottom: 0 }}>About</p>
            <p>Hi, I'm Yishan. I used to be an architect, and I still judge things the same way I judged buildings: does it stand up, does it make sense to be in, does it work for real people?</p>
            <p style={{ marginTop: 10 }}>That's probably why I can't pick one role — research, design, code, leading teams. A great product is beyond design, and I care deeply about every aspect of it.</p>
            <p style={{ marginTop: 10 }}>Right now I'm spending a lot of time with AI tools. Not in a "future of work" way — more: how to move faster, try weirder ideas, and maybe finally take a crack at problems I'd always shelved as too hard.</p>

            {/* Recent Work */}
            <p style={{ color: '#D75606', marginTop: 24, marginBottom: 0 }}>Recent work</p>
            <p>AI front desk assistant at Freed.ai;<br />Automatic tax filing at Shopify;<br />Analytics platform at DevRev.</p>

            {/* Connect */}
            <p style={{ color: '#D75606', marginTop: 24, marginBottom: 0 }}>Connect</p>
            <p><a href="mailto:yishan.zhang007@gmail.com" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>Say hi</a>, or find me <a href="https://www.linkedin.com/in/yishanzhang/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>here</a>.</p>
          </div>
        </div>
      </div>

      {/* ====== HOVER SPOTLIGHT OVERLAY ====== */}
      {/* Always mounted; visibility controlled by `body.any-card-hovered` CSS class */}
      <div className="hover-spotlight-overlay" />

      {/* ====== CARD MODAL ====== */}
      <AnimatePresence onExitComplete={() => setOriginRect(null)}>
        {activeCard && CARD_CONFIGS[activeCard] && (
          <motion.div
            className="card-modal-backdrop"
            onClick={() => setActiveCard(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {CARD_CONFIGS[activeCard].customModal ? (() => {
              // Compute the rect-based morph frame from the captured source card.
              const VW = window.innerWidth;
              const VH = window.innerHeight;
              const MW = VW - 32;
              const MH = VH - 32;
              const initialFrame = originRect ? (() => {
                const cx = originRect.x + originRect.width / 2;
                const cy = originRect.y + originRect.height / 2;
                const mx = 16 + MW / 2;
                const my = 16 + MH / 2;
                return {
                  scaleX: originRect.width / MW,
                  scaleY: originRect.height / MH,
                  x: cx - mx,
                  y: cy - my,
                };
              })() : null;

              const morphTransition = { duration: 0.42, ease: [0.23, 1, 0.32, 1] };
              const exitTransition = { duration: 0.6, ease: [0.23, 1, 0.32, 1] };

              return (
                <motion.div
                  className="card-modal-content"
                  style={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    width: 'calc(100vw - 32px)',
                    height: 'calc(100vh - 32px)',
                    borderRadius: CARD_CONFIGS[activeCard].radius,
                    overflow: 'hidden',
                    transformOrigin: 'center center',
                    willChange: 'transform, opacity',
                  }}
                  initial={
                    shouldReduceMotion || !initialFrame
                      ? { opacity: 0 }
                      : { ...initialFrame, opacity: 1 }
                  }
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { scaleX: 1, scaleY: 1, x: 0, y: 0, opacity: 1 }
                  }
                  exit={
                    shouldReduceMotion || !initialFrame
                      ? { opacity: 0, transition: { duration: 0.18 } }
                      : { ...initialFrame, opacity: 1, transition: exitTransition }
                  }
                  transition={morphTransition}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Dithering
                    speed={{ testcall: 1.78, onboarding: 1, scheduling: 1.56, true: 1.13 }[CARD_CONFIGS[activeCard].customModal] || 1.13}
                    shape={{ testcall: 'ripple', onboarding: 'dots', scheduling: 'swirl', true: 'warp' }[CARD_CONFIGS[activeCard].customModal] || 'warp'}
                    type={{ testcall: '2x2', onboarding: 'random', scheduling: '8x8', true: '4x4' }[CARD_CONFIGS[activeCard].customModal] || '4x4'}
                    size={{ testcall: 2.5, onboarding: 7.3, scheduling: 2, true: 2.4 }[CARD_CONFIGS[activeCard].customModal] || 2.4}
                    scale={{ testcall: 0.62, onboarding: 1.4, scheduling: 1, true: 0.88 }[CARD_CONFIGS[activeCard].customModal] || 0.88}
                    frame={364922.340999608}
                    colorBack="#00000000"
                    colorFront={{ testcall: '#E2ECF6', onboarding: '#AFCEAA', scheduling: '#D67DA9', true: '#DDD9FC' }[CARD_CONFIGS[activeCard].customModal] || '#DDD9FC'}
                    style={{
                      backgroundColor: { testcall: '#99CDFC', onboarding: '#D8E8D6', scheduling: '#DDDDDD', true: '#F6F5FF' }[CARD_CONFIGS[activeCard].customModal] || '#F6F5FF',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  {/* Title + content + close — fade in alongside the morph */}
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 1, transition: { duration: 0.28 } }
                    }
                    exit={{ opacity: 0, transition: { duration: 0.22 } }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    {/* Close button */}
                    <button
                      onClick={() => setActiveCard(null)}
                      style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 11,
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'none', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                    {/* Title — fixed top-left, aligned with close button */}
                    <div className="modal-title" style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      zIndex: 10,
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontFamily: "'Tobias', serif",
                      fontWeight: 300,
                      fontSize: 14,
                      letterSpacing: '-0.01em',
                      textTransform: 'none',
                      color: 'var(--fg-primary)',
                      pointerEvents: 'none',
                    }}>
                      {{ testcall: 'Agent playground', onboarding: 'Onboarding', scheduling: 'Routing', true: 'Front desk inbox' }[CARD_CONFIGS[activeCard].customModal] || 'Front desk inbox'}
                    </div>
                    {/* SVG overlay */}
                    <div className="fullscreen-modal-svg-overlay" style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'safe center',
                      pointerEvents: 'none',
                      paddingTop: 80,
                      paddingBottom: 80,
                      paddingLeft: 'clamp(16px, 3vw, 40px)',
                      paddingRight: 'clamp(16px, 3vw, 40px)',
                      overflow: 'hidden',
                    }}>
                    {CARD_CONFIGS[activeCard].customModal === 'onboarding' ? (
                      <div style={{
                        display: 'flex',
                        gap: 80,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        maxWidth: 'min(1325px, 100%)',
                        maxHeight: '100%',
                      }}>
                        <img src="/assets/full onboarding 1.svg" alt="" style={{ width: 504, maxWidth: '100%', height: 'auto', opacity: 0.85, borderRadius: 12, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'transparent' }} />
                        <img src="/assets/full onboarding 2.svg" alt="" style={{ width: 488, maxWidth: '100%', height: 'auto', opacity: 0.85, borderRadius: 12, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'transparent' }} />
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        borderRadius: 12,
                        maxWidth: 'min(1325px, 100%)',
                        display: 'flex',
                        overflow: 'hidden',
                      }}>
                        <img
                          src={{ testcall: '/assets/test call full.svg', scheduling: '/assets/full settings.svg', true: '/assets/full inbox.svg' }[CARD_CONFIGS[activeCard].customModal] || '/assets/full inbox.svg'}
                          alt=""
                          style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            opacity: 0.85,
                            borderRadius: 12,
                          }}
                        />
                      </div>
                    )}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })() : (
              <motion.div
                layoutId={activeCard}
                className="card-modal-content"
                transition={springTransition}
                style={{ position: 'relative', willChange: 'transform' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setActiveCard(null)}
                  style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 10,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1,
                  }}
                >
                  ✕
                </button>
                {CARD_CONFIGS[activeCard].fullscreen ? (
                  <img
                    src={CARD_CONFIGS[activeCard].src}
                    alt=""
                    style={{
                      width: 'calc(100vw - 64px)',
                      height: 'calc(100vh - 64px)',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: CARD_CONFIGS[activeCard].radius,
                    }}
                  />
                ) : (
                  <img
                    src={CARD_CONFIGS[activeCard].src}
                    alt=""
                    style={{
                      width: '80vw',
                      maxWidth: 800,
                      height: 'auto',
                      display: 'block',
                      borderRadius: CARD_CONFIGS[activeCard].radius,
                    }}
                  />
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
