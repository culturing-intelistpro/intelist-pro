// AgentProfileModal.jsx — Agent Personalization Profile
// Follows DESIGN.md tokens; never break existing functionality.
import { useState, useEffect, useCallback } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from './supabase'
import styles from './AgentProfileModal.module.css'

// ─── Personalization scoring ─────────────────────────────────────────────────
const CHECKLIST = [
  { key: 'name',           label: '이름 & 연락처',   pts: 20, required: true,  hint: 'full_name과 phone 모두 입력 시' },
  { key: 'brokerage',      label: '소속 회사',        pts: 10, required: false, hint: 'brokerage 입력 시' },
  { key: 'brand_color',    label: '브랜드 색상',      pts: 10, required: false, hint: '브랜드 컬러 설정 시' },
  { key: 'logo_url',       label: '로고',             pts: 15, required: false, hint: '로고 URL 입력 시' },
  { key: 'agent_photo_url',label: '프로필 사진',      pts: 10, required: false, hint: '사진 URL 입력 시' },
  { key: 'writing_style',  label: '라이팅 샘플',      pts: 20, required: false, hint: '이전 리스팅 샘플 입력 시' },
  { key: 'copy_tone',      label: '카피 톤 선호',     pts: 10, required: false, hint: '톤 선택 시' },
  { key: 'specialties',    label: '전문 분야',         pts:  5, required: false, hint: '전문 분야 입력 시' },
]

function calcScore(form) {
  let total = 0
  CHECKLIST.forEach(({ key, pts }) => {
    if (key === 'name') {
      if ((form.full_name || '').trim() && (form.phone || '').trim()) total += pts
    } else {
      if ((form[key] || '').trim()) total += pts
    }
  })
  return Math.min(total, 100)
}

function isChecked(key, form) {
  if (key === 'name') return !!(form.full_name?.trim() && form.phone?.trim())
  return !!(form[key] || '').trim()
}

// SVG ring progress
function RingProgress({ score }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score === 100 ? '#34C759' : score >= 60 ? '#0071E3' : score >= 20 ? '#FFB800' : '#D2D2D7'
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className={styles.ring}>
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-light)" strokeWidth="6" />
      <circle
        cx="48" cy="48" r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
      />
      <text x="48" y="52" textAnchor="middle" fontSize="18" fontWeight="700"
        fill={score === 100 ? '#34C759' : 'var(--text-1)'} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {score}%
      </text>
    </svg>
  )
}

const TABS = ['기본 정보', '브랜드', '마케팅 스타일', '연락처']

const TONES = [
  { value: 'professional', label: '전문적', desc: '신뢰감 있고 격식체' },
  { value: 'warm',         label: '친근한', desc: '따뜻하고 접근하기 쉬운' },
  { value: 'luxury',       label: '럭셔리', desc: '고급스럽고 프리미엄' },
  { value: 'energetic',    label: '활기찬', desc: '역동적이고 설득력 있는' },
]

