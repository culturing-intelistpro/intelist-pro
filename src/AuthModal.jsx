import { useState } from 'react'
import { supabase } from './supabase'
import styles from './AuthModal.module.css'
import { X, Eye, EyeOff } from 'lucide-react'

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode]         = useState('login') // 'login' | 'signup'
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [brokerage, setBrokerage] = useState('')
  const [phone, setPhone]       = useState('')
  const [showPw, setShowPw]     = useState(false)

  const reset = () => { setError(''); setLoading(false) }

  const handleLogin = async (e) => {
    e.preventDefault()
    reset()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('rate limit') || msg.includes('email rate')) {
        setError('Too many attempts. Please wait a moment and try again.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }
    onSuccess(data.user)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    reset()
    if (!fullName.trim()) { setError('Full name is required.'); return }
    if (!brokerage.trim()) { setError('Brokerage is required.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, brokerage, phone },
      },
    })
    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('rate limit') || msg.includes('email rate')) {
        setError('Too many attempts. Please wait a moment and try again.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }
    if (data.user && data.session) {
      onSuccess(data.user)
    } else {
      // Email confirmation is enabled — shouldn't reach here if disabled in Supabase
      setError('Too many attempts. Please wait a moment and try again.')
      setLoading(false)
      setMode('login')
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>

        <h2 className={styles.title}>
          {mode === 'login' ? <>Sign in to <span style={{ color: '#D94035' }}>Intelist Pro</span></> : 'Create your account'}
        </h2>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in to craft your listing copy'
            : 'Start crafting professional listing copy'}
        </p>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className={styles.form}>
          {mode === 'signup' && (
            <>
              <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Jane Smith" required />
              <Field label="Brokerage" value={brokerage} onChange={setBrokerage} placeholder="Keller Williams, etc." required />
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="(703) 555-0100" type="tel" />
            </>
          )}
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" required />
          <PasswordField value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(v => !v)} />

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className={styles.switchText}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className={styles.switchBtn}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}{required && <span className={styles.req}> *</span>}</label>
      <input
        className={styles.input}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
    </div>
  )
}

function PasswordField({ value, onChange, show, onToggle }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>Password<span className={styles.req}> *</span></label>
      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
        <button type="button" className={styles.eyeBtn} onClick={onToggle} tabIndex={-1}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
