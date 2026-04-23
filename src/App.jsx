import { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import DitherShader from './DitherShader';
import Modal from './Modal';

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
  { key: 'inbox',      label: 'Front desk inbox', modal: 'inbox',      src: '/assets/Inbox.svg',            cardW: 438, cardH: 208, prefetch: ['/assets/full inbox.svg'] },
  { key: 'agent',      label: 'Agent playground', modal: 'medication', src: '/assets/agent playground.svg', cardW: 438, cardH: 206, prefetch: ['/assets/test call full.svg'] },
  { key: 'onboarding', label: 'Onboarding',       modal: 'onboarding', src: '/assets/Onboarding.svg',       cardW: 436, cardH: 213, prefetch: ['/assets/full onboarding 1.svg', '/assets/full onboarding 2.svg'] },
  { key: 'routing',    label: 'Routing',          modal: 'scheduling', src: '/assets/routing.svg',          cardW: 438, cardH: 198, prefetch: ['/assets/full settings.svg'] },
];

function useSFTime() {
  const fmt = () => new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  }).format(new Date());
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const BottomNavButton = memo(function BottomNavButton({ btnKey, modal, label, src, prefetch, isActive, isHidden, breakpoint, cardWidth, cardHeight, onHover, onOpen }) {
  const ref = useRef(null);
  const prefetchedRef = useRef(false);
  const [collapsed, setCollapsed] = useState(null);
  const t = { duration: DURATION, ease: EASE };
  const isSmall = breakpoint === 'small';

  // Reset cached size when breakpoint changes so we re-measure at the new font size
  useEffect(() => { setCollapsed(null); }, [breakpoint]);

  // Measure collapsed size after fonts load
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

  const handleMouseEnter = useCallback(() => {
    if (!isSmall) onHover(btnKey);
    if (!prefetchedRef.current && prefetch) {
      prefetchedRef.current = true;
      prefetch.forEach((s) => { const img = new Image(); img.src = s; });
    }
  }, [isSmall, onHover, btnKey, prefetch]);

  const handleClick = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect();
    onOpen(modal, rect);
  }, [onOpen, modal]);

  const hideStyle = isHidden
    ? (breakpoint === 'small'
      ? { display: 'none' }
      : { visibility: 'hidden', pointerEvents: 'none' })
    : {};

  return (
    <motion.div
      ref={ref}
      initial={false}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      animate={{
        width: isActive ? cardWidth : (collapsed?.w || 'auto'),
        height: isActive ? cardHeight : (collapsed?.h || 'auto'),
        padding: isActive ? '0px' : '8px 20px',
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
        className="nav-label"
        initial={false}
        animate={{ opacity: isActive ? 0 : 1 }}
        transition={{
          duration: isActive ? 0.05 : 0.12,
          delay:    isActive ? 0    : 0.07,
        }}
      >
        {label}
      </motion.span>
      <motion.img
        src={src}
        alt={label}
        decoding="async"
        fetchPriority="low"
        loading="lazy"
        initial={false}
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: isActive ? 0.2 : 0.1 }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center bottom',
          pointerEvents: 'none',
          willChange: 'opacity',
        }}
      />
    </motion.div>
  );
});

export default function App() {
  const [activeCard, setActiveCard] = useState(null);
  const [originRect, setOriginRect] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const navRef = useRef(null);

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

  const handleHover = useCallback((key) => setHoveredBtn(key), []);
  const handleOpen = useCallback((modal, rect) => {
    if (rect) setOriginRect(rect);
    setActiveCard(modal);
  }, []);
  const handleClose = useCallback(() => {
    setActiveCard(null);
    setHoveredBtn(null);
  }, []);
  const handleNavLeave = useCallback(() => setHoveredBtn(null), []);
  const handleExitComplete = useCallback(() => setOriginRect(null), []);

  const sfTime = useSFTime();

  return (
    <>
      {/* ====== SHADER BACKGROUND ====== */}
      <DitherShader safeRectRef={navRef} paused={!!activeCard} />

      {/* ====== CORNER LABELS ====== */}
      <div className="corner-text top-left">Yishan</div>
      <div className="corner-text top-right">About</div>
      <div className="corner-text bottom-left">San Francisco</div>
      <div className="corner-text bottom-right">{sfTime}</div>

      {/* ====== CENTER TEXT (hidden for now — v3 experiment) ====== */}
      {/*
      <div className="center-text-wrap">
        <div
          className="center-text"
          style={{ padding: '12px' }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: '#D75606', marginBottom: 0 }}>About</p>
            <p>Hi, I'm Yishan. I used to be an architect, and I still judge things the same way I judged buildings: does it stand up, does it make sense to be in, does it work for real people?</p>
            <p style={{ marginTop: 10 }}>That's probably why I can't pick one role — research, design, code, leading teams. A great product is beyond design, and I care deeply about every aspect of it.</p>
            <p style={{ marginTop: 10 }}>Right now I'm spending a lot of time with AI tools. Not in a "future of work" way — more: how to move faster, try weirder ideas, and maybe finally take a crack at problems I'd always shelved as too hard.</p>

            <p style={{ color: '#D75606', marginTop: 16, marginBottom: 0 }}>Recent work</p>
            <p>Clinic AI assistant at Freed.ai;<br />Automatic tax filing at Shopify;<br />Analytics platform at DevRev.</p>

            <p style={{ color: '#D75606', marginTop: 16, marginBottom: 0 }}>Connect</p>
            <p><a href="mailto:yishan.zhang007@gmail.com" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>Say hi</a>, or find me <a href="https://www.linkedin.com/in/yishanzhang/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>here</a>.</p>
          </div>
        </div>
      </div>
      */}

      {/* ====== BOTTOM NAV BUTTONS ====== */}
      <div ref={navRef} className="bottom-nav" onMouseLeave={handleNavLeave}>
        {NAV_BUTTONS.map(({ key, label, modal, src, cardW, cardH, prefetch }) => {
          const isSmall = breakpoint === 'small';
          const isActive = !isSmall && hoveredBtn === key;
          const isHidden = breakpoint !== 'wide' && hoveredBtn && !isActive && !isSmall;
          return (
            <BottomNavButton
              key={key}
              btnKey={key}
              modal={modal}
              label={label}
              src={src}
              prefetch={prefetch}
              isActive={isActive}
              isHidden={isHidden}
              breakpoint={breakpoint}
              cardWidth={cardW * CARD_SCALE}
              cardHeight={cardH * CARD_SCALE}
              onHover={handleHover}
              onOpen={handleOpen}
            />
          );
        })}
      </div>

      {/* ====== FULLSCREEN MODAL ====== */}
      <Modal
        activeCard={activeCard}
        cardConfigs={CARD_CONFIGS}
        originRect={originRect}
        onClose={handleClose}
        onExitComplete={handleExitComplete}
      />
    </>
  );
}
