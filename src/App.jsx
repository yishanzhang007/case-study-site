import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Dithering } from '@paper-design/shaders-react';
import { Shader, Dither, GridDistortion, Plasma } from 'shaders/react';

const EASE = [0.23, 1, 0.32, 1];
const DURATION = 0.25;

function BottomNavButton({ label, src, isActive, isHidden, breakpoint, cardWidth, cardHeight, onMouseEnter, onClick }) {
  const ref = useRef(null);
  const [collapsed, setCollapsed] = useState(null);
  const t = { duration: DURATION, ease: EASE };

  // Measure collapsed size once on mount (before first paint)
  useLayoutEffect(() => {
    if (ref.current && !isActive && !collapsed) {
      const r = ref.current.getBoundingClientRect();
      setCollapsed({ w: r.width, h: r.height });
    }
  }, [isActive, collapsed]);

  // Hide mode: medium uses visibility (keeps layout stable), small uses display:none
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
        padding: isActive ? '12px' : '10px 12px',
      }}
      transition={t}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        borderRadius: 12,
        cursor: 'pointer',
        overflow: 'hidden',
        flexShrink: 0,
        ...hideStyle,
      }}
    >
      {/* Label — always in flow */}
      <motion.span
        initial={false}
        animate={{ opacity: isActive ? 0 : 1 }}
        transition={{ duration: isActive ? 0.05 : 0 }}
        style={{
          display: 'block',
          fontFamily: "'Tobias', serif",
          fontWeight: 300,
          fontSize: 14,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {label}
      </motion.span>
      {/* Card preview — absolutely positioned overlay */}
      <motion.img
        src={src}
        alt={label}
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
        }}
      />
    </motion.div>
  );
}

const CARD_CONFIGS = {
  onboarding: { src: '/assets/Onboarding.svg', width: 432, radius: 16, fullscreen: true, customModal: 'onboarding' },
  scheduling: { src: '/assets/scheduling.svg', width: 411, radius: 12, fullscreen: true, customModal: 'scheduling' },
  medication: { src: '/assets/test call.svg', width: 398, radius: 12, fullscreen: true, customModal: 'testcall' },
  notes: { src: '/assets/Notes.svg', width: 382, radius: 14, fullscreen: true, customModal: true },
  inbox: { src: '/assets/front desk inbox.svg', width: 383, radius: 16, fullscreen: true, customModal: true },
};

export default function App() {
  const [activeCard, setActiveCard] = useState(null);
  const [originRect, setOriginRect] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  // Breakpoint detection
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

  // Card dimensions per breakpoint
  const cardWidth = breakpoint === 'small' ? (typeof window !== 'undefined' ? window.innerWidth - 24 : 426) : 426;
  const cardHeight = 240;

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setActiveCard(null); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const NAV_BUTTONS = [
    { key: 'inbox', label: 'Front desk inbox', modal: 'inbox', src: '/assets/Inbox.svg' },
    { key: 'agent', label: 'Agent playground', modal: 'medication', src: '/assets/agent playground.svg' },
    { key: 'onboarding', label: 'Onboarding', modal: 'onboarding', src: '/assets/Onboarding.svg' },
    { key: 'routing', label: 'Routing', modal: 'scheduling', src: '/assets/routing.svg' },
  ];

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
            intensity={1.6}
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
        <div className="center-text" style={{ padding: '16px', borderRadius: 12 }}>
          <div style={{ position: 'relative', zIndex: 1, maxHeight: '100%', overflowY: 'auto' }}>
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

      {/* ====== BOTTOM NAV BUTTONS ====== */}
      <div
        className="bottom-nav"
        onMouseLeave={() => setHoveredBtn(null)}
      >
          {NAV_BUTTONS.map(({ key, label, modal, src }) => {
            const isActive = hoveredBtn === key;
            const isHidden = breakpoint !== 'wide' && hoveredBtn && !isActive;
            return (
              <BottomNavButton
                key={key}
                label={label}
                src={src}
                isActive={isActive}
                isHidden={isHidden}
                breakpoint={breakpoint}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                onMouseEnter={() => setHoveredBtn(key)}
                onClick={() => {
                  setActiveCard(modal);
                }}
              />
            );
          })}
      </div>

      {/* ====== FULLSCREEN MODAL ====== */}
      <AnimatePresence onExitComplete={() => setOriginRect(null)}>
        {activeCard && CARD_CONFIGS[activeCard] && CARD_CONFIGS[activeCard].customModal && (
          <motion.div
            className="card-modal-backdrop"
            onClick={() => setActiveCard(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {(() => {
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
                    {/* Title */}
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
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
