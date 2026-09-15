import { useState } from 'react'
import { supabase } from './supabase'
import styles from './AuthModal.module.css'
import { X } from 'lucide-react'

export default function NotifyModal({ feature, onClose }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setLoading(true)

    const { error: dbError } = await supabase
      .from('waitlist')
      .insert({ feature_name: feature.key, email: email.trim() })

    setLoading(false)

    if (dbError) {
      // 42P01 = raw Postgres undefined_table; PGRST205 = PostgREST's own "table
      // not in schema cache" error — either means the waitlist table hasn't
      // been created yet.
      if (
        dbError.code === '42P01' ||
        dbError.code === 'PGRST205' ||
        dbError.message?.includes('does not exist') ||
        dbError.message?.includes('Could not find the table')
      ) {
        setError('Waitlist isn’t set up yet — please contact the site admin.')
      } else {
        setError(dbError.message || 'Something went wrong. Please try again.')
      }
      return
    }

    setDone(true)
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>

        {done ? (
          <>
            <h2 className={`${styles.title} ${styles.successTitle}`}>You're on the list!</h2>
            <p className={styles.subtitle}>We'll email you when {feature.title} launches.</p>
          </>
        ) : (
          <>
            <h2 className={styles.title}>{feature.title}</h2>
            <p className={styles.subtitle}>{feature.tagline}</p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button className={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Submitting…' : 'Notify Me'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
