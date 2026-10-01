import { useState, useLayoutEffect, useCallback } from 'react'
import styles from './OnboardingTour.module.css'

const TOOLTIP_WIDTH = 380
const GAP = 16

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
    setPlacement(window.innerHeight - r.bottom < 220 ? 'top' : 'bottom')
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

  if (!rect) return null

  const centerX    = rect.left + rect.width / 2
  const tooltipLeft = Math.min(
    Math.max(centerX - TOOLTIP_WIDTH / 2, 16),
    window.innerWidth - TOOLTIP_WIDTH - 16,
  )
  const arrowLeft = Math.min(Math.max(centerX - tooltipLeft, 28), TOOLTIP_WIDTH - 28)

  const tooltipStyle = {
    width: TOOLTIP_WIDTH,
    left:  tooltipLeft,
    ...(placement === 'bottom'
      ? { top:    rect.bottom + GAP }
      : { bottom: window.innerHeight - rect.top + GAP }),
  }

  return (
    <>
      {/* Blocks page interaction during tour */}
      <div className={styles.blocker} onClick={(e) => e.stopPropagation()} />

      {/* Spotlight ring around target element */}
      <div
        className={styles.spotlight}
        style={{
          top:    rect.top    - 8,
          left:   rect.left   - 8,
          width:  rect.width  + 16,
          height: rect.height + 16,
        }}
      />

      <div className={styles.tooltip} style={tooltipStyle}>
        {/* Arrow */}
        <span
          className={placement === 'bottom' ? styles.arrowTop : styles.arrowBottom}
          style={{ left: arrowLeft }}
        />

        {/* Header: emoji icon + step title */}
        <div className={styles.header}>
          {current.emoji && (
            <span className={styles.emoji}>{current.emoji}</span>
          )}
          <div className={styles.headerText}>
            {current.title && (
              <p className={styles.title}>{current.title}</p>
            )}
            <p className={styles.stepLabel}>{step + 1} of {steps.length}</p>
          </div>
        </div>

        {/* Message */}
        <p className={styles.message}>{current.message}</p>

        {/* Progress dots */}
        <div className={styles.dots}>
          {steps.map((_, i) => (
            <span key={i} className={i === step ? styles.dotActive : styles.dot} />
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {isLast ? (
            <button className={styles.finishBtn} onClick={onFinish}>Let's go →</button>
          ) : (
            <>
              <button className={styles.skipBtn} onClick={onSkip}>Skip tour</button>
              <button className={styles.nextBtn} onClick={onNext}>Next</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
