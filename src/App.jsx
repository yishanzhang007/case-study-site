import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Shader, Dither, GridDistortion, Plasma } from 'shaders/react';

const Modal = lazy(() => import('./Modal'));

const EASE = [0.23, 1, 0.32, 1];
const DURATION = 0.25;
const CARD_SCALE = 0.75;

const CARD_CONFIGS = {
  onboarding: { radius: 16, customModal: 'onboarding' },
  scheduling: { radius: 12, customModal: 'scheduling' },
  medication: { radius: 12, customModal: 'testcall' },
  notes:      { radius: 14, customModal: true },
  inbox:      { radius: 16, customModal: true },
};

const NAV_BUTTONS = [
  { key: 'inbox',      label: 'Front desk inbox', modal: 'inbox',      src: '/assets/Inbox.svg',            cardW: 438, cardH: 228 },
  { key: 'agent',      label: 'Agent playground', modal: 'medication', src: '/assets/agent playground.svg', cardW: 438, cardH: 226 },
  { key: 'onboarding', label: 'Onboarding',       modal: 'onboarding', src: '/assets/Onboarding.svg',       cardW: 436, cardH: 231 },
  { key: 'routing',    label: 'Routing',          modal: 'scheduling', src: '/assets/routing.svg',          cardW: 438, cardH: 220 },
];

function BottomNavButton({ label, src, isActive, isHidden, breakpoint, cardWidth, cardHeight, onMouseEnter, onClick }) {
  const ref = useRef(null);
  const [collapsed, setCollapsed] = useState(null);
  const t = { duration: DURATION, ease: EASE };

  // Measure collapsed size after fonts load (Tobias is wider than fallback)
  useLayoutEffect(() => {
    if (!ref.current || isActive || collapsed) return;
    const measure = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      setCollapsed({ w: r.width, h: r.height });
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure);
    } else {
      measure();
    }
  }, [isActive, collapsed]);

  const hideStyle = isHidden
    ? (breakpoint === 'small'
      ? { display: 'none' }
      : { visibility: 'hidden', pointerEvents: 'none' })
    : {};

  return (
    <motion.div
      ref={ref}
      initial={false}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      animate={{
        width: isActive ? cardWidth : (collapsed?.w || 'auto'),
        height: isActive ? cardHeight : (collapsed?.h || 'auto'),
        padding: isActive ? '0px' : '8px 12px',
        backgroundColor: isActive ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,1)',
      }}
      transition={t}
      style={{
        position: 'relative',
        borderRadius: 8,
        cursor: 'pointer',
        overflow: isActive ? 'hidden' : 'visible',
        flexShrink: 0,
        ...hideStyle,
      }}
    >
      <motion.span
        initial={false}
        animate={{ opacity: isActive ? 0 : 1 }}
        transition={{ duration: isActive ? 0.05 : 0 }}
        style={{
          display: 'block',
          fontFamily: "'Tobias', serif",
          fontWeight: 300,
          fontSize: 15,
          lineHeight: '22px',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </motion.span>
      <motion.img
        src={src}
        alt={label}
        decoding="async"
        fetchPriority="high"
        initial={false}
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: isActive ? 0.2 : 0.1 }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          willChange: 'opacity',
        }}
      />
    </motion.div>
  );
}

export default function App() {
  const [activeCard, setActiveCard] = useState(null);
  const [originRect, setOriginRect] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'wide';
    if (window.innerWidth < 480) return 'small';
    if (window.innerWidth < 800) return 'medium';
    return 'wide';
  });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBreakpoint(w < 480 ? 'small' : w < 800 ? 'medium' : 'wide');
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setActiveCard(null);
        setHoveredBtn(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      {/* ====== SHADER BACKGROUND ====== */}
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

      {/* ====== CENTER TEXT ====== */}
      <div className="center-text-wrap">
        <motion.div
          className="center-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28, delay: 0.42, ease: EASE }}
          style={{ padding: '16px', borderRadius: 12 }}
        >
          <div style={{ position: 'relative', zIndex: 1, maxHeight: '100%', overflowY: 'auto' }}>
            <p style={{ color: '#D75606', marginBottom: 0 }}>About</p>
            <p>Hi, I'm Yishan. I used to be an architect, and I still judge things the same way I judged buildings: does it stand up, does it make sense to be in, does it work for real people?</p>
            <p style={{ marginTop: 10 }}>That's probably why I can't pick one role — research, design, code, leading teams. A great product is beyond design, and I care deeply about every aspect of it.</p>
            <p style={{ marginTop: 10 }}>Right now I'm spending a lot of time with AI tools. Not in a "future of work" way — more: how to move faster, try weirder ideas, and maybe finally take a crack at problems I'd always shelved as too hard.</p>

            <p style={{ color: '#D75606', marginTop: 16, marginBottom: 0 }}>Recent work</p>
            <p>AI front desk assistant at Freed.ai;<br />Automatic tax filing at Shopify;<br />Analytics platform at DevRev.</p>

            <p style={{ color: '#D75606', marginTop: 16, marginBottom: 0 }}>Connect</p>
            <p><a href="mailto:yishan.zhang007@gmail.com" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>Say hi</a>, or find me <a href="https://www.linkedin.com/in/yishanzhang/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>here</a>.</p>
          </div>
        </motion.div>
      </div>

      {/* ====== BOTTOM NAV BUTTONS ====== */}
      <div className="bottom-nav" onMouseLeave={() => setHoveredBtn(null)}>
        {NAV_BUTTONS.map(({ key, label, modal, src, cardW, cardH }) => {
          const isSmall = breakpoint === 'small';
          const isActive = !isSmall && hoveredBtn === key;
          const isHidden = breakpoint !== 'wide' && hoveredBtn && !isActive && !isSmall;
          return (
            <BottomNavButton
              key={key}
              label={label}
              src={src}
              isActive={isActive}
              isHidden={isHidden}
              breakpoint={breakpoint}
              cardWidth={cardW * CARD_SCALE}
              cardHeight={cardH * CARD_SCALE}
              onMouseEnter={isSmall ? undefined : () => setHoveredBtn(key)}
              onClick={() => setActiveCard(modal)}
            />
          );
        })}
      </div>

      {/* ====== FULLSCREEN MODAL (lazy) ====== */}
      <Suspense fallback={null}>
        <Modal
          activeCard={activeCard}
          cardConfigs={CARD_CONFIGS}
          originRect={originRect}
          onClose={() => setActiveCard(null)}
          onExitComplete={() => setOriginRect(null)}
        />
      </Suspense>
    </>
  );
}
