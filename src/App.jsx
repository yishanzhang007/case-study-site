import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HalftoneDots, Dithering } from '@paper-design/shaders-react';
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

const CARD_CONFIGS = {
  onboarding: { src: '/assets/Onboarding.svg', width: 432, radius: 16, fullscreen: true, customModal: 'onboarding' },
  kb: { src: '/assets/kb.svg', width: 446, radius: 12 },
  scheduling: { src: '/assets/scheduling.svg', width: 411, radius: 12, fullscreen: true, customModal: 'scheduling' },
  chat: { src: '/assets/Onboarding.svg', width: 584, radius: 12 },
  medication: { src: '/assets/test call.svg', width: 398, radius: 12, fullscreen: true, customModal: 'testcall' },
  notes: { src: '/assets/Notes.svg', width: 382, radius: 14, fullscreen: true, customModal: true },
  testcall: { src: '/assets/test call.svg', width: 398, radius: 12 },
};

const springTransition = {
  layout: { type: 'spring', stiffness: 500, damping: 40, mass: 0.5 },
};

const NOIR_SHADOW = {
  offsetX: -10,
  offsetY: -1,
  blur: 41,
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
  const [sceneReady, setSceneReady] = useState(false);
  useSpreadLayout(sceneRef);

  // Hover handlers — toggle a body class instead of React state to avoid re-rendering
  // the heavy shader components (FunkyShadow, Dithering) on every hover.
  const handleCardHover = useCallback(() => {
    document.body.classList.add('any-card-hovered');
  }, []);
  const handleCardLeave = useCallback(() => {
    document.body.classList.remove('any-card-hovered');
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setActiveCard(null); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Delay scene entrance
  useEffect(() => {
    const timer = setTimeout(() => setSceneReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup hover class on unmount
  useEffect(() => {
    return () => document.body.classList.remove('any-card-hovered');
  }, []);


  return (
    <>
      <DotBackground />

      {/* ====== BACKGROUND SHADOW BLOBS ====== */}
      <div className="bg-shadow" style={{ left: '-5%', top: '10%', width: 600, height: 500, background: 'rgba(180, 170, 155, 0.08)', filter: 'blur(60px)' }} />
      <div className="bg-shadow" style={{ left: '30%', top: '35%', width: 500, height: 500, background: 'rgba(160, 155, 145, 0.06)', filter: 'blur(50px)' }} />
      <div className="bg-shadow" style={{ right: '5%', bottom: '10%', width: 700, height: 600, background: 'rgba(150, 160, 170, 0.07)', filter: 'blur(70px)' }} />
      <div className="bg-shadow" style={{ right: '10%', top: '5%', width: 400, height: 400, background: 'rgba(200, 180, 150, 0.05)', filter: 'blur(50px)' }} />

      <div className="scene" ref={sceneRef}>


        {/* ====== KNOWLEDGE BASE CARD (top-center) ====== */}
        <div className="positioned anim-card d2" style={{ left: 348, top: -343, width: 719.355, height: 523.92, display: 'none' }}>
          <div style={{ transform: 'rotate(-6deg)', '--base-transform': 'rotate(-6deg)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: -35, top: 15, width: 446, height: '100%', backgroundColor: '#FAC457', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cline x1='5' y1='1' x2='5' y2='9' stroke='white' stroke-width='0.5'/%3E%3Cline x1='1' y1='5' x2='9' y2='5' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")", backgroundSize: '20px 20px', borderRadius: 12, transform: 'rotate(-3deg)', zIndex: -1 }} />
            <motion.div layoutId="kb" whileHover={{ y: -10, rotate: -0.5 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} onClick={() => setActiveCard('kb')} style={{ cursor: 'pointer', position: 'relative' }}>
              <img src="/assets/kb.svg" alt="Knowledge base" className="hoverable" style={{ width: 446, height: 'auto', display: 'block', borderRadius: 12, border: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'subpixel-antialiased' }} />
            </motion.div>
          </div>
        </div>

        {/* ====== MASKING TAPE ====== */}
        <div className="deco-img anim-deco d5" style={{ left: 748, top: -272, width: 221, height: 221, zIndex: 10, display: 'none' }}>
          <img src="/assets/masking-tape.png" alt="" className="deco-shadow" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* ====== INBOX LIST CARD ====== */}
        <div className="positioned anim-card d4" style={{ left: 898.9, top: -98.79, width: 316.176, height: 242.864, zIndex: 0, display: 'none' }}>
          <div style={{ transform: 'rotate(4deg)', '--base-transform': 'rotate(4deg)' }}>
            <img src="/assets/inbox list.svg" alt="Inbox list" className="hoverable" style={{ width: 311, height: 'auto', display: 'block', borderRadius: 12, border: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'subpixel-antialiased' }} />
          </div>
        </div>


        {/* ====== BINDER CLIP ====== */}
        <div className="deco-img anim-deco d9" style={{ position: 'fixed', left: '5%', top: '12%', width: 98, height: 100, zIndex: 10, display: 'none' }}>
          <div className="deco-shadow" style={{ width: '100%', height: '100%' }}>
            <img src="/assets/binder clip.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'rotate(125deg)' }} />
          </div>
        </div>

        {/* ====== PAPER CLIP ====== */}
        <div className="deco-img anim-deco d9" style={{ position: 'fixed', left: '10%', top: '5%', width: 150, height: 208, zIndex: 10, display: 'none' }}>
          <div className="deco-shadow" style={{ width: '100%', height: '100%' }}>
            <img src="/assets/paper-clip.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'rotate(-16deg)' }} />
          </div>
        </div>


        {/* ====== PUSH PINS ====== */}
        <div className={`deco-img scene-element slide-left${sceneReady ? '' : ' hidden'}`} style={{ position: 'fixed', left: 40, bottom: 180, width: 160, height: 160, zIndex: 30 }}>
          <img src="/assets/push-pins.png" alt="" className="deco-shadow" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {/* ====== DUCT TAPE ====== */}
        <div className="deco-img anim-deco d14" style={{ left: 800, top: -30, width: 120, height: 120, transform: 'rotate(10deg)', opacity: 0.7, zIndex: 10, display: 'none' }}>
          <img src="/assets/duct-tape.png" alt="" className="deco-shadow" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {/* ====== SCHEDULING CARD (bottom-left) ====== */}
        <div className={`positioned scene-element slide-up${sceneReady ? '' : ' hidden'}`} data-orig-left="-56" style={{ left: -56, bottom: -370, width: 514.714, height: 497.78, visibility: activeCard === 'scheduling' ? 'hidden' : 'visible' }}>
          <div className="card-shadow-host" style={{ transform: 'rotate(6.71deg)', '--base-transform': 'rotate(6.71deg)', position: 'relative', width: 411, height: 424 }}>
            <div style={{ position: 'absolute', top: -5, left: -100, zIndex: -2, transform: 'rotate(-12deg)' }}>
              <img src="/assets/paper.svg" alt="" style={{ width: 524, height: 'auto', display: 'block' }} />
            </div>
            <div style={{ position: 'absolute', top: -10, left: -55, zIndex: -1, transform: 'rotate(-8deg)' }}>
              <img src="/assets/paper.svg" alt="" style={{ width: 524, height: 'auto', display: 'block' }} />
            </div>
            <div className="shadow-noir" style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
              <FunkyShadow width={411} height={424} radius={12} {...NOIR_SHADOW}>
                <div style={{ width: 411, height: 424 }} />
              </FunkyShadow>
            </div>
            <div className="shadow-thermal" style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
              <FunkyShadow width={411} height={424} radius={12} {...SYNTHWAVE_SHADOW}>
                <div style={{ width: 411, height: 424 }} />
              </FunkyShadow>
            </div>
            <motion.div layoutId="scheduling" whileHover={{ y: -24, rotate: -0.5 }} onHoverStart={handleCardHover} onHoverEnd={handleCardLeave} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} onClick={() => setActiveCard('scheduling')} style={{ cursor: 'pointer', position: 'relative' }}>
              <img src="/assets/scheduling.svg" alt="Scheduling settings" style={{ width: 411, height: 'auto', display: 'block', borderRadius: 12, border: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'subpixel-antialiased' }} />
            </motion.div>
          </div>
        </div>

        {/* ====== CHAT / RESCHEDULE CARD (bottom-center) ====== */}
        <div className={`positioned scene-element slide-up${sceneReady ? '' : ' hidden'}`} data-orig-left="339" style={{ left: 339, bottom: -340, width: 661.893, height: 339.538, visibility: activeCard === 'onboarding' ? 'hidden' : 'visible' }}>
          <div className="card-shadow-host" style={{ transform: 'rotate(-2.41deg)', '--base-transform': 'rotate(-2.41deg)', position: 'relative', width: 432, height: 450 }}>
            {/* Dithering shader background */}
            <div style={{ position: 'absolute', top: -36, left: -16, right: '15%', bottom: -16, transform: 'rotate(-6deg)', zIndex: -1, overflow: 'hidden' }}>
              <Dithering
                speed={1.13}
                shape="warp"
                type="4x4"
                size={2.4}
                scale={0.88}
                frame={364922.340999608}
                colorBack="#00000000"
                colorFront="#AFAFAF"
                style={{ backgroundColor: '#F7F5F1', width: '100%', height: '100%', outline: '1px solid #B0D4F5' }}
              />
            </div>
            <div className="shadow-thermal" style={{ position: 'absolute', inset: 0, zIndex: -1, transform: 'rotate(-2deg)' }}>
              <FunkyShadow width={432} height={450} radius={16} {...FOREST_SHADOW}>
                <div style={{ width: 432, height: 450 }} />
              </FunkyShadow>
            </div>
            <motion.div layoutId="onboarding" whileHover={{ y: -24, rotate: -0.5 }} onHoverStart={handleCardHover} onHoverEnd={handleCardLeave} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} onClick={() => setActiveCard('onboarding')} style={{ cursor: 'pointer', position: 'relative' }}>
              <img src="/assets/Onboarding.svg" alt="Onboarding" style={{ width: 432, height: 'auto', display: 'block', border: 'none', borderRadius: 12, backfaceVisibility: 'hidden', WebkitFontSmoothing: 'subpixel-antialiased', transform: 'rotate(-2deg)' }} />
            </motion.div>
          </div>
        </div>

        {/* ====== MEDICATION CARD (bottom-right) ====== */}
        <div className={`positioned scene-element slide-up${sceneReady ? '' : ' hidden'}`} data-orig-left="755" style={{ left: 755, bottom: -225, width: 420, height: 300, visibility: activeCard === 'medication' ? 'hidden' : 'visible' }}>
          <div className="card-shadow-host" style={{ transform: 'rotate(10.24deg)', '--base-transform': 'rotate(10.24deg)', position: 'relative', width: 398, height: 272 }}>
            <div className="shadow-noir" style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
              <FunkyShadow width={398} height={272} radius={12} {...NOIR_SHADOW}>
                <div style={{ width: 398, height: 272 }} />
              </FunkyShadow>
            </div>
            <div className="shadow-thermal" style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
              <FunkyShadow width={398} height={272} radius={12} {...OCEAN_SHADOW}>
                <div style={{ width: 398, height: 272 }} />
              </FunkyShadow>
            </div>
            <motion.div layoutId="medication" whileHover={{ y: -24, rotate: -0.5 }} onHoverStart={handleCardHover} onHoverEnd={handleCardLeave} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} onClick={() => setActiveCard('medication')} style={{ cursor: 'pointer' }}>
              <img src="/assets/test call.svg" alt="Test call topics" style={{ width: 398, height: 'auto', display: 'block', borderRadius: 12, border: 'none', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'subpixel-antialiased' }} />
            </motion.div>
          </div>
        </div>

        {/* ====== NOTES CARD (bottom-right) ====== */}
        <div className={`positioned scene-element slide-up${sceneReady ? '' : ' hidden'}`} data-orig-left="1050" style={{ left: 1050, bottom: -486, width: 420 }}>
          <div className="notes-slide card-shadow-host" style={{ transform: 'rotate(-9deg)', '--base-transform': 'rotate(-9deg)', position: 'relative' }}>
            <div className="shadow-noir" style={{ visibility: activeCard === 'notes' ? 'hidden' : 'visible', position: 'absolute', inset: 0, zIndex: -1 }}>
              <FunkyShadow width={382} height={561} radius={14} {...NOIR_SHADOW}>
                <div style={{ width: 382, height: 561 }} />
              </FunkyShadow>
            </div>
            <div className="shadow-thermal" style={{ visibility: activeCard === 'notes' ? 'hidden' : 'visible', position: 'absolute', inset: 0, zIndex: -1 }}>
              <FunkyShadow width={382} height={561} radius={14} {...NOIR_HOVER_SHADOW}>
                <div style={{ width: 382, height: 561 }} />
              </FunkyShadow>
            </div>
            <motion.div whileHover={{ y: -24, rotate: -0.5 }} onHoverStart={handleCardHover} onHoverEnd={handleCardLeave} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} onClick={() => setActiveCard('notes')} style={{ cursor: 'pointer' }}>
              <img src="/assets/Notes.svg" alt="Notes panel" style={{ width: 382, height: 'auto', display: 'block', borderRadius: 14, border: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'subpixel-antialiased' }} />
            </motion.div>
          </div>
        </div>

        {/* ====== GREEN MARKER (on top of UI) ====== */}
        <div className={`deco-img scene-element slide-right deco-right${sceneReady ? '' : ' hidden'}`} style={{ position: 'fixed', right: -350, top: 40, width: 756, height: 294, zIndex: 20, transform: 'rotate(10deg)' }}>
          <img src="/assets/green-marker.png" alt="" className="deco-shadow" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {/* ====== PENCIL (on top of UI) ====== */}
        <div className={`deco-img scene-element slide-right deco-right${sceneReady ? '' : ' hidden'}`} style={{ position: 'fixed', right: -250, top: 200, width: 346, height: 346, zIndex: 20 }}>
          <img src="/assets/pencil.png" alt="" className="deco-shadow" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {/* ====== ERASER (on top of UI) ====== */}
        <div className={`deco-shadow deco-right scene-element slide-right${sceneReady ? '' : ' hidden'}`} style={{ position: 'fixed', right: -60, top: 200, width: 100, height: 100, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: 'scaleY(-1) rotate(-183.45deg)' }}>
            <div style={{ width: 311.123, height: 311.123 }}>
              <img src="/assets/eraser.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>


      </div>

      {/* ====== CENTER TEXT ====== */}
      <div className="center-text-wrap">
        <div className="center-text-shadow" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 290, top: -40, width: 91, height: 91, zIndex: 20, pointerEvents: 'none', filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.08))' }}>
          <img src="/assets/tape.svg" alt="" style={{ width: '100%', height: '100%', transform: 'rotate(-11deg)' }} />
        </div>
        <div className="center-text" style={{ position: 'relative', padding: '16px', borderRadius: 12, overflow: 'hidden' }}>
          {/* Text content — mix-blend-mode makes text look printed on paper */}
          <div style={{ position: 'relative', zIndex: 1, mixBlendMode: 'multiply' }}>
            {/* About */}
            <p style={{ opacity: 0.5, marginBottom: 8 }}>about</p>
            <p>hi, i'm yishan. before this, i was an architect, and that perspective still shapes how i think about building products.</p>
            <p style={{ marginTop: 16 }}>to me, a great product goes far beyond great design. i care deeply about all aspects of it and practice it daily - research to understand, create roadmap to drive real impact, design to create clarity, code to elevate, and lead design teams to bring it all to life at scale.</p>

            {/* Recent Work */}
            <p style={{ opacity: 0.5, marginTop: 40, marginBottom: 8 }}>recent work</p>
            <p>ai front desk assistant at Freed.ai;<br />automatic tax filing at Shopify;<br />analytics platform at DevRev.</p>

            {/* Connect */}
            <p style={{ opacity: 0.5, marginTop: 40, marginBottom: 8 }}>connect</p>
            <p><a href="mailto:yishan.zhang007@gmail.com" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>say hi</a>, or find me <a href="https://www.linkedin.com/in/yishanzhang/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>here</a>.</p>
          </div>
        </div>
        </div>
      </div>

      {/* ====== HOVER SPOTLIGHT OVERLAY ====== */}
      {/* Always mounted; visibility controlled by `body.any-card-hovered` CSS class */}
      <div className="hover-spotlight-overlay" />

      {/* ====== CARD MODAL ====== */}
      <AnimatePresence>
        {activeCard && CARD_CONFIGS[activeCard] && (
          <motion.div
            className="card-modal-backdrop"
            onClick={() => setActiveCard(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              layoutId={CARD_CONFIGS[activeCard].customModal ? undefined : activeCard}
              className="card-modal-content"
              transition={springTransition}
              initial={CARD_CONFIGS[activeCard].customModal ? { opacity: 0, scale: 0.95 } : false}
              animate={CARD_CONFIGS[activeCard].customModal ? { opacity: 1, scale: 1 } : undefined}
              exit={CARD_CONFIGS[activeCard].customModal ? { opacity: 0, scale: 0.95 } : undefined}
              style={{ position: 'relative', willChange: 'transform' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
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

              {CARD_CONFIGS[activeCard].customModal ? (
                /* Fullscreen dithering shader + SVG overlay */
                <div style={{
                  width: 'calc(100vw - 32px)',
                  height: 'calc(100vh - 32px)',
                  borderRadius: CARD_CONFIGS[activeCard].radius,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
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
                  {/* Title — fixed top-left, aligned with close button */}
                  <div className="modal-title" style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    zIndex: 10,
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    padding: '4px 6px',
                    borderRadius: 8,
                    fontFamily: "'iA Writer Mono', monospace",
                    fontSize: 14,
                    letterSpacing: '-0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-primary)',
                    opacity: 0.6,
                    pointerEvents: 'none',
                  }}>
                    {{ testcall: 'Voice agent playground', onboarding: 'Onboarding', scheduling: 'Call routing configuration', true: 'Front desk inbox' }[CARD_CONFIGS[activeCard].customModal] || 'Front desk inbox'}
                  </div>
                  {/* SVG overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                      <img src="/assets/full onboarding 1.svg" alt="" style={{ width: 504, maxWidth: '100%', height: 'auto', opacity: 0.85, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'transparent' }} />
                      <img src="/assets/full onboarding 2.svg" alt="" style={{ width: 488, maxWidth: '100%', height: 'auto', opacity: 0.85, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'transparent' }} />
                    </div>
                  ) : (
                    <div style={{
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderRadius: 0,
                      maxWidth: 'min(1325px, 100%)',
                      maxHeight: '100%',
                      display: 'flex',
                    }}>
                      <img
                        src={{ testcall: '/assets/test call full.svg', scheduling: '/assets/full settings.svg', true: '/assets/full inbox.svg' }[CARD_CONFIGS[activeCard].customModal] || '/assets/full inbox.svg'}
                        alt=""
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          display: 'block',
                          opacity: 0.85,
                          borderRadius: 0,
                        }}
                      />
                    </div>
                  )}
                  </div>
                </div>
              ) : CARD_CONFIGS[activeCard].fullscreen ? (
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