export default function AgentProfileModal({ user, initialProfile, onClose, onSave }) {
  const [tab,    setTab]    = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const [form, setForm] = useState({
    full_name:       '',
    phone:           '',
    brokerage:       '',
    brand_color:     '#0071E3',
    logo_url:        '',
    agent_photo_url: '',
    website_url:     '',
    instagram_url:   '',
    facebook_url:    '',
    linkedin_url:    '',
    writing_style:   '',
    copy_tone:       '',
    specialties:     '',
    certifications:  '',
    tagline:         '',
  })

  // Pre-fill from initialProfile + user metadata
  useEffect(() => {
    if (initialProfile || user) {
      setForm(prev => ({
        ...prev,
        full_name:       initialProfile?.full_name       || user?.user_metadata?.full_name || '',
        phone:           initialProfile?.phone           || '',
        brokerage:       initialProfile?.brokerage       || '',
        brand_color:     initialProfile?.brand_color     || '#0071E3',
        logo_url:        initialProfile?.logo_url        || '',
        agent_photo_url: initialProfile?.agent_photo_url || '',
        website_url:     initialProfile?.website_url     || '',
        instagram_url:   initialProfile?.instagram_url   || '',
        facebook_url:    initialProfile?.facebook_url    || '',
        linkedin_url:    initialProfile?.linkedin_url    || '',
        writing_style:   initialProfile?.writing_style   || '',
        copy_tone:       initialProfile?.copy_tone       || '',
        specialties:     initialProfile?.specialties     || '',
        certifications:  initialProfile?.certifications  || '',
        tagline:         initialProfile?.tagline         || '',
      }))
    }
  }, [initialProfile, user])

  const set = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), [])

  const score = calcScore(form)

  const save = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase.from('profiles').upsert({
        id:              user.id,
        full_name:       form.full_name.trim()       || null,
        phone:           form.phone.trim()           || null,
        brokerage:       form.brokerage.trim()       || null,
        brand_color:     form.brand_color            || null,
        logo_url:        form.logo_url.trim()        || null,
        agent_photo_url: form.agent_photo_url.trim() || null,
        website_url:     form.website_url.trim()     || null,
        instagram_url:   form.instagram_url.trim()   || null,
        facebook_url:    form.facebook_url.trim()    || null,
        linkedin_url:    form.linkedin_url.trim()    || null,
        writing_style:   form.writing_style.trim()   || null,
        copy_tone:       form.copy_tone              || null,
        specialties:     form.specialties.trim()     || null,
        certifications:  form.certifications.trim()  || null,
        tagline:         form.tagline.trim()         || null,
      })
      if (err) throw err
      setSaved(true)
      onSave?.({ ...form })
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error('[Intelist Pro] Profile save error:', e)
      setError('저장 실패. 잠시 후 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const headlineForScore = () => {
    if (score === 100) return '🎉 개인화 완성! 최고 품질 마케팅 자료 준비됨'
    if (score >= 80)  return '거의 다 왔어요 — 마지막 단계입니다'
    if (score >= 60)  return '잘 진행 중! 특징이 반영됩니다'
    if (score >= 20)  return '기본 카피 생성 가능 상태입니다'
    return '이름과 연락처를 먼저 입력해주세요'
  }

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="에이전트 프로필 설정">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>에이전트 프로필</h2>
            <p className={styles.headerSub}>입력할수록 카피 품질과 마케팅 자료 완성도가 높아집니다</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className={styles.body}>

          {/* Left — score panel */}
          <aside className={styles.scorePanel}>
            <RingProgress score={score} />
            <p className={styles.scoreHeadline}>{headlineForScore()}</p>

            <ul className={styles.checklist}>
              {CHECKLIST.map(({ key, label, pts, required }) => {
                const checked = isChecked(key, form)
                return (
                  <li key={key} className={`${styles.checkItem} ${checked ? styles.checkItemDone : ''}`}>
                    <span className={`${styles.checkBox} ${checked ? styles.checkBoxDone : ''}`}>
                      {checked && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span className={styles.checkLabel}>
                      {label}
                      {required && <span className={styles.required}> 필수</span>}
                    </span>
                    <span className={styles.checkPts}>+{pts}%</span>
                  </li>
                )
              })}
            </ul>

            {score === 100 && (
              <div className={styles.achieveBadge}>🎉 개인화 100% 달성</div>
            )}
          </aside>

          {/* Right — form */}
          <div className={styles.formPanel}>
            {/* Tabs */}
            <div className={styles.tabs}>
              {TABS.map((t, i) => (
                <button
                  key={t}
                  className={`${styles.tab} ${tab === i ? styles.tabActive : ''}`}
                  onClick={() => setTab(i)}
                >{t}</button>
              ))}
            </div>

            <div className={styles.tabContent}>

              {/* Tab 0: 기본 정보 */}
              {tab === 0 && (
                <div className={styles.fields}>
                  <Field label="이름" hint="카피에 서명자 이름으로 사용됩니다">
                    <input className={styles.input} value={form.full_name}
                      onChange={e => set('full_name', e.target.value)}
                      placeholder="홍길동" autoComplete="name" />
                  </Field>
                  <Field label="연락처" hint="고객 문의 전화번호">
                    <input className={styles.input} value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="010-0000-0000" type="tel" autoComplete="tel" />
                  </Field>
                  <Field label="소속 회사 / 브로커리지" hint="리스팅 카피 하단에 표시됩니다">
                    <input className={styles.input} value={form.brokerage}
                      onChange={e => set('brokerage', e.target.value)}
                      placeholder="ABC Realty" />
                  </Field>
                  <Field label="태그라인 (선택)" hint="나만의 한줄 슬로건">
                    <input className={styles.input} value={form.tagline}
                      onChange={e => set('tagline', e.target.value)}
                      placeholder="Northern Virginia를 가장 잘 아는 에이전트" />
                  </Field>
                </div>
              )}

              {/* Tab 1: 브랜드 */}
              {tab === 1 && (
                <div className={styles.fields}>
                  <Field label="브랜드 색상" hint="마케팅 자료의 메인 컬러">
                    <div className={styles.colorRow}>
                      <input type="color" className={styles.colorSwatch}
                        value={form.brand_color}
                        onChange={e => set('brand_color', e.target.value)} />
                      <input className={styles.input} value={form.brand_color}
                        onChange={e => set('brand_color', e.target.value)}
                        placeholder="#0071E3" style={{ flex: 1 }} />
                    </div>
                  </Field>
                  <Field label="로고 URL" hint="PNG/SVG 이미지 링크 (공개 URL)">
                    <input className={styles.input} value={form.logo_url}
                      onChange={e => set('logo_url', e.target.value)}
                      placeholder="https://..." type="url" />
                    {form.logo_url && (
                      <div className={styles.preview}>
                        <img src={form.logo_url} alt="로고 미리보기" onError={e => e.target.style.display='none'} />
                      </div>
                    )}
                  </Field>
                  <Field label="프로필 사진 URL" hint="브로셔/SNS 자료에 사용됩니다">
                    <input className={styles.input} value={form.agent_photo_url}
                      onChange={e => set('agent_photo_url', e.target.value)}
                      placeholder="https://..." type="url" />
                    {form.agent_photo_url && (
                      <div className={styles.preview}>
                        <img src={form.agent_photo_url} alt="프로필 사진 미리보기"
                          style={{ borderRadius: '50%', width: 80, height: 80, objectFit: 'cover' }}
                          onError={e => e.target.style.display='none'} />
                      </div>
                    )}
                  </Field>
                </div>
              )}

              {/* Tab 2: 마케팅 스타일 */}
              {tab === 2 && (
                <div className={styles.fields}>
                  <Field label="카피 톤 선호" hint="AI가 글쓰기 스타일을 조정합니다">
                    <div className={styles.toneGrid}>
                      {TONES.map(({ value, label, desc }) => (
                        <button key={value}
                          className={`${styles.toneBtn} ${form.copy_tone === value ? styles.toneBtnActive : ''}`}
                          onClick={() => set('copy_tone', form.copy_tone === value ? '' : value)}>
                          <span className={styles.toneName}>{label}</span>
                          <span className={styles.toneDesc}>{desc}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="이전 리스팅 샘플" hint="내 스타일을 AI에게 학습시킵니다. 실제 작성한 MLS 카피를 붙여넣으세요.">
                    <textarea className={`${styles.input} ${styles.textarea}`}
                      value={form.writing_style}
                      onChange={e => set('writing_style', e.target.value)}
                      placeholder="Beautiful 4BR/3BA single-family home nestled in the heart of Reston…&#10;&#10;여러 개도 OK — 구분은 빈 줄로 해주세요."
                      rows={6} />
                  </Field>
                  <Field label="전문 분야" hint="카피 맥락 설정에 사용됩니다">
                    <input className={styles.input} value={form.specialties}
                      onChange={e => set('specialties', e.target.value)}
                      placeholder="첫 주택 구매자, 럭셔리 주택, 이주 지원" />
                  </Field>
                  <Field label="자격증 & 인증" hint="신뢰도 표시에 사용됩니다">
                    <input className={styles.input} value={form.certifications}
                      onChange={e => set('certifications', e.target.value)}
                      placeholder="ABR, CRS, GRI, e-PRO" />
                  </Field>
                </div>
              )}

              {/* Tab 3: 연락처 */}
              {tab === 3 && (
                <div className={styles.fields}>
                  <Field label="이메일" hint="계정 이메일 (변경 불가)">
                    <input className={`${styles.input} ${styles.inputDisabled}`}
                      value={user?.email || ''} readOnly />
                  </Field>
                  <Field label="웹사이트" hint="https://로 시작하는 본인 사이트">
                    <input className={styles.input} value={form.website_url}
                      onChange={e => set('website_url', e.target.value)}
                      placeholder="https://youragentsite.com" type="url" />
                  </Field>
                  <Field label="Instagram">
                    <input className={styles.input} value={form.instagram_url}
                      onChange={e => set('instagram_url', e.target.value)}
                      placeholder="@yourusername 또는 https://instagram.com/..." />
                  </Field>
                  <Field label="Facebook">
                    <input className={styles.input} value={form.facebook_url}
                      onChange={e => set('facebook_url', e.target.value)}
                      placeholder="https://facebook.com/..." type="url" />
                  </Field>
                  <Field label="LinkedIn">
                    <input className={styles.input} value={form.linkedin_url}
                      onChange={e => set('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/..." type="url" />
                  </Field>
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────── */}
            <div className={styles.footer}>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.footerActions}>
                <span className={styles.scoreLabel}>
                  개인화 점수: <strong style={{ color: score === 100 ? '#34C759' : 'var(--accent)' }}>{score}%</strong>
                </span>
                <button
                  className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? '저장 중…' : saved ? '✓ 저장됨' : '프로필 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helper: labeled field wrapper ─────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {hint && <p className={styles.fieldHint}>{hint}</p>}
      {children}
    </div>
  )
}
