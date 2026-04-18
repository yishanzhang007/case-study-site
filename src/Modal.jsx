import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Shader, Dither, Plasma } from 'shaders/react';

const MODAL_STYLE = {
  testcall:   { title: 'Agent playground', src: '/assets/test call full.svg', opacity: 1 },
  onboarding: { title: 'Onboarding' },
  scheduling: { title: 'Routing',          src: '/assets/full settings.svg',  opacity: 1 },
  true:       { title: 'Front desk inbox', src: '/assets/full inbox.svg',     opacity: 0.85 },
};

const EASE = [0.23, 1, 0.32, 1];

export default function Modal({ activeCard, cardConfigs, originRect, onClose, onExitComplete }) {
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
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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

              return (
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
                  initial={shouldReduceMotion || !initialFrame ? { opacity: 0 } : { ...initialFrame, opacity: 1 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { scaleX: 1, scaleY: 1, x: 0, y: 0, opacity: 1 }}
                  exit={
                    shouldReduceMotion || !initialFrame
                      ? { opacity: 0, transition: { duration: 0.18 } }
                      : { ...initialFrame, opacity: 1, transition: exitTransition }
                  }
                  transition={morphTransition}
                  onClick={(e) => e.stopPropagation()}
                >
                  {cardConfigs[activeCard].customModal === true ? (
                    <Shader style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', backgroundColor: '#F6F5FF' }}>
                      <Dither
                        colorA="#F6F5FF"
                        colorB="#C8C3EC"
                        pattern="bayer8"
                        pixelSize={3}
                        spread={0.99}
                        threshold={0.43}
                        transform={{ scale: 1.33 }}>
                        <Plasma
                          colorA="#ffffff"
                          contrast={0.9}
                          density={0.3}
                          intensity={1.2}
                          speed={1}
                          warp={0.52} />
                      </Dither>
                    </Shader>
                  ) : cardConfigs[activeCard].customModal === 'onboarding' ? (
                    <Shader style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', backgroundColor: '#D8E8D6' }}>
                      <Dither
                        colorA="#D8E8D6"
                        colorB="#AFCEAA"
                        pattern="bayer8"
                        pixelSize={3}
                        spread={0.99}
                        threshold={0.43}
                        transform={{ scale: 1.33 }}>
                        <Plasma
                          colorA="#ffffff"
                          contrast={0.9}
                          density={0.3}
                          intensity={1.2}
                          speed={1}
                          warp={0.52} />
                      </Dither>
                    </Shader>
                  ) : cardConfigs[activeCard].customModal === 'testcall' ? (
                    <Shader style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', backgroundColor: '#E2ECF6' }}>
                      <Dither
                        colorA="#E2ECF6"
                        colorB="#99CDFC"
                        pattern="bayer8"
                        pixelSize={3}
                        spread={0.99}
                        threshold={0.43}
                        transform={{ scale: 1.33 }}>
                        <Plasma
                          colorA="#ffffff"
                          contrast={0.9}
                          density={0.3}
                          intensity={1.2}
                          speed={1}
                          warp={0.52} />
                      </Dither>
                    </Shader>
                  ) : cardConfigs[activeCard].customModal === 'scheduling' ? (
                    <Shader style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', backgroundColor: '#DDDDDD' }}>
                      <Dither
                        colorA="#DDDDDD"
                        colorB="#D67DA9"
                        pattern="bayer8"
                        pixelSize={3}
                        spread={0.99}
                        threshold={0.43}
                        transform={{ scale: 1.33 }}>
                        <Plasma
                          colorA="#ffffff"
                          contrast={0.9}
                          density={0.3}
                          intensity={1.2}
                          speed={1}
                          warp={0.52} />
                      </Dither>
                    </Shader>
                  ) : null}
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, transition: { duration: 0.28 } }}
                    exit={{ opacity: 0, transition: { duration: 0.22 } }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    <button
                      onClick={onClose}
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
                    <div className="modal-title" style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      zIndex: 10,
                      background: 'rgba(255,255,255,0.6)',
                      WebkitBackdropFilter: 'blur(4px)',
                      backdropFilter: 'blur(4px)',
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontFamily: "'Tobias', serif",
                      fontWeight: 300,
                      fontSize: 14,
                      lineHeight: '20px',
                      letterSpacing: '-0.01em',
                      textTransform: 'none',
                      color: 'var(--fg-primary)',
                      pointerEvents: 'none',
                    }}>
                      {m.title}
                    </div>
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
                          background: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
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
              );
            })()}
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
