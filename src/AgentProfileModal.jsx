// AgentProfileModal.jsx — Your Marketing DNA
import { useState, useEffect, useCallback, useRef } from 'react'
import { callClaude } from './anthropicClient'
import { X, Check } from 'lucide-react'
import { supabase } from './supabase'
import styles from './AgentProfileModal.module.css'

// ─── Brokerage Brand DNA Presets ─────────────────────────────────────────────
const BROKERAGES = [
  { name: 'Keller Williams',               keywords: ['keller williams','kw realty','kw'],                primary: '#B40101', secondary: '#222222', font: 'Montserrat',        fontSub: 'Open Sans',   logoText: 'KW'    },
  { name: 'RE/MAX',                         keywords: ['remax','re/max','re-max'],                          primary: '#DC1B1B', secondary: '#003087', font: 'Roboto',             fontSub: 'Roboto',      logoText: 'RE/MAX'},
  { name: 'Coldwell Banker',                keywords: ['coldwell banker','coldwell'],                       primary: '#003DA5', secondary: '#FFFFFF', font: 'Open Sans',          fontSub: 'Open Sans',   logoText: 'CB'    },
  { name: 'Compass',                        keywords: ['compass realty','compass real','compass'],          primary: '#000000', secondary: '#A3A3A3', font: 'Cormorant Garamond', fontSub: 'Inter',       logoText: '⊕'    },
  { name: 'eXp Realty',                     keywords: ['exp realty','exp'],                                 primary: '#00A2FF', secondary: '#1B1464', font: 'Poppins',            fontSub: 'Poppins',     logoText: 'exp'   },
  { name: 'Century 21',                     keywords: ['century 21','c21','century21'],                     primary: '#D4AC0D', secondary: '#000000', font: 'Oswald',             fontSub: 'Lato',        logoText: 'C21'   },
  { name: 'Berkshire Hathaway HomeServices',keywords: ['berkshire hathaway','bhhs','berkshire'],            primary: '#512B86', secondary: '#FFFFFF', font: 'Playfair Display',   fontSub: 'Lato',        logoText: 'BHHS'  },
  { name: "Sotheby's International Realty", keywords: ["sotheby's",'sothebys','sotheby'],                   primary: '#002A5E', secondary: '#C9B99B', font: 'Cormorant Garamond', fontSub: 'Lato',        logoText: 'SIR'   },
  { name: "TTR Sotheby's",                  keywords: ['ttr sotheby','ttr'],                                primary: '#002A5E', secondary: '#9B8454', font: 'Cormorant Garamond', fontSub: 'Lato',        logoText: 'TTR'   },
  { name: 'Long & Foster',                  keywords: ['long & foster','long and foster','long foster'],    primary: '#003087', secondary: '#C8102E', font: 'Lato',               fontSub: 'Lato',        logoText: 'L&F'   },
  { name: 'Weichert Realtors',              keywords: ['weichert'],                                         primary: '#FFB800', secondary: '#000000', font: 'Inter',              fontSub: 'Inter',       logoText: 'W'     },
  { name: 'Howard Hanna',                   keywords: ['howard hanna','hanna'],                             primary: '#C8102E', secondary: '#003DA5', font: 'Roboto',             fontSub: 'Roboto',      logoText: 'HH'    },
  { name: 'Better Homes & Gardens RE',      keywords: ['better homes','bhgre','bhg'],                       primary: '#E31C3D', secondary: '#333333', font: 'Nunito',             fontSub: 'Nunito',      logoText: 'BHG'   },
  { name: 'ERA Real Estate',                keywords: ['era real estate','era realty'],                     primary: '#003087', secondary: '#FFB800', font: 'Lato',               fontSub: 'Lato',        logoText: 'ERA'   },
  { name: 'Redfin',                         keywords: ['redfin'],                                           primary: '#D92228', secondary: '#1677FF', font: 'Inter',              fontSub: 'Inter',       logoText: 'R'     },
  { name: 'Samson Properties',              keywords: ['samson'],                                           primary: '#1B3A6B', secondary: '#C8A951', font: 'Merriweather',       fontSub: 'Lato',        logoText: 'SP'    },
  { name: 'Pearson Smith Realty',           keywords: ['pearson smith'],                                    primary: '#1D4E8F', secondary: '#C9A84C', font: 'Montserrat',         fontSub: 'Montserrat',  logoText: 'PS'    },
  { name: 'United Real Estate',             keywords: ['united real estate','united realty'],               primary: '#D62828', secondary: '#1A237E', font: 'Roboto',             fontSub: 'Roboto',      logoText: 'URE'   },
  { name: 'Corcoran Group',                 keywords: ['corcoran'],                                         primary: '#000000', secondary: '#C8A951', font: 'Cormorant Garamond', fontSub: 'Inter',       logoText: 'C'     },
  { name: 'Douglas Elliman',                keywords: ['douglas elliman','elliman'],                        primary: '#231F20', secondary: '#9B8454', font: 'Playfair Display',   fontSub: 'Open Sans',   logoText: 'DE'    },
  { name: 'Engel & Volkers',                keywords: ['engel','volkers'],                                  primary: '#C8102E', secondary: '#000000', font: 'Lato',               fontSub: 'Lato',        logoText: 'E&V'   },
  { name: 'Real Brokerage',                 keywords: ['real brokerage'],                                   primary: '#1A1A1A', secondary: '#6C63FF', font: 'Inter',              fontSub: 'Inter',       logoText: 'real'  },
]
function detectBrokerage(name) {
  if (!name || name.length < 2) return null
  const lower = name.toLowerCase()
  return BROKERAGES.find(b => b.keywords.some(k => lower.includes(k))) || null
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
const CHECKLIST = [
  { key: 'name',           label: 'Name & Contact',    pts: 20 },
  { key: 'brokerage',      label: 'Company',           pts: 10 },
  { key: 'brand_color',    label: 'Brand Colors',      pts: 10 },
  { key: 'website',        label: 'Website',           pts: 15 },
  { key: 'photo',          label: 'Profile Photo',     pts: 10 },
  { key: 'writing_style',  label: 'Writing Sample',    pts: 20 },
  { key: 'specialties',    label: 'Specialties',       pts:  5 },
  { key: 'certifications', label: 'Certifications',    pts:  5 },
  { key: 'socials',        label: 'Social Media',      pts:  5 },
]

function calcScore(form) {
  let total = 0
  CHECKLIST.forEach(({ key, pts }) => {
    switch (key) {
      case 'name':     if (form.full_name?.trim() && form.phone?.trim()) total += pts; break
      case 'website':  if (form.website_url?.trim()) total += pts; break
      case 'photo':    if (form.agent_photo_url?.trim()) total += pts; break
      case 'socials':  if (form.instagram_url?.trim() || form.facebook_url?.trim() || form.linkedin_url?.trim()) total += pts; break
      default:         if ((form[key] || '').trim()) total += pts
    }
  })
  return Math.min(total, 100)
}

function isChecked(key, form) {
  switch (key) {
    case 'name':     return !!(form.full_name?.trim() && form.phone?.trim())
    case 'website':  return !!(form.website_url?.trim())
    case 'photo':    return !!(form.agent_photo_url?.trim())
    case 'socials':  return !!(form.instagram_url?.trim() || form.facebook_url?.trim() || form.linkedin_url?.trim())
    default:         return !!(form[key] || '').trim()
  }
}

// ─── Ring progress ────────────────────────────────────────────────────────────
function RingProgress({ score }) {
  const r = 38, circ = 2 * Math.PI * r
  const color = score === 100 ? '#34C759' : score >= 60 ? 'var(--accent)' : score >= 20 ? '#FFB800' : '#D2D2D7'
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className={styles.ring}>
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-light)" strokeWidth="6" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
        strokeLinecap="round" transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }} />
      <text x="48" y="52" textAnchor="middle" fontSize="18" fontWeight="700"
        fill={score === 100 ? '#34C759' : 'var(--text-1)'}
        style={{ fontVariantNumeric: 'tabular-nums' }}>{score}%</text>
    </svg>
  )
}

