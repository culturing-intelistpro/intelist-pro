import { useState, useLayoutEffect, useCallback } from 'react'
import styles from './OnboardingTour.module.css'

const TOOLTIP_WIDTH = 300
const GAP = 14 // space between target and tooltip

export default function OnboardingTour({ steps, step, onNext, onSkip, onFinish }) {
  const [rect, setRect]           = useState(null)
  const [placement, setPlacement] = useState('bottom')

  const current = steps[step]
  const isLast  = step === steps.length - 1

  const measure = useCallback(() => {
    const el = document.getElementById(current.targetId)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect(r)
    // Prefer placing the tooltip below the target; flip above if that would
    // run off the bottom of the viewport.
    setPlacement(window.innerHeight - r.bottom < 160 ? 'top' : 'bottom')
  }, [current.targetId])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  if (!rect) return null // target isn't mounted (e.g. panel not rendered yet) — skip rather than show a broken tour

  const centerX = rect.left + rect.width / 2
  const tooltipLeft = Math.min(
    Math.max(centerX - TOOLTIP_WIDTH / 2, 16),
    window.innerWidth - TOOLTIP_WIDTH - 16
  )
  const arrowLeft = Math.min(Math.max(centerX - tooltipLeft, 24), TOOLTIP_WIDTH - 24)

  const tooltipStyle = {
    width: TOOLTIP_WIDTH,
    left: tooltipLeft,
    ...(placement === 'bottom'
      ? { top: rect.bottom + GAP }
      : { bottom: window.innerHeight - rect.top + GAP }),
  }

  return (
    <>
      {/* Blocks interaction with the page underneath while the tour is active. */}
      <div className={styles.blocker} onClick={(e) => e.stopPropagation()} />

      {/* Dark overlay with a "spotlight" cut around the target, via box-shadow. */}
      <div
        className={styles.spotlight}
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />

      <div className={styles.tooltip} style={tooltipStyle}>
        <span
          className={placement === 'bottom' ? styles.arrowTop : styles.arrowBottom}
          style={{ left: arrowLeft }}
        />
        <p className={styles.stepIndicator}>{step + 1} of {steps.length}</p>
        <p className={styles.message}>{current.message}</p>
        <div className={styles.actions}>
          {isLast ? (
            <button className={styles.finishBtn} onClick={onFinish}>Got it, let's go! →</button>
          ) : (
            <>
              <button className={styles.skipBtn} onClick={onSkip}>Skip</button>
              <button className={styles.nextBtn} onClick={onNext}>Next</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
