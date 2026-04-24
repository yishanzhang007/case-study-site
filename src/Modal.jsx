import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import DitherShader from './DitherShader';

const MODAL_STYLE = {
  testcall:   { title: 'Agent playground', src: '/assets/test call full.svg', opacity: 1 },
  onboarding: { title: 'Onboarding' },
  scheduling: { title: 'Routing',          src: '/assets/full settings.svg',  opacity: 1 },
  true:       { title: 'Front desk inbox', src: '/assets/full inbox.svg',     opacity: 0.85 },
};

const MODAL_COLORS = {
  true:       { bg: '#F6F5FF', dot: '#C8C3EC' },
  onboarding: { bg: '#D8E8D6', dot: '#74BD68' },
  testcall:   { bg: '#E2ECF6', dot: '#99CDFC' },
  scheduling: { bg: '#DDDDDD', dot: '#D67DA9' },
};

const EASE = [0.23, 1, 0.32, 1];

export default function Modal({ activeCard, cardConfigs, originRect, breakpoint, onClose, onExitComplete }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {activeCard && cardConfigs[activeCard] && cardConfigs[activeCard].customModal && (() => {
        const m = MODAL_STYLE[cardConfigs[activeCard].customModal] || MODAL_STYLE.true;
        return (
          <motion.div
            className="card-modal-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, pointerEvents: 'auto' }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.15 }}
          >
            {(() => {
              const VW = window.innerWidth;
              const VH = window.innerHeight;
              const MW = VW - 24;
              const MH = VH - 24;
              const initialFrame = originRect ? {
                scaleX: originRect.width / MW,
                scaleY: originRect.height / MH,
                x: (originRect.x + originRect.width / 2) - (12 + MW / 2),
                y: (originRect.y + originRect.height / 2) - (12 + MH / 2),
              } : null;

              const morphTransition = { duration: 0.42, ease: EASE };
              const exitTransition = { duration: 0.6, ease: EASE };
              const c = MODAL_COLORS[cardConfigs[activeCard].customModal] || MODAL_COLORS.true;

              return (
                <ModalContent
                  activeCard={activeCard}
                  cardConfigs={cardConfigs}
                  initialFrame={initialFrame}
                  morphTransition={morphTransition}
                  exitTransition={exitTransition}
                  shouldReduceMotion={shouldReduceMotion}
                  colorBg={c.bg}
                  colorDot={c.dot}
                  breakpoint={breakpoint}
                  onClose={onClose}
                />
              );
            })()}
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}

function ModalContent({ activeCard, cardConfigs, initialFrame, morphTransition, exitTransition, shouldReduceMotion, colorBg, colorDot, breakpoint, onClose }) {
  const [shaderReady, setShaderReady] = useState(false);
  const m = MODAL_STYLE[cardConfigs[activeCard].customModal] || MODAL_STYLE.true;
  const isSmall = breakpoint === 'small';

  const drawerTransition = { duration: 0.35, ease: EASE };
  const drawerExitTransition = { duration: 0.28, ease: EASE };

  return (
    <>
                <motion.div
                  className="card-modal-content"
                  style={{
                    position: 'fixed',
                    top: 12,
                    left: 12,
                    width: 'calc(100vw - 24px)',
                    height: 'calc(100dvh - 24px)',
                    borderRadius: cardConfigs[activeCard].radius,
                    overflow: 'hidden',
                    transformOrigin: 'center center',
                    willChange: 'transform, opacity',
                  }}
                  initial={
                    isSmall
                      ? { y: '100%', opacity: 1 }
                      : shouldReduceMotion || !initialFrame
                        ? { opacity: 0 }
                        : { ...initialFrame, opacity: 1 }
                  }
                  animate={
                    isSmall
                      ? { y: 0, opacity: 1, pointerEvents: 'auto' }
                      : shouldReduceMotion
                        ? { opacity: 1, pointerEvents: 'auto' }
                        : { scaleX: 1, scaleY: 1, x: 0, y: 0, opacity: 1, pointerEvents: 'auto' }
                  }
                  exit={
                    isSmall
                      ? { y: '100%', opacity: 1, pointerEvents: 'none', transition: drawerExitTransition }
                      : shouldReduceMotion || !initialFrame
                        ? { opacity: 0, pointerEvents: 'none', transition: { duration: 0.18 } }
                        : { ...initialFrame, opacity: 1, pointerEvents: 'none', transition: exitTransition }
                  }
                  transition={isSmall ? drawerTransition : morphTransition}
                  onAnimationComplete={(def) => {
                    if (def && (def.scaleX === 1 || (isSmall && def.y === 0))) setShaderReady(true);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: colorBg }}>
                    {shaderReady && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{ position: 'absolute', inset: 0 }}
                      >
                        <DitherShader
                          colorA={colorBg}
                          colorB={colorDot}
                          style={{ position: 'absolute', zIndex: 0 }}
                        />
                      </motion.div>
                    )}
                  </div>
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, transition: { duration: 0.28 } }}
                    exit={{ opacity: 0, transition: { duration: 0.22 } }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    <button
                      onClick={onClose}
                      aria-label="Close"
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
                    {/* <div className="modal-title" style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      zIndex: 10,
                      fontFamily: "'Denim Ink', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                      fontWeight: 400,
                      fontSize: 16,
                      lineHeight: '22px',
                      letterSpacing: '-0.01em',
                      textTransform: 'none',
                      color: 'var(--fg-primary)',
                      pointerEvents: 'none',
                    }}>
                      {m.title}
                    </div> */}
                    <div className="fullscreen-modal-svg-overlay" style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      paddingTop: 80,
                      paddingBottom: 80,
                      paddingLeft: 'clamp(16px, 3vw, 40px)',
                      paddingRight: 'clamp(16px, 3vw, 40px)',
                      overflow: 'hidden',
                    }}>
                      <div style={{ flex: '1 0 0px' }} />
                      {cardConfigs[activeCard].customModal === 'onboarding' ? (
                        <div style={{
                          display: 'flex',
                          gap: 80,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          flexShrink: 0,
                        }}>
                          <img src="/assets/full onboarding 1.svg" alt="" style={{ maxWidth: '100%', height: 'auto', opacity: 1, borderRadius: 12, background: 'transparent' }} />
                          <img src="/assets/full onboarding 2.svg" alt="" style={{ maxWidth: '100%', height: 'auto', opacity: 1, borderRadius: 12, background: 'transparent' }} />
                        </div>
                      ) : (
                        <div style={{
                          background: 'rgba(255,255,255,0.5)',
                          borderRadius: 12,
                          maxWidth: '100%',
                          display: 'flex',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}>
                          <img
                            src={m.src}
                            alt=""
                            style={{
                              maxWidth: '100%',
                              height: 'auto',
                              display: 'block',
                              opacity: m.opacity,
                              borderRadius: 12,
                            }}
                          />
                        </div>
                      )}
                      <div style={{ flex: '1 0 0px' }} />
                    </div>
                  </motion.div>
                </motion.div>
    </>
  );
}