const TABS = ['Basics', 'Brand', 'Style', 'Social']

export default function AgentProfileModal({ user, initialProfile, onClose, onSave }) {
  const [tab,    setTab]    = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')
  const [skipInsta,   setSkipInsta]   = useState(false)
  const [skipFacebook, setSkipFacebook] = useState(false)
  const [skipSample,  setSkipSample]  = useState(false)
  const [brokMatch,   setBrokMatch]   = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const cardInputRef = useRef(null)

  const [form, setForm] = useState({
    full_name:       '',
    phone:           '',
    brokerage:       '',
    tagline:         '',
    brand_color:     '#D94035',
    brand_color2:    '',
    website_url:     '',
    agent_photo_url: '',
    instagram_url:   '',
    facebook_url:    '',
    linkedin_url:    '',
    writing_style:   '',
    specialties:     '',
    certifications:  '',
    copy_tone:       '',
  })

  useEffect(() => {
    if (!initialProfile && !user) return
    setForm(prev => ({
      ...prev,
      full_name:       initialProfile?.full_name       || user?.user_metadata?.full_name || '',
      phone:           initialProfile?.phone           || '',
      brokerage:       initialProfile?.brokerage       || '',
      tagline:         initialProfile?.tagline         || '',
      brand_color:     initialProfile?.brand_color     || '#D94035',
      brand_color2:    initialProfile?.brand_color2    || '',
      website_url:     initialProfile?.website_url     || '',
      agent_photo_url: initialProfile?.agent_photo_url || '',
      instagram_url:   initialProfile?.instagram_url   || '',
      facebook_url:    initialProfile?.facebook_url    || '',
      linkedin_url:    initialProfile?.linkedin_url    || '',
      writing_style:   initialProfile?.writing_style   || '',
      specialties:     initialProfile?.specialties     || '',
      certifications:  initialProfile?.certifications  || '',
      copy_tone:       initialProfile?.copy_tone       || '',
    }))
    if (initialProfile?.writing_style === '__skipped__') setSkipSample(true)
  }, [initialProfile, user])

  const set = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), [])

  // 브로커리지 자동 감지
  useEffect(() => { setBrokMatch(detectBrokerage(form.brokerage)) }, [form.brokerage])

  // 명함 스캔 — Claude 비전으로 이름/전화/브로커리지 추출
  const scanBusinessCard = useCallback(async (file) => {
    if (!file) return
    setScanLoading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target.result.split(',')[1]
        const msg = await callClaude({
          model: 'claude-opus-4-6',
          max_tokens: 400,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } },
            { type: 'text', text: 'Real estate agent business card. Extract ONLY name, phone, company. Return ONLY JSON: {"full_name":"","phone":"","brokerage":""}' },
          ]}],
        })
        const txt = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
        const m = txt.match(/\{[^{}]+\}/)
        if (m) {
          const d = JSON.parse(m[0])
          if (d.full_name) set('full_name', d.full_name)
          if (d.phone)     set('phone',     d.phone)
          if (d.brokerage) set('brokerage', d.brokerage)
        }
      } catch (e) { console.error('[Intelist] card scan:', e) }
      finally { setScanLoading(false) }
    }
    reader.readAsDataURL(file)
  }, [set])

  // 프로필 사진 업로드 — Supabase Storage 저장
  const uploadAgentPhoto = useCallback(async (file) => {
    if (!file || !user) return
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = \`agent-photos/\${user.id}-\${Date.now()}.\${ext}\`
      const { error } = await supabase.storage.from('agent-assets').upload(fileName, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('agent-assets').getPublicUrl(fileName)
      set('agent_photo_url', publicUrl)
    } catch (e) { console.error('[Intelist] photo upload:', e) }
  }, [set, user])

  const score = calcScore(form)

  const save = async () => {
    if (!user) return
    setSaving(true); setError('')
    try {
      const { error: err } = await supabase.from('profiles').upsert({
        id:              user.id,
        full_name:       form.full_name.trim()       || null,
        phone:           form.phone.trim()           || null,
        brokerage:       form.brokerage.trim()       || null,
        tagline:         form.tagline.trim()         || null,
        brand_color:     form.brand_color            || null,
        brand_color2:    form.brand_color2           || null,
        website_url:     form.website_url.trim()     || null,
        agent_photo_url: form.agent_photo_url.trim() || null,
        instagram_url:   skipInsta    ? null : form.instagram_url.trim() || null,
        facebook_url:    skipFacebook ? null : form.facebook_url.trim()  || null,
        linkedin_url:    form.linkedin_url.trim()    || null,
        writing_style:   skipSample ? '__skipped__' : form.writing_style.trim() || null,
        specialties:     form.specialties.trim()     || null,
        certifications:  form.certifications.trim()  || null,
        copy_tone:       null, // auto-detected
      })
      if (err) throw err
      setSaved(true)
      onSave?.({ ...form })
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error('[Intelist Pro] Profile save error:', e)
      setError('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const headlineForScore = () => {
    if (score === 100) return '🎉 Your DNA is fully set — max-quality marketing ready'
    if (score >= 80)  return 'Almost there — just a few more fields'
    if (score >= 60)  return 'Great start — your style is taking shape'
    if (score >= 20)  return 'Ready for basic copy generation'
    return 'Fill in your profile to personalize your copy'
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Your Marketing DNA">

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>Your Marketing DNA</h2>
            <p className={styles.headerSub}>The more you share, the better your marketing performs.</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Left — score panel */}
          <aside className={styles.scorePanel}>
            <RingProgress score={score} />
            <p className={styles.scoreHeadline}>{headlineForScore()}</p>
            <ul className={styles.checklist}>
              {CHECKLIST.map(({ key, label }) => {
                const checked = isChecked(key, form)
                return (
                  <li key={key} className={`${styles.checkItem} ${checked ? styles.checkItemDone : ''}`}>
                    <span className={`${styles.checkBox} ${checked ? styles.checkBoxDone : ''}`}>
                      {checked && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span className={styles.checkLabel}>{label}</span>
                  </li>
                )
              })}
            </ul>
            {score === 100 && <div className={styles.achieveBadge}>🎉 100% Complete</div>}
          </aside>

          {/* Right — form */}
          <div className={styles.formPanel}>
            <div className={styles.tabs}>
              {TABS.map((t, i) => (
                <button key={t}
                  className={`${styles.tab} ${tab === i ? styles.tabActive : ''}`}
                  onClick={() => setTab(i)}>{t}</button>
              ))}
            </div>

            <div className={styles.tabContent}>

              {/* Tab 0 — Basics */}
              {tab === 0 && (
                <div className={styles.fields}>
                  <div className={styles.cardScanRow}>
                    <input ref={cardInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => scanBusinessCard(e.target.files?.[0])} />
                    <button className={styles.cardScanBtn}
                      onClick={() => cardInputRef.current?.click()} disabled={scanLoading}>
                      {scanLoading ? <span className={styles.spinner} /> : '🪪'}
                      {scanLoading ? 'Reading card…' : 'Scan Business Card'}
                    </button>
                    <p className={styles.cardScanHint}>Upload your business card to auto-fill name, phone & company</p>
                  </div>
                  <div className={styles.fieldRow}>
                    <Field label="Full Name" hint="Used as the listing agent signature">
                      <input className={styles.input} value={form.full_name}
                        onChange={e => set('full_name', e.target.value)}
                        placeholder="Jane Smith" autoComplete="name" />
                    </Field>
                    <Field label="Phone" hint="Client-facing contact number">
                      <input className={styles.input} value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        placeholder="(703) 000-0000" type="tel" autoComplete="tel" />
                    </Field>
                  </div>
                  <Field label="Brokerage / Company" hint="Appears on listing copy and marketing materials">
                    <input className={styles.input} value={form.brokerage}
                      onChange={e => set('brokerage', e.target.value)}
                      placeholder="Keller Williams, eXp Realty…" />
                  </Field>
                  <Field label="Tagline" hint="Your one-line personal brand statement">
                    <input className={styles.input} value={form.tagline}
                      onChange={e => set('tagline', e.target.value)}
                      placeholder="Northern Virginia's most trusted agent" />
                  </Field>
                  <Field label="Specialties" hint="Sets the context for your copy — buyer types, neighborhoods, niches">
                    <input className={styles.input} value={form.specialties}
                      onChange={e => set('specialties', e.target.value)}
                      placeholder="First-time buyers, luxury homes, relocation" />
                  </Field>
                  <Field label="Certifications & Designations" hint="Builds credibility in your marketing">
                    <input className={styles.input} value={form.certifications}
                      onChange={e => set('certifications', e.target.value)}
                      placeholder="ABR, CRS, GRI, e-PRO" />
                  </Field>
                </div>
              )}

              {/* Tab 1 — Brand */}
              {tab === 1 && (
                <div className={styles.fields}>
                  {brokMatch && (
                    <div className={styles.brokSuggest}>
                      <div className={styles.brokSuggestLeft}>
                        <span className={styles.brokLogoChip} style={{ background: brokMatch.primary }}>
                          {brokMatch.logoText}
                        </span>
                        <div>
                          <p className={styles.brokSuggestName}>{brokMatch.name}</p>
                          <p className={styles.brokSuggestSub}>Brand colors detected</p>
                        </div>
                      </div>
                      <div className={styles.brokSuggestRight}>
                        <span className={styles.brokColorDot} style={{ background: brokMatch.primary }} />
                        <span className={styles.brokColorDot} style={{ background: brokMatch.secondary, border: '1px solid var(--border-light)' }} />
                        <button className={styles.brokApplyBtn}
                          onClick={() => { set('brand_color', brokMatch.primary); set('brand_color2', brokMatch.secondary) }}>
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                  <div className={styles.fieldRow}>
                    <Field label="Primary Color" hint="Main brand color for your materials">
                      <div className={styles.colorRow}>
                        <input type="color" className={styles.colorSwatch}
                          value={form.brand_color}
                          onChange={e => set('brand_color', e.target.value)} />
                        <input className={styles.input} value={form.brand_color}
                          onChange={e => set('brand_color', e.target.value)}
                          placeholder="#D94035" style={{ flex: 1 }} />
                      </div>
                    </Field>
                    <Field label="Secondary Color" hint="Accent color for backgrounds & highlights">
                      <div className={styles.colorRow}>
                        <input type="color" className={styles.colorSwatch}
                          value={form.brand_color2 || '#ffffff'}
                          onChange={e => set('brand_color2', e.target.value)} />
                        <input className={styles.input} value={form.brand_color2}
                          onChange={e => set('brand_color2', e.target.value)}
                          placeholder="#F5F0EB" style={{ flex: 1 }} />
                      </div>
                    </Field>
                  </div>
                  <Field label="Your Website" hint="Your agent homepage or brokerage profile page">
                    <input className={styles.input} value={form.website_url}
                      onChange={e => set('website_url', e.target.value)}
                      placeholder="https://janesmith.com" type="url" />
                  </Field>
                  <Field label="Profile Photo" hint="Upload headshot — used across all templates · Background removed automatically">
                    <div className={styles.photoUploadRow}>
                      {form.agent_photo_url && (
                        <img src={form.agent_photo_url} alt="Agent"
                          className={styles.photoPreviewCircle}
                          onError={e => { e.target.style.display = 'none' }} />
                      )}
                      <div className={styles.photoUploadActions}>
                        <label className={styles.photoUploadBtn}>
                          📷 {form.agent_photo_url ? 'Change Photo' : 'Upload Photo'}
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => uploadAgentPhoto(e.target.files?.[0])} />
                        </label>
                        {form.agent_photo_url && (
                          <button className={styles.photoRemoveBtn}
                            onClick={() => set('agent_photo_url', '')}>Remove</button>
                        )}
                        <p className={styles.photoHint}>Used across all templates (brochure, SNS, video)</p>
                      </div>
                    </div>
                    <input className={styles.input} value={form.agent_photo_url}
                      onChange={e => set('agent_photo_url', e.target.value)}
                      placeholder="Or paste image URL" type="url" style={{ marginTop: 8 }} />
                  </Field>
                </div>
              )}

              {/* Tab 2 — Style */}
              {tab === 2 && (
                <div className={styles.fields}>
                  <div className={styles.autoToneNote}>
                    <span className={styles.autoToneIcon}>✦</span>
                    <div>
                      <p className={styles.autoToneTitle}>Writing tone is detected automatically</p>
                      <p className={styles.autoToneSub}>Based on your listing samples and profile details, your tone is matched to fit your brand — no manual selection needed.</p>
                    </div>
                  </div>
                  <Field label="Previous Listing Sample"
                    hint="Paste one or more MLS descriptions you've written. Separate multiple samples with a blank line.">
                    {skipSample ? (
                      <div className={styles.skippedNote}>
                        <span>Writing sample skipped — you can add it anytime.</span>
                        <button className={styles.linkBtn} onClick={() => setSkipSample(false)}>Add now</button>
                      </div>
                    ) : (
                      <>
                        <textarea className={`${styles.input} ${styles.textarea}`}
                          value={form.writing_style}
                          onChange={e => set('writing_style', e.target.value)}
                          placeholder={"Beautiful 4BR/3BA single-family home nestled in the heart of Reston…\n\nMultiple samples are fine — separate them with a blank line."}
                          rows={7} />
                        {!form.writing_style && (
                          <button className={styles.skipBtn} onClick={() => setSkipSample(true)}>
                            Skip for now — I'll add this later
                          </button>
                        )}
                      </>
                    )}
                  </Field>
                </div>
              )}

              {/* Tab 3 — Social */}
              {tab === 3 && (
                <div className={styles.fields}>
                  <Field label="Email" hint="Your account email (cannot be changed here)">
                    <input className={`${styles.input} ${styles.inputDisabled}`}
                      value={user?.email || ''} readOnly />
                  </Field>
                  <Field label="Instagram">
                    {skipInsta ? (
                      <div className={styles.skippedNote}>
                        <span>Not using Instagram.</span>
                        <button className={styles.linkBtn} onClick={() => setSkipInsta(false)}>Add anyway</button>
                      </div>
                    ) : (
                      <>
                        <input className={styles.input} value={form.instagram_url}
                          onChange={e => set('instagram_url', e.target.value)}
                          placeholder="@yourusername or https://instagram.com/..." />
                        <label className={styles.optionalToggle}>
                          <input type="checkbox" checked={skipInsta}
                            onChange={e => { setSkipInsta(e.target.checked); if (e.target.checked) set('instagram_url', '') }} />
                          I don't use Instagram
                        </label>
                      </>
                    )}
                  </Field>
                  <Field label="Facebook">
                    {skipFacebook ? (
                      <div className={styles.skippedNote}>
                        <span>Not using Facebook.</span>
                        <button className={styles.linkBtn} onClick={() => setSkipFacebook(false)}>Add anyway</button>
                      </div>
                    ) : (
                      <>
                        <input className={styles.input} value={form.facebook_url}
                          onChange={e => set('facebook_url', e.target.value)}
                          placeholder="https://facebook.com/youragentpage" type="url" />
                        <label className={styles.optionalToggle}>
                          <input type="checkbox" checked={skipFacebook}
                            onChange={e => { setSkipFacebook(e.target.checked); if (e.target.checked) set('facebook_url', '') }} />
                          I don't use Facebook
                        </label>
                      </>
                    )}
                  </Field>
                  <Field label="LinkedIn">
                    <input className={styles.input} value={form.linkedin_url}
                      onChange={e => set('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile" type="url" />
                  </Field>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.footerActions}>
                <span className={styles.scoreLabel}>
                  Profile score: <strong style={{ color: score === 100 ? '#34C759' : 'var(--accent)' }}>{score}%</strong>
                </span>
                <button
                  className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
                  onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {hint && <p className={styles.fieldHint}>{hint}</p>}
      {children}
    </div>
  )
}
