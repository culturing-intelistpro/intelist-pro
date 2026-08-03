import { useState, useRef, useEffect, useCallback } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { MapPin, PenLine, Mic, Image, FileText, Upload, X, Plus, ArrowRight } from 'lucide-react'
import styles from './App.module.css'
import schoolsData from './data/schools.json'
import communitiesData from './data/communities.json'
import { supabase } from './supabase'
import AuthModal from './AuthModal'
import masterPromptRules from './masterPromptRules'

// ─── Listing metadata helpers ──────────────────────────────────────────────────
function detectTier(addr) {
  if (/mclean|great.?falls|vienna|oakton|country.?club|old.?town.*waterfront|falls.?church.?city/i.test(addr)) return 'TIER1'
  if (/clarendon|ballston|rosslyn|pentagon.?city|del.?ray|cameron.?station|reston.*town.?center/i.test(addr)) return 'TIER2'
  if (/reston|herndon|fairfax|burke|centreville|chantilly|ashburn|sterling|leesburg|south.?riding|brambleton|aldie|broadlands|one.?loudoun/i.test(addr)) return 'TIER3'
  if (/springfield|lorton|annandale|manassas|woodbridge|dale.?city|lake.?ridge|gainesville|haymarket|bristow|nokesville/i.test(addr)) return 'TIER4'
  if (/triangle|dumfries|stafford|fredericksburg/i.test(addr)) return 'TIER5'
  return null
}
function detectPropertyType(text) {
  if (/condo|condominium/i.test(text)) return 'Condo'
  if (/townhouse|townhome/i.test(text)) return 'Townhouse'
  if (/single.?family|sfh/i.test(text)) return 'Single Family'
  return null
}
function detectPriceRange(text) {
  const matches = (text || '').match(/\$\s*([\d,]+)/g) || []
  const prices = matches.map(m => parseInt(m.replace(/[$,\s]/g, ''))).filter(p => p > 50000)
  if (!prices.length) return null
  const p = Math.max(...prices)
  if (p < 300000) return '<$300K'
  if (p < 500000) return '$300K–$500K'
  if (p < 700000) return '$500K–$700K'
  if (p < 900000) return '$700K–$900K'
  if (p < 1500000) return '$900K–$1.5M'
  return '$1.5M+'
}

// ─── Price override: price sets tone floor, location identity is always preserved ─
function applyPriceOverride(locationTier, priceRange) {
  if (!locationTier) return locationTier
  const rank     = { TIER1: 1, TIER2: 2, TIER3: 3, TIER4: 4, TIER5: 5 }
  const fromRank = ['', 'TIER1', 'TIER2', 'TIER3', 'TIER4', 'TIER5']
  const loc = rank[locationTier] ?? 3
  let floor = loc
  if (priceRange === '$1.5M+')     floor = 1      // ≥$1.5M → Tier 1 Luxury min
  else if (priceRange === '$900K–$1.5M') floor = 2  // $900K–$1.5M → Tier 2 Premium min
  else if (priceRange === '$700K–$900K') floor = 3  // $700K–$900K → Tier 3 Quality min
  // <$700K → no override; Region default (AXIS 1) applies
  return fromRank[Math.min(loc, floor)]
}

// ─── Haversine distance (miles) ────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Filter Places API results to those within maxMiles of origin
function filterByDistance(results, originLat, originLng, maxMiles) {
  return results
    .map((r) => ({
      ...r,
      _miles: haversine(originLat, originLng,
        r.geometry.location.lat(), r.geometry.location.lng()),
    }))
    .filter((r) => r._miles <= maxMiles)
    .sort((a, b) => a._miles - b._miles)
}

// Google Maps is loaded synchronously via index.html <script> tag

// ─── Lookups ───────────────────────────────────────────────────────────────────
function lookupByAddress(data, address) {
  if (!address) return null
  const keys = Object.keys(data).sort((a, b) => b.length - a.length)
  const matched = keys.find((k) => new RegExp(`\\b${k}\\b`, 'i').test(address))
  return matched ? { city: matched, ...data[matched] } : null
}

const getSchoolInfo    = (addr) => lookupByAddress(schoolsData, addr)
const getCommunityInfo = (addr) => lookupByAddress(communitiesData, addr)

// ─── Prompt builders ───────────────────────────────────────────────────────────
function buildSchoolBlock(school) {
  if (!school) return ''
  const { phrase, highlight, schools } = school
  const named = Object.entries(schools)
    .filter(([, v]) => v !== 'varies by location')
    .map(([lvl, name]) => `${lvl.charAt(0).toUpperCase() + lvl.slice(1)}: ${name}`)
    .join(', ')
  if (highlight) {
    return `School district: This property is ${phrase}${named ? ` (${named})` : ''}. Emphasize the school district as a key selling point in all three descriptions.`
  }
  return `School district: ${phrase}${named ? ` (${named})` : ''}. Mention school name(s) briefly; do not emphasize.`
}

function buildCommunityBlock(community) {
  if (!community) return ''
  const { city, character, highlights, commute, metro } = community
  return [
    `Community context — ${city}: ${character}.`,
    highlights?.length ? `Key selling points: ${highlights.slice(0, 4).join('; ')}.` : '',
    commute ? `Commute profile: ${commute}.` : '',
    metro   ? `Transit access: ${metro}.`    : '',
  ].filter(Boolean).join('\n')
}

// ─── Speech recognition ────────────────────────────────────────────────────────
function useSpeechRecognition(onTranscript) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const cbRef  = useRef(onTranscript)
  cbRef.current = onTranscript

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const toggle = useCallback(() => {
    if (!supported) return
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    r.onresult = (e) => cbRef.current(Array.from(e.results).map((x) => x[0].transcript).join(''))
    r.onend  = () => setListening(false)
    r.onerror = () => setListening(false)
    recRef.current = r
    r.start()
    setListening(true)
  }, [listening, supported])

  return { listening, toggle, supported }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Resize + compress an image File to max 800px, JPEG quality 0.7
function compressImage(file, maxPx = 800, quality = 0.7) {
  console.log('compressing:', file.name, file.size, file.type)
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx }
        else                 { width  = Math.round(width  * maxPx / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
    }
    img.onerror = () => {
      console.log('compression failed:', file.name)
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

function parseResults(text) {
  return {
    address:   text.match(/\[ADDRESS\]([\s\S]*?)(?=\[MLS DESCRIPTION\]|$)/)?.[1]?.trim() ?? '',
    mls:       text.match(/\[MLS DESCRIPTION\]([\s\S]*?)(?=\[ZILLOW · WHAT'S SPECIAL\]|$)/)?.[1]?.trim() ?? '',
    marketing: text.match(/\[ZILLOW · WHAT'S SPECIAL\]([\s\S]*?)(?=\[INSTAGRAM CAPTION\]|$)/)?.[1]?.trim() ?? '',
    social:    text.match(/\[INSTAGRAM CAPTION\]([\s\S]*?)$/)?.[1]?.trim() ?? '',
  }
}

// ─── Revise All input ──────────────────────────────────────────────────────────
const REVISE_ALL_PHS = [
  "Revise all three… (e.g. 'Make everything more concise')",
  "Revise all three… (e.g. 'Remove school info from all')",
  "Revise all three… (e.g. 'Make the tone more luxury')",
]

function ReviseAllInput({ value, onChange, onRevise, revising }) {
  const [phIdx, setPhIdx]       = useState(0)
  const [phVisible, setPhVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setPhVisible(false)
      setTimeout(() => { setPhIdx((i) => (i + 1) % REVISE_ALL_PHS.length); setPhVisible(true) }, 400)
    }, 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.reviseAllWrap}>
      <div className={styles.reviseAllInputWrap}>
        <input
          className={styles.reviseAllInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onRevise() }}
          disabled={revising}
          placeholder=""
        />
        {!value && (
          <span className={styles.reviseAllPh} style={{ opacity: phVisible ? 1 : 0 }}>
            {REVISE_ALL_PHS[phIdx]}
          </span>
        )}
      </div>
      <button
        className={styles.reviseAllBtn}
        onClick={onRevise}
        disabled={revising || !value.trim()}
      >
        {revising ? 'Revising…' : 'Revise All'}
      </button>
    </div>
  )
}

// ─── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy', className, onCopy }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch {
      const el = document.createElement('textarea')
      el.value = text; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    onCopy?.()
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }
  return (
    <button
      className={`${styles.copyBtn} ${done ? styles.copyDone : ''} ${className ?? ''}`}
      onClick={copy}
    >
      {done ? 'Copied' : label}
    </button>
  )
}

// ─── Relative time ─────────────────────────────────────────────────────────────
function useRelativeTime(timestamp) {
  const [label, setLabel] = useState('just now')
  useEffect(() => {
    const update = () => {
      const s = Math.floor((Date.now() - timestamp.getTime()) / 1000)
      if (s < 60)        setLabel('just now')
      else if (s < 3600) setLabel(`${Math.floor(s / 60)} minute${Math.floor(s / 60) > 1 ? 's' : ''} ago`)
      else if (s < 86400) setLabel(`${Math.floor(s / 3600)} hour${Math.floor(s / 3600) > 1 ? 's' : ''} ago`)
      else               setLabel(`${Math.floor(s / 86400)} day${Math.floor(s / 86400) > 1 ? 's' : ''} ago`)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [timestamp])
  return label
}

// ─── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ tag, sublabel, content, apiKey, onChange, listingId, sectionKey, initialVerb = 'Generated', revisingAll = false }) {
  const [text, setText]                   = useState(content)
  const [original]                        = useState(content)
  const [isEditing, setIsEditing]         = useState(false)
  const [editDraft, setEditDraft]         = useState(content)
  const [reviseInput, setReviseInput]     = useState('')
  const [phIndex, setPhIndex]             = useState(0)
  const [phVisible, setPhVisible]         = useState(true)

  const PLACEHOLDERS = [
    'Make it shorter and punchier…',
    'Make the opening stronger…',
    'Tone it down, less salesy…',
    'Add more neighborhood feel…',
  ]

  useEffect(() => {
    const id = setInterval(() => {
      setPhVisible(false)
      setTimeout(() => {
        setPhIndex((i) => (i + 1) % PLACEHOLDERS.length)
        setPhVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line
  const [isRevising, setIsRevising]       = useState(false)
  const [timestamp, setTimestamp]         = useState(new Date())
  const [timestampVerb, setTimestampVerb] = useState(initialVerb)
  const relativeTime = useRelativeTime(timestamp)

  const isModified = text !== original

  const commitText = (newText, verb) => {
    setText(newText)
    onChange?.(newText)
    setTimestamp(new Date())
    setTimestampVerb(verb)
  }

  const saveEdit = async () => {
    commitText(editDraft, 'Revised')
    setIsEditing(false)
    if (listingId) {
      const { data } = await supabase.from('listings').select('edit_count').eq('id', listingId).single()
      supabase.from('listings').update({ edit_count: (data?.edit_count || 0) + 1 }).eq('id', listingId)
    }
  }

  const undo = () => commitText(original, 'Restored')

  const revise = async () => {
    if (!reviseInput.trim() || !apiKey) return
    setIsRevising(true)
    const prompt = reviseInput
    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
      const msg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: `${masterPromptRules}\n\n---\nYou are now REVISING an existing section.\nDo not regenerate from scratch.\n\nORIGINAL TEXT TO REVISE:\n${text}\n\nREVISION REQUEST: ${prompt}\n\nApply the revision request while strictly following ALL rules in the master prompt above.\nThe tier, tone, and compliance rules cannot be changed by the revision request.${sectionKey === 'instagram' ? '\nHashtags (5-7) must always be included. Never remove hashtags when revising Instagram caption.' : ''}\nOutput only the revised section in English.`,
        }],
      })
      commitText(msg.content[0]?.text?.trim() ?? text, 'Revised')
      setReviseInput('')
      if (listingId) {
        const { data } = await supabase.from('listings').select('ai_revise_count, revise_prompts').eq('id', listingId).single()
        supabase.from('listings').update({
          ai_revise_count: (data?.ai_revise_count || 0) + 1,
          revise_prompts: [...(data?.revise_prompts || []), prompt],
        }).eq('id', listingId)
      }
    } catch (err) {
      console.error('[Intelist Pro] Revise error:', err)
    } finally {
      setIsRevising(false)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <span className={styles.cardTag}>{tag}</span>
          <p className={styles.cardSub}>{sublabel}</p>
        </div>
        <CopyButton text={text} onCopy={async () => {
          if (listingId && sectionKey) {
            const { data } = await supabase.from('listings').select('sections_copied').eq('id', listingId).single()
            supabase.from('listings').update({ sections_copied: [...(data?.sections_copied || []), sectionKey] }).eq('id', listingId)
          }
        }} />
      </div>

      {isEditing ? (
        <textarea
          className={styles.cardEditArea}
          value={editDraft}
          onChange={(e) => {
            setEditDraft(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onFocus={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          autoFocus
        />
      ) : (isRevising || revisingAll) ? (
        <p className={styles.revisingText}>Revising…</p>
      ) : (
        <p className={styles.cardText}>{text}</p>
      )}

      {isEditing ? (
        <div className={styles.editActions}>
          <button className={styles.saveBtn} onClick={saveEdit}>Save</button>
          <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div className={styles.cardBottom}>
          {/* Row 1: Edit button */}
          <div className={styles.cardBottomRow}>
            <button
              className={styles.editTextBtn}
              onClick={() => { setEditDraft(text); setIsEditing(true) }}
            >
              <PenLine size={14} />
              Edit
            </button>
            {isModified && (
              <button className={styles.undoBtn} onClick={undo}>Undo</button>
            )}
          </div>
          {/* Row 2: AI revise */}
          <div className={styles.reviseRow}>
            <div className={styles.reviseInputWrap}>
              <input
                className={styles.reviseInput}
                value={reviseInput}
                onChange={(e) => setReviseInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') revise() }}
                placeholder=""
                disabled={isRevising}
              />
              {!reviseInput && (
                <span
                  className={styles.revisePh}
                  style={{ opacity: phVisible ? 1 : 0 }}
                >
                  {PLACEHOLDERS[phIndex]}
                </span>
              )}
            </div>
            <button
              className={styles.reviseBtn}
              onClick={revise}
              disabled={isRevising || !reviseInput.trim()}
            >
              Revise
            </button>
          </div>
          {/* Timestamp */}
          <p className={styles.cardTimestamp}>{timestampVerb} {relativeTime}</p>
        </div>
      )}
    </div>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]                   = useState(null)
  const [authChecked, setAuthChecked]     = useState(false)
  const [showAuth, setShowAuth]           = useState(false)

  // Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    reset()
  }

  const [address, setAddress]             = useState('')
  const [notes, setNotes]                 = useState('')
  const [transcript, setTranscript]       = useState('')
  const [prevListing, setPrevListing]     = useState('')
  const [images, setImages]               = useState([])
  const [photoDragging, setPhotoDragging] = useState(false)
  const [loading, setLoading]             = useState(false)
  const [loadingStep, setLoadingStep]     = useState('') // 'zillow'|'generating'
  const [zillowData, setZillowData]       = useState(null)
  const [results, setResults]             = useState(null)
  const [error, setError]                 = useState(null)
  const [activePanel, setActivePanel]     = useState(null) // 'notes'|'record'|'photos'|'style'|null
  const [styleFiles, setStyleFiles]       = useState([])
  const [styleDragging, setStyleDragging] = useState(false)
  const [shake, setShake]                 = useState(false)
  const [listingId, setListingId]         = useState(null)
  const [toast, setToast]                 = useState('')
  const [suggestions, setSuggestions]     = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [reviseAllInput, setReviseAllInput]   = useState('')
  const [revisingAll,    setRevisingAll]       = useState(false)
  const [reviseAllCount, setReviseAllCount]   = useState(0)

  const fileInputRef         = useRef(null)
  const styleFileInputRef    = useRef(null)
  const suggestDebounceRef   = useRef(null)
  const suggestAbortRef      = useRef(null)
  const generateAbortRef     = useRef(null)
  const sessionStartRef      = useRef(Date.now())
  const generationTimeRef    = useRef(null)
  const listingIdRef         = useRef(null)
  const imagesRef         = useRef([])   // always-current images count for addFiles closure
  const showToastRef      = useRef(null) // stable ref to showToast for use inside useCallback

  // Keep imagesRef in sync
  useEffect(() => { imagesRef.current = images }, [images])

  // Keep listingIdRef in sync for beforeunload
  useEffect(() => { listingIdRef.current = listingId }, [listingId])

  // Session end tracking (best-effort)
  useEffect(() => {
    const handleUnload = () => {
      if (!listingIdRef.current || !generationTimeRef.current) return
      supabase.from('listings').update({
        session_end: new Date().toISOString(),
        time_to_exit_after_generation: Date.now() - generationTimeRef.current,
      }).eq('id', listingIdRef.current)
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }
  showToastRef.current = showToast

  const fetchSuggestions = (value) => {
    clearTimeout(suggestDebounceRef.current)
    if (!value.trim() || value.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    suggestDebounceRef.current = setTimeout(async () => {
      suggestAbortRef.current?.abort()
      const controller = new AbortController()
      suggestAbortRef.current = controller
      try {
        const res = await fetch('/api/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'suggestions.placePrediction.text',
          },
          body: JSON.stringify({ input: value, includedRegionCodes: ['us'], languageCode: 'en' }),
          signal: controller.signal,
        })
        const data = await res.json()
        console.log('full API response:', JSON.stringify(data))
        console.log('status:', res.status)
        const seen = new Set()
        const list = (data.suggestions || [])
          .map((s) => s.placePrediction?.text?.text)
          .filter((desc) => {
            if (!desc || seen.has(desc)) return false
            seen.add(desc)
            return true
          })
        console.log('suggestions set:', list)
        setSuggestions(list)
        setShowSuggestions(list.length > 0)
        setHighlightedIndex(-1)
      } catch (err) {
        if (err.name !== 'AbortError') setSuggestions([])
      }
    }, 150)
  }

  const pickSuggestion = (text) => {
    setAddress(text)
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightedIndex(-1)
  }

  const { listening, toggle: toggleMic, supported: micSupported } =
    useSpeechRecognition(useCallback((t) => setTranscript(t), []))

  // Toggle panel — one open at a time; data persists when closed
  const togglePanel = (name) => {
    if (name === 'record') { toggleMic() }
    setActivePanel((cur) => cur === name ? null : name)
  }

  const showTranscript = listening || transcript.trim().length > 0

  // ── Style file handling ─────────────────────────────────────────────────────
  const addStyleFiles = useCallback(async (files) => {
    const exts = ['.txt', '.rtf', '.pdf', '.docx']
    const valid = Array.from(files).filter((f) =>
      exts.some((ext) => f.name.toLowerCase().endsWith(ext))
    )
    const processed = await Promise.all(valid.map(async (file) => {
      const name  = file.name
      const lower = name.toLowerCase()

      if (lower.endsWith('.txt') || lower.endsWith('.rtf')) {
        const text = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej
          r.readAsText(file)
        })
        return { name, text, base64: null, mediaType: null }
      }
      if (lower.endsWith('.pdf')) {
        const base64 = await fileToBase64(file)
        return { name, text: null, base64, mediaType: 'application/pdf' }
      }
      if (lower.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer()
        const { value: text } = await mammoth.extractRawText({ arrayBuffer })
        return { name, text, base64: null, mediaType: null }
      }
      return null
    }))
    setStyleFiles((prev) => [...prev, ...processed.filter(Boolean)])
  }, [])

  const removeStyleFile = (i) => setStyleFiles((prev) => prev.filter((_, idx) => idx !== i))

  // ── Photo handling ──────────────────────────────────────────────────────────
  const MAX_PHOTO_UPLOAD = 10 // max photos (images only); PDFs are unlimited

  const addFiles = useCallback(async (files) => {
    console.log('files received:', files.length, Array.from(files).map(f => f.name))

    const SIZE_LIMIT = 50 * 1024 * 1024 // 50MB

    const validImages = Array.from(files).filter(
      (f) => f.type.startsWith('image/') && f.size < SIZE_LIMIT
    )
    console.log('validImages after filter:', validImages.length)

    const validPDFs = Array.from(files).filter(
      (f) => f.type === 'application/pdf' && f.size < SIZE_LIMIT
    )

    // Check cap using ref (always-current, no stale closure)
    const currentPhotoCount = imagesRef.current.filter((img) => !img.isPDF).length
    const slotsLeft = Math.max(0, MAX_PHOTO_UPLOAD - currentPhotoCount)
    if (validImages.length > 0 && slotsLeft === 0) {
      showToastRef.current?.('Maximum 10 photos')
      return
    }
    if (validImages.length > slotsLeft) {
      showToastRef.current?.('Maximum 10 photos')
    }
    const imagesToProcess = validImages.slice(0, slotsLeft)

    const processedImages = (await Promise.all(
      imagesToProcess.map(async (file) => {
        try {
          const base64 = await compressImage(file)
          if (!base64) return null
          return { preview: URL.createObjectURL(file), base64, type: 'image/jpeg', name: file.name, isPDF: false }
        } catch { return null }
      })
    )).filter(Boolean)
    const processedPDFs = (await Promise.all(
      validPDFs.map(async (file) => {
        try {
          const base64 = await fileToBase64(file)
          if (!base64) return null
          return { preview: null, base64, type: 'application/pdf', name: file.name, isPDF: true }
        } catch { return null }
      })
    )).filter(Boolean)

    setImages((prev) => {
      // Double-check cap inside setState for safety (race condition guard)
      const photoCount = prev.filter((img) => !img.isPDF).length
      const slots = Math.max(0, MAX_PHOTO_UPLOAD - photoCount)
      return [...prev, ...processedImages.slice(0, slots), ...processedPDFs]
    })
  }, []) // eslint-disable-line

  const removeImage = (i) => {
    setImages((prev) => {
      if (!prev[i].isPDF && prev[i].preview) URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  useEffect(() => () => images.forEach((img) => { if (!img.isPDF && img.preview) URL.revokeObjectURL(img.preview) }), []) // eslint-disable-line

  // ── Fetch Zillow data via Claude web_search ─────────────────────────────────
  const fetchZillowData = async (addr, client, signal) => {
    try {
      const msg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search Zillow for this exact property address: "${addr}". Find and return ONLY a JSON object (no markdown, no explanation) with these fields:
{
  "beds": number or null,
  "baths": number or null,
  "sqft": number or null,
  "price": string or null,
  "propertyType": string or null,
  "yearBuilt": number or null,
  "lotSize": string or null,
  "hoa": string or null,
  "highlights": string or null,
  "existingDescription": string or null
}
Use only data found on Zillow. Set any unfound field to null.`,
        }],
      }, { signal })

      // Extract text from response (may be after tool_use blocks)
      const textBlock = msg.content.find((b) => b.type === 'text')
      if (!textBlock) return null

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null

      return JSON.parse(jsonMatch[0])
    } catch (err) {
      console.error('[Intelist Pro] Zillow fetch error:', err)
      console.error('[Intelist Pro] Zillow error details:', {
        message: err.message,
        status: err.status,
        error: err.error,
      })
      return null // Zillow fetch is best-effort; never block generation
    }
  }

  // ── Error message classifier ────────────────────────────────────────────────
  const classifyError = (err) => {
    if (err.name === 'AbortError') return null // cancelled — no message
    if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError'))
      return 'Connection failed. Check your internet and try again.'
    if (err.status === 529 || err.status === 503 || err.message?.includes('overloaded'))
      return 'Service temporarily unavailable. Please try again later.'
    if (err.status === 402 || err.message?.includes('credit') || err.message?.includes('quota'))
      return 'Service temporarily unavailable. Please try again later.'
    if (err.name === 'TimeoutError' || err.message?.includes('timeout'))
      return 'Taking too long. Please try again.'
    return 'Something went wrong. Please try again.'
  }

  const cancelGenerate = () => {
    generateAbortRef.current?.abort()
    setLoading(false)
    setLoadingStep('')
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!address.trim()) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }
    if (!user) {
      setShowAuth(true)
      return
    }
    const abortController = new AbortController()
    generateAbortRef.current = abortController

    setError(null)
    setResults(null)
    setZillowData(null)
    setLoading(true)
    setLoadingStep('zillow')
    sessionStartRef.current   = Date.now()
    generationTimeRef.current = null
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env')

      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

      // Step 1: Fetch Zillow data
      const zillow = await fetchZillowData(address, client, abortController.signal)
      setZillowData(zillow)
      setLoadingStep('generating')

      const schoolBlock    = buildSchoolBlock(getSchoolInfo(address))
      const communityBlock = buildCommunityBlock(getCommunityInfo(address))

      const combinedNotes = [notes.trim(), transcript.trim()].filter(Boolean).join('\n\n')

      const styleTextParts = [
        prevListing.trim(),
        ...styleFiles.filter((f) => f.text).map((f) => `[${f.name}]\n${f.text.trim()}`),
      ].filter(Boolean)
      const prevBlock = styleTextParts.length
        ? `\nAgent's previous listing sample(s) (use only to calibrate tone and writing style — do NOT copy facts or phrases):\n"""\n${styleTextParts.join('\n\n---\n\n')}\n"""`
        : ''

      // Build Zillow block
      const zillowBlock = zillow ? (() => {
        const lines = ['Property data from Zillow (verified — use these facts):']
        if (zillow.beds)                lines.push(`  Bedrooms: ${zillow.beds}`)
        if (zillow.baths)               lines.push(`  Bathrooms: ${zillow.baths}`)
        if (zillow.sqft)                lines.push(`  Square footage: ${zillow.sqft.toLocaleString()} sq ft`)
        if (zillow.propertyType)        lines.push(`  Property type: ${zillow.propertyType}`)
        if (zillow.yearBuilt)           lines.push(`  Year built: ${zillow.yearBuilt}`)
        if (zillow.lotSize)             lines.push(`  Lot size: ${zillow.lotSize}`)
        if (zillow.hoa)                 lines.push(`  HOA: ${zillow.hoa}`)
        if (zillow.price)               lines.push(`  List price: ${zillow.price}`)
        if (zillow.highlights)          lines.push(`  Key features: ${zillow.highlights}`)
        if (zillow.existingDescription) lines.push(`  Existing listing notes: ${zillow.existingDescription}`)
        return lines.join('\n')
      })() : ''

      const prompt = `You are an expert real estate copywriter specializing in Northern Virginia residential listings. You write under strict regulatory and stylistic constraints.

=== RULE PRIORITY ===
When rules conflict, follow this order:
1. Regulatory compliance and Fair Housing
2. Factual accuracy — never invent
3. Physical specificity and grounding
4. Tone calibration by tier
5. Stylistic refinement
Higher-priority rules always override lower ones.

First, normalize the property address to proper US real estate format (title case, correct comma placement, standard state abbreviation). Output this as [ADDRESS] section.

Property address: ${address}${combinedNotes ? `\nAgent notes: ${combinedNotes}` : ''}${(images.length) ? `\n${Math.min(images.filter(i=>!i.isPDF).length, 5)} photo(s) and ${images.filter(i=>i.isPDF).length} MLS/PDF file(s) attached.` : ''}${prevBlock /* agent style samples — if provided */}
${zillowBlock ? `\n${zillowBlock}` : ''}${/* Zillow data — if provided */''}
${schoolBlock ? `\n${schoolBlock}` : ''}${/* school data — if provided */''}
${communityBlock ? `\n${communityBlock}` : ''}${/* community data — if provided */''}

=== HOW TO USE ATTACHED FILES ===
MLS SHEET (image or PDF): Extract as verified facts — specs, schools, HOA, transportation, room details. These are the factual backbone.
PROPERTY PHOTOS: Use for atmosphere, mood, finish quality, natural light, design character. Sensory language and atmosphere only.
Exception: visually obvious structural observations (vaulted ceilings, hardwood flooring, open layout, exposed beams, oversized windows) may be noted when clearly visible in photos — but never with numeric claims or spec assumptions.
If only photos: atmosphere only, do not invent specs.
If only MLS sheet: facts only, describe features without inventing mood.
If both: combine for maximum depth and accuracy.
PDF text extraction failure: If a PDF cannot be read as text, treat it as an image and read visually. Do not mention extraction issues, and do not invent content that cannot be confirmed from the document.

=== DYNAMIC TONE SYSTEM ===
Every output is shaped by combining all three axes. Never apply only one axis — always integrate all three simultaneously.

AXIS 1 — REGIONAL FLAVOR (community identity — never changes):
McLean / Great Falls           → estate luxury, embassy corridor, architectural prestige, established privacy
Arlington / Alexandria         → urban professional, Metro-centric, walkable, transit and dining culture
Reston Town Center             → urban core, walkable, restaurant and retail lifestyle (treat as Arlington/Alexandria urban tier)
Reston (residential)           → nature-connected, trail culture, lake access, tech community
Reston classification rule: ZIP 20190 OR address contains "Town Center" → apply Reston Town Center (urban) flavor. ZIP 20191 or 20194 → apply Reston residential (nature) flavor. ZIP 20191 or 20194 + price ≥ $900K: apply Tier 2 Premium tone intensity (AXIS 2), but retain Reston residential (nature) flavor for community context — do NOT switch to Town Center urban flavor based on price alone.
Loudoun (Ashburn, Leesburg, South Riding, Brambleton, Aldie, Broadlands, One Loudoun)
                               → modern master-planned, tech corridor, Silver Line proximity, HOA trail networks
Sterling / Cascades / Lowes Island → established suburban, Potomac River proximity, Cascades golf course, Cascades Marketplace
Herndon / Fairfax / Burke / Centreville / Chantilly → suburban connected, tech corridor commuter, community character
Vienna / Oakton                    → established suburban prestige, top-rated schools, small-town character, Madison HS district
Springfield / Lorton / Annandale   → suburban practical, commuter access, established neighborhood feel
Gainesville / Haymarket            → newer construction, larger lots, I-66 corridor, growing community amenities
Woodbridge / Prince William County → space-oriented, commuter value, I-95/I-66/Route 28 access
Stafford / Fredericksburg          → VRE commuter corridor, value per square foot, growing community
(Regional identity is permanently fixed to the actual address — never borrowed from any other location.)

AXIS 2 — PRICE TONE INTENSITY (price sets the tone floor; when location-based default and price-based tier conflict, the more luxurious tier always wins. Tier 1 is the highest luxury, Tier 5 is the most practical):
$1.5M+       → Tier 1 Luxury:       elevated, understated. Architectural craft. Specs lead. Zero independent superlatives.
                                       Anchored adjectives only — ✓ "quartzite countertops provide an exceptional prep surface" / ✗ "stunning luxury retreat"
$900K–$1.5M  → Tier 2 Premium:      polished, aspirational. Quality materials and lifestyle. Confident and precise.
$700K–$900K  → Tier 3 Quality:      community-forward. Amenities, connectivity, lifestyle value. Warm but grounded.
$500K–$700K  → Tier 4 Space & Function: generous space, commuter value (I-95, I-66, Route 28). Highlight lot size, garage, recent updates.
                                       Never use: entry point, entry-level, value, price point, affordable — even when describing Space & Function tier homes.
<$500K       → Tier 5 Practical:    facts-first. No emotional inflation. Commute routes, VRE access, lot size, recent updates.
NEVER use in any tier: "value", "price point", "affordable", "entry-level" — even in Tier 4 and Tier 5. Describe space and updates factually without implying monetary value judgment.

PRICE-UNKNOWN FALLBACK — If price is not confirmed:
- McLean, Great Falls → Tier 1 Luxury default
- Arlington, Alexandria → Tier 2 Premium default
- Vienna, Oakton → Tier 2 Premium default
- All other areas → Tier 3 Quality default

AXIS 3 — PROPERTY TYPE FOCUS:
Priority rule: if price ≥ $1.5M, always apply Luxury Estate focus regardless of property type. Standard type focus applies only when price < $1.5M.
Single Family Home          → exterior, yard, privacy, garage. Use "private", "curb appeal", "fenced yard" naturally.
Townhouse                   → multi-level layout, HOA amenities, low-maintenance lifestyle.
Condo                       → urban access, building amenities, views. Use "lock-and-leave lifestyle", "building amenities."
Luxury Estate ($1.5M+ any property type):
  SFH        → architecture, materials, craftsmanship, outdoor living, spatial flow
  Townhouse  → multi-level luxury living, premium HOA features, architectural details
  Condo      → penthouse/premium unit features, building prestige, views
  Specs and materials drive every paragraph. Apply Anchored Luxury rule strictly.

AXIS WEIGHTING RULE:
Regional Flavor is the dominant axis — it defines the voice and community identity.
Price Tone modifies the expression level.
Property Type determines emphasis points.
When axes conflict: Regional Flavor > Price Tone > Property Type.

COMBINATION RULE — always apply all three axes together:
Example 1: Sterling Lowes Island $1.2M SFH
  Axis 1: Established Sterling suburban — Cascades golf course, Cascades Marketplace, master-planned trail networks, Potomac River proximity
  Axis 2: Tier 2 Premium — polished, aspirational, quality materials, confident and precise
  Axis 3: SFH — exterior, lot, privacy, garage
  ✓ Result: "upscale Sterling suburban" tone and language
  ✗ Never: "estate-caliber architectural masterpiece" or equestrian/embassy language [McLean/Great Falls]

Example 2: Woodbridge $850K Townhouse
  Axis 1: Space-oriented commuter — I-95 corridor, Prince William County
  Axis 2: Tier 2 Premium — polished, aspirational, quality materials, confident and precise
  Axis 3: Townhouse — HOA amenities, multi-level layout, low-maintenance lifestyle
  ✓ Result: "upscale Prince William" tone and language
  ✗ Never: Reston trail culture or nature-connected language

Example 3: Arlington $750K Condo
  Axis 1: Urban professional, Metro-centric, walkable, transit and dining culture
  Axis 2: Tier 3 Quality — community-forward, amenities and connectivity, warm but grounded
  Axis 3: Condo — urban access, lock-and-leave lifestyle, building amenities
  ✓ Result: transit-forward urban lifestyle language
  ✗ Never: suburban yard/privacy/curb-appeal language

COMMUNITY IDENTITY RULE — never borrow regional language from a different location:
✗ WRONG: Sterling $1.2M → "estate privacy...equestrian character..." [McLean/Great Falls language]
✓ RIGHT: Sterling $1.2M → Tier 2 Premium tone applied to Lowes Island: Cascades golf course, Cascades Marketplace, Potomac River proximity, master-planned trail networks
Even at $1.5M+, a Sterling address is written as Sterling — never as McLean.

=== SPECIAL ZONES ===
Note: Special Zones are AXIS 1 Regional Flavor accents and apply independently of AXIS 2 Tone Intensity. They are always reflected regardless of price tier.

Falls Church City (independent city, ZIP 22046) ➔ Always mention: "Falls Church City Schools — one of Virginia's top-rated independent school systems." Mention once in MLS DESCRIPTION. Reference naturally in ZILLOW if space allows. Do not force into Instagram. Do NOT confuse with general Falls Church (Fairfax County, ZIP 22041–22044), which falls under FCPS and does not carry independent city school status.
Old Town Alexandria ➔ Emphasize: historic character, waterfront, boutique walkability.
Loudoun Tech Corridor ➔ Emphasize: technology employment corridor, data center economy, master-planned amenities, regional connectivity.
Western Loudoun (Purcellville, Round Hill, Middleburg) ➔ Horse country, Blue Ridge views, rural Virginia lifestyle.
Fauquier County (Warrenton, Marshall, Bealeton) ➔ Equestrian lifestyle, rural character, historic small town.
Stafford/Fredericksburg ➔ VRE commuter access, value per square foot, growing community.

=== CONSTRUCTION ERA TONE ===
New construction (2015+): Emphasize open concept layout, energy efficiency, smart home features, new appliances, builder-grade premium finishes.
Relatively modern (2000–2014): Emphasize contemporary layout and flow. Explicitly note any confirmed updates (e.g., "kitchen updated in 2019"). Avoid assuming finishes are current.
Older construction (pre-2000): Emphasize established neighborhood character, mature trees, classic architecture. Name specific confirmed renovation items. Use "updated kitchen/bath" only for verified upgrades.

=== MY STYLE USAGE ===
If agent style samples are provided above, use them exclusively to calibrate writing style.

Learn and mirror ONLY:
- Sentence length
- Pacing
- Structural rhythm

NEVER imitate:
- Adjectives
- Emotional claims
- Factual positioning

Compliance rules and Fair Housing mandates always override agent style.

=== STORY STRUCTURE (ZILLOW · WHAT'S SPECIAL only) ===
Paragraph Architecture — strictly enforced:

Paragraph 1 (The Structure):
Physical home — interior spaces, layout, structural facts, materials, finishes.

Paragraph 2 (The Connection):
How layout connects with external elements — lot, light, orientation, direct neighborhood access.

Paragraph 3 (The Ongoing Value):
Permanent lifestyle utility delivered by the home's design and spaces. No fictional timelines.

(If property details are thin, shorten each section rather than inventing or padding content.)

=== PHYSICAL ANCHOR RULE ===
Every paragraph must contain at least one concrete physical anchor: material, structural element, lighting condition, spatial layout, architectural feature, or verified exterior feature.
Abstract emotional language without a physical anchor is forbidden.
Variation and natural rhythm are encouraged as long as higher-priority compliance rules remain satisfied. Avoid semantic repetition — do not restate the same feature using different synonyms across sections or paragraphs.

RULE — PROPERTY FIRST: Every section must open with a physical feature of the property itself: layout, material, lighting, architectural element, or verified exterior feature. Opening with neighborhood infrastructure (trails, metro, shopping) is forbidden.

RULE — GROUNDED SENTIMENT: Emotional language may only be used to explain the functional benefit of a physical material or structure mentioned in the same paragraph.
- Bad: "cozy evenings by the fire"
- Good: "the built-in shelving and fireplace create a natural retreat for reading or quiet evenings"

RULE — NO FICTIONAL TIMELINES: "A Tuesday evening here might look like…", "A Saturday morning starts with…" — completely forbidden. Focus only on ongoing, objective lifestyle value.
Paragraph 3 (The Ongoing Value) must also contain a physical anchor — reference the home's actual layout, design, or spatial feature when describing lifestyle utility. Abstract lifestyle language without a physical reference is forbidden even in Paragraph 3.

=== DATA INSUFFICIENCY RULES ===
Never guess or invent missing information. Omit any field that is not confirmed.
- Missing beds/baths/sqft/price: Start MLS with "[home type] in [community], [City], [State]." and include only confirmed specs.
- Missing community name: omit it entirely — use "[home type] in [City], [State]" only. Never invent community names.
- Missing school data: Omit schools entirely.
- Missing HOA data: Omit HOA entirely.

=== MLS DESCRIPTION RULES ===
MANDATORY FIRST SENTENCE — when beds, baths, sqft, and price are all known:
"[X]-bedroom, [X]-bath [home type] in [community], [City], [State]. [sqft] square feet of finished living space listed at $[price]."
Example: "3-bedroom, 2.5-bath townhome in Deepwood, Reston, VA. 1,705 square feet of finished living space listed at $625,000."
When any key spec is missing: "[home type] in [community], [City], [State]." — include only confirmed specs.

Sentence-starter ban — NEVER begin any sentence with:
"Beautifully", "Thoughtfully", "Meticulously", "Gorgeously", "Lovingly", "Immaculate", "Charming", "Spacious", "Perfectly", "Exquisitely", "Elegantly", "Tastefully", "Wonderfully", "Exceptionally", "Nestled", "Discover", "Welcome", "Rarely".
Default: every sentence begins with a noun, number, or article (The, A, An). Avoid adverb-led marketing openers. Exception: participial phrases (Framed by..., Set on..., Positioned along...) are permitted when grounded in a confirmed physical fact.

Adjective rule: Adjectives before nouns require a specific fact. "Kitchen renovated in 2023" ✓. "Beautifully renovated kitchen" ✗.

HOA: If HOA data is confirmed, include: "HOA fee of $[amount] [frequency] covers [items]." If not confirmed, omit entirely.

Price format: $[full number] (e.g. $625,000).

Absolute bans: exclamation marks, hashtags, ALL CAPS words, first-person (I/we/our/us), photo references, urgency phrases.

=== BANNED LANGUAGE (ALL SECTIONS) ===
Uncertain: "appears to be", "seems to", "possibly", "probably", "might be", "could be" → omit the claim entirely.
Price/value: "affordable", "value", "entry point", "price point", "budget-friendly", "won't last long", "priced to sell", "great deal", "steal", "bargain".
Pushy: "don't miss", "hurry", "act now", "once in a lifetime", "dream home", "this won't last".
Photo references: "as seen in photos", "pictured here", "aerial view shows", "visible in photos".
Fair Housing: "perfect for families", "great for young professionals", "ideal for couples", "safe neighborhood", "quiet neighborhood".
Web search distances: "X minutes away", "just minutes", "short drive", "quick drive", "easy commute to", specific mile/minute counts from web data.
Permitted distance alternatives: "accessible via Route 7", "convenient to Dulles Toll Road", "in the Dulles corridor", "convenient to Dulles International Airport".

=== DISTANCE & TRANSIT RULES ===
Only use distances explicitly confirmed in agent notes. When unconfirmed, omit entirely.
- "walking distance": ≤ 0.5 miles only
- "minutes away": 5–15 min drive only
- "nearby": ≤ 10 min drive only. Use when exact time is unknown but ≤ 10 min drive is confirmed.
- "X minutes away": use ONLY when exact drive time is confirmed in agent notes. Never use both "nearby" and "X minutes away" for the same location.
- "just steps from": ≤ 1 min walk only
- Metro mention: ≤ 1 mile only. "Walking distance to Metro": ≤ 0.5 miles only.
- Bus: ≤ 0.3 miles only. VRE/commuter rail: ≤ 1 mile only.
- Any location > 5 miles: do not mention.
HARD BLOCK — Sterling VA (20164, 20165), Cascades, Countryside, Potomac Falls, Dulles, Ashburn south: Innovation Center Metro ≈ 6 mi, Ashburn Metro ≈ 5 mi. Do NOT mention either.
Exception: One Loudoun and northern Ashburn (ZIP 20147, north of Route 7) are NOT in the Hard Block zone.
CONDITIONAL — Reston (20191, 20194): Wiehle-Reston East and Reston Town Center Metro mentions require explicit distance confirmation in agent notes. MLS sheet mentions of Metro do NOT qualify as agent note confirmation. If no distance is confirmed in agent notes, omit entirely.
CONDITIONAL — Herndon (20170, 20171): Herndon Metro may be mentioned ONLY if agent notes explicitly state the distance. If no distance provided, omit entirely.

=== SCHOOL DISTRICT RULES ===
Only use schools confirmed in the provided school data. "highlight: true" districts only get emphasis.
- "top-rated": A-grade or higher only
- "well-regarded": A− or B+ only
- "convenient to": B or lower only

=== ADJECTIVE DISCIPLINE ===
Same adjective: max once per paragraph.
"stunning", "beautiful", "gorgeous", "magnificent", "spectacular": max once each in the entire output.

=== SOCIAL MEDIA RULES ===
- Max 3 emojis total, placed naturally — never stacked.
- 5–7 hashtags, no more, no fewer.
- 2–3 paragraph line breaks for mobile readability. Key specs as bullet points (•).
- Price: if confirmed, use $[K] format (e.g. $625K). If price is unknown or unconfirmed, omit price entirely.
- First sentence must open with a physical feature or key selling point of the home. Never open with a neighborhood name, community name, or location alone.
- Forbidden: "DM us", "link in bio", excessive capitalization.

Hashtag composition (5–7 total, in this order):
1. Location-based tags (2): city/neighborhood (e.g. #RestonVA, #NorthernVirginia)
2. Home-specific tags (2): property type or key feature (e.g. #TownhouseForSale, #ModernKitchen)
3. General real estate tags (1–2): broad reach (e.g. #JustListed, #NoVAHomes)
4. School district tag (1, if school data is confirmed and highlight: true): (e.g. #FCPSHomes, #LoudounSchools)
Total must remain 5–7. Do not add tags outside these categories.
If school district tag is included, reduce General tags to 1 to keep total at 5–7. Never exceed 7 total.

Instagram captions may use a slightly more conversational rhythm than MLS, while remaining factual and compliant. Conversational rhythm applies to sentence flow only — sentence-starter ban and all banned language rules still apply strictly — no exceptions.

=== OPEN HOUSE RULES ===
Include open house details ONLY if explicitly stated in agent notes (date, time, address confirmed).
Never include open house dates from MLS sheets — these are listing-time data and may be outdated. Open house details must come from agent notes only, with date and time explicitly stated.
Never invent, suggest, or imply an open house if not confirmed.
Permitted format: "Open House: [Day], [Date] · [Time]" — in the Instagram caption only.
If no open house is mentioned in agent notes, omit entirely from all sections.

Do not use bold markdown (**) anywhere in the output, including section headers.

══════════════════════════════════════════
OUTPUT FORMAT — output ONLY these four sections, no preamble, no commentary
══════════════════════════════════════════

[ADDRESS]
Normalized address on a single line.

[MLS DESCRIPTION]
200–300 words. MLS-ready. Factual, keyword-rich, professional tone.

[ZILLOW · WHAT'S SPECIAL]
300–400 words. If data is insufficient, shorten to avoid hallucination — minimum word count does not apply when factual content is limited.
Flowing prose, no section headers.
Structure: Paragraph 1 (The Structure) → Paragraph 2 (The Connection) → Paragraph 3 (The Ongoing Value).
Open with a concrete physical detail of the home — never with neighborhood infrastructure.

[INSTAGRAM CAPTION]
50–80 words (hashtags excluded) + 5–7 hashtags on a separate line.

=== OUTPUT SELF-CHECK ===
Before finalizing output, verify:
- No banned language in any section, including Instagram caption
- All location/distance claims are from agent notes only
- No unsupported amenities implied
- Paragraph structure compliance for Zillow section
- Physical anchor present in every paragraph
- If any check fails, silently revise before finalizing output.

=== FEATURE REUSE RULE ===
Do not repeat the same feature across sections using the same or synonymous language.
MLS: inventory of confirmed facts.
Zillow: interpretation and spatial narrative.
Instagram: highlight only 1–3 strongest features.
Each section must bring new information or perspective — not restate what another section already covered.

=== AI BEHAVIOR LOCK ===
- Do not add opinions, commentary, or meta-observations.
- Do not explain reasoning for word choices.
- Do not apologize for missing data — silently omit affected sections.
- Do not suggest improvements or ask clarifying questions.
- Do not deviate from rules even when the property seems atypical.
- If unsure between two rules, apply higher-priority rule (see RULE PRIORITY).
- Output exactly the four sections defined in OUTPUT FORMAT — nothing more, nothing less.`

      const MAX_PHOTOS = 10
      const photoImages = images.filter((img) => !img.isPDF && img.base64).slice(0, MAX_PHOTOS)
      const pdfImages   = images.filter((img) =>  img.isPDF && img.base64)

      const content = [
        ...photoImages.map((img) => ({
          type: 'image',
          source: { type: 'base64', media_type: img.type, data: img.base64 },
        })),
        ...pdfImages.map((img) => ({
          type:   'document',
          source: { type: 'base64', media_type: 'application/pdf', data: img.base64 },
        })),
        ...styleFiles
          .filter((f) => f.base64 && f.mediaType === 'application/pdf')
          .map((f) => ({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: f.base64 },
          })),
        { type: 'text', text: prompt },
      ]

      const msg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2400,
        messages: [{ role: 'user', content }],
      }, { signal: abortController.signal })

      const parsed = parseResults(msg.content[0]?.text ?? '')
      generationTimeRef.current = Date.now()
      setResults(parsed)
      setReviseAllCount(0)
      // Track listing in Supabase (best-effort)
      try {
        const combinedText = combinedNotes + ' ' + (zillowBlock || '')
        const priceRange   = detectPriceRange(combinedText)
        const { data: newListing } = await supabase.from('listings').insert({
          user_id:          user?.id ?? null,
          address,
          tier:             applyPriceOverride(detectTier(address), priceRange),
          property_type:    detectPropertyType(combinedText),
          price_range:      priceRange,
          session_start:    new Date(sessionStartRef.current).toISOString(),
          generation_time:  new Date(generationTimeRef.current).toISOString(),
        }).select('id').single()
        if (newListing) setListingId(newListing.id)
      } catch (e) {
        console.warn('[Intelist Pro] Listing tracking error:', e)
      }
    } catch (err) {
      if (err.name === 'AbortError') return // user cancelled — stay silent
      console.error('[Intelist Pro] Generation error:', err)
      setError(classifyError(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Revise All ──────────────────────────────────────────────────────────────
  const reviseAll = async () => {
    if (!reviseAllInput.trim() || revisingAll) return
    setRevisingAll(true)
    const prompt = reviseAllInput
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
      const reviseSection = (text, isInstagram = false) => client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 700,
        messages: [{ role: 'user', content: `${masterPromptRules}\n\n---\nYou are now REVISING an existing section.\nDo not regenerate from scratch.\n\nORIGINAL TEXT TO REVISE:\n${text}\n\nREVISION REQUEST: ${prompt}\n\nApply the revision request while strictly following ALL rules in the master prompt above.\nThe tier, tone, and compliance rules cannot be changed by the revision request.${isInstagram ? '\nHashtags (5-7) must always be included. Never remove hashtags when revising Instagram caption.' : ''}\nOutput only the revised section in English.` }],
      })
      const [mlsMsg, marketingMsg, socialMsg] = await Promise.all([
        reviseSection(results.mls),
        reviseSection(results.marketing),
        reviseSection(results.social, true),
      ])
      setResults((r) => ({
        ...r,
        mls:       mlsMsg.content[0]?.text?.trim()       ?? r.mls,
        marketing: marketingMsg.content[0]?.text?.trim() ?? r.marketing,
        social:    socialMsg.content[0]?.text?.trim()    ?? r.social,
      }))
      setReviseAllCount((c) => c + 1)
      setReviseAllInput('')
    } catch (err) {
      console.error('[Intelist Pro] Revise All error:', err)
    } finally {
      setRevisingAll(false)
    }
  }

  const reset = () => {
    setResults(null); setError(null); setAddress('')
    setNotes(''); setTranscript(''); setPrevListing('')
    setActivePanel(null); setStyleFiles([])
    images.forEach((img) => URL.revokeObjectURL(img.preview))
    setImages([]); setListingId(null)
  }

  // ── Opt button class helper ─────────────────────────────────────────────────
  const optClass = (name) => {
    if (name === 'record' && listening) return `${styles.optBtn} ${styles.optBtnRecording}`
    if (name === 'photos' && images.length > 0 && activePanel !== 'photos') return `${styles.optBtn} ${styles.optBtnActive}`
    if (activePanel === name) return `${styles.optBtn} ${styles.optBtnActive}`
    return styles.optBtn
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  if (!authChecked) return null // wait for session check

  if (!results) {
    return (
      <div className={styles.page}>
        {/* Toast */}
        {toast && <div className={styles.toast}>{toast}</div>}

        {/* Auth modal */}
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onSuccess={(u) => { setUser(u); setShowAuth(false) }}
          />
        )}

        {/* Loading overlay */}
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingCard}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingTitle}>
                {loadingStep === 'zillow' ? 'Looking up property data…' : 'Crafting your listing copy…'}
              </p>
              <p className={styles.loadingSub}>Saving you time on every listing</p>
              <button className={styles.cancelGenerateBtn} onClick={cancelGenerate}>Cancel</button>
            </div>
          </div>
        )}

        <header className={styles.header}>
          <span className={styles.brand}>Intelist <span className={styles.brandAccent}>Pro</span></span>
          {user ? (
            <div className={styles.headerUser}>
              <span className={styles.headerName}>
                {user.user_metadata?.full_name ?? user.email}
              </span>
              <button className={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
            </div>
          ) : (
            <button className={styles.signInBtn} onClick={() => setShowAuth(true)}>Sign in</button>
          )}
        </header>

        <main className={styles.formMain}>
          <div className={styles.hero}>
            <h1 className={styles.heroTitle}>List <span className={styles.heroAccent}>smarter.</span></h1>
            <p className={styles.heroSub}>Written in your voice, in seconds.</p>
          </div>

          {/* ── Address bar ── */}
          <div style={{ position: 'relative' }}>
          <div className={`${styles.addressBar} ${shake ? styles.addressBarShake : ''}`}>
            <MapPin size={20} className={styles.searchIcon} />
            <input
              id="address-input"
              type="text"
              className={styles.searchInput}
              value={address}
              onChange={(e) => { console.log('input changed:', e.target.value); setAddress(e.target.value); fetchSuggestions(e.target.value) }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  if (!showSuggestions && suggestions.length > 0) setShowSuggestions(true)
                  setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHighlightedIndex((i) => Math.max(i - 1, -1))
                } else if (e.key === 'Enter') {
                  if (showSuggestions && highlightedIndex >= 0) {
                    pickSuggestion(suggestions[highlightedIndex])
                  } else {
                    setShowSuggestions(false)
                    generate()
                  }
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false)
                  setHighlightedIndex(-1)
                }
              }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
              placeholder="Add an address — we'll handle the words."
              autoComplete="off"
            />
            <div className={styles.addressControls}>
              <button
                className={`${styles.submitArrowBtn} ${address.trim() ? styles.submitArrowBtnActive : ''}`}
                onClick={() => { if (address.trim()) generate() }}
                disabled={!address.trim()}
                aria-label="Generate listing copy"
                title="Generate listing copy"
              >
                <ArrowRight size={17} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.acDropdown}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className={`${styles.acItem} ${i === highlightedIndex ? styles.acItemHighlighted : ''}`}
                  onMouseDown={() => pickSuggestion(s)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                >
                  <MapPin size={14} className={styles.acIcon} />
                  <span className={styles.acText}>
                    <span className={styles.acMain}>{s}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          </div>{/* end address bar wrapper */}

          {/* ── Option grid ── */}
          <div className={styles.optionGrid}>
            <button className={optClass('notes')} onClick={() => togglePanel('notes')}>
              <span className={styles.optIcon}><PenLine size={20} /></span>
              <span className={styles.optBtnLabel}>Notes</span>
              <span className={styles.optBtnSub}>What's special</span>
            </button>

            <button className={optClass('record')} onClick={() => togglePanel('record')}>
              <span className={styles.optIcon}><Mic size={20} /></span>
              <span className={styles.optBtnLabel}>{listening ? 'Recording…' : 'Record'}</span>
              <span className={styles.optBtnSub}>Speak your notes</span>
            </button>

            <button className={optClass('photos')} onClick={() => togglePanel('photos')}>
              <span className={styles.optIcon}><Image size={20} /></span>
              <span className={styles.optBtnLabel}>
                {images.length > 0 ? `${images.length} photo${images.length > 1 ? 's' : ''}` : 'Photos'}
              </span>
              <span className={styles.optBtnSub}>Photos, plans & MLS</span>
            </button>

            <button className={optClass('style')} onClick={() => togglePanel('style')}>
              <span className={styles.optIcon}><FileText size={20} /></span>
              <span className={styles.optBtnLabel}>My Style</span>
              <span className={styles.optBtnSub}>Match your voice</span>
            </button>
          </div>

          {/* ── Notes panel ── */}
          {activePanel === 'notes' && (
            <div className={styles.panel}>
              <textarea
                className={styles.panelTextarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What makes this home special? Recent upgrades, unique features…"
                rows={4}
                autoFocus
              />
            </div>
          )}

          {/* ── Record panel ── */}
          {activePanel === 'record' && (
            <div className={styles.panel}>
              <div className={`${styles.recordHeader} ${!listening ? styles.recordHeaderDone : ''}`}>
                {listening
                  ? <><span className={styles.recordDot} />Listening…</>
                  : 'Done · tap to edit'
                }
              </div>
              <textarea
                className={styles.panelTextarea}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your voice notes will appear here…"
                rows={4}
              />
            </div>
          )}

          {/* ── Photos panel ── */}
          {activePanel === 'photos' && (
            <div className={styles.panel}>
              {images.length === 0 ? (
                <div
                  className={`${styles.photoDropZone} ${photoDragging ? styles.photoDropZoneDragging : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setPhotoDragging(true) }}
                  onDragLeave={() => setPhotoDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setPhotoDragging(false); addFiles(e.dataTransfer.files) }}
                >
                  <Image size={24} color="#C0C0C0" />
                  <span className={styles.photoDropTitle}>Add photos, floor plans, or MLS sheets</span>
                  <span className={styles.photoDropSub}>Images or PDF · click or drag & drop</span>
                  <span className={styles.photoDropHint}>Include MLS sheet for automatic details</span>
                </div>
              ) : (
                <div
                  className={styles.thumbGrid}
                  onDragOver={(e) => { e.preventDefault(); setPhotoDragging(true) }}
                  onDragLeave={() => setPhotoDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setPhotoDragging(false); addFiles(e.dataTransfer.files) }}
                >
                  {images.map((img, i) => (
                    <div key={i} className={styles.thumb}>
                      {img.isPDF
                        ? <div className={styles.thumbPDF}><FileText size={18} /><span>{img.name}</span></div>
                        : <img src={img.preview} alt="" />
                      }
                      <button className={styles.thumbRemove} onClick={() => removeImage(i)}>
                        <X size={9} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  {/* Show add button while photos < 10; PDFs always addable */}
                  {images.filter((img) => !img.isPDF).length < MAX_PHOTO_UPLOAD && (
                    <button className={styles.addThumb} onClick={() => fileInputRef.current?.click()}>
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── My Style panel ── */}
          {activePanel === 'style' && (
            <div className={styles.panel}>
              <span className={styles.panelHint}>Helps match your writing style</span>
              <textarea
                className={styles.panelTextarea}
                value={prevListing}
                onChange={(e) => setPrevListing(e.target.value)}
                placeholder="Paste your previous listing description…"
                rows={4}
                autoFocus
              />
              <div className={styles.styleFileDivider} />
              <div
                className={`${styles.styleUploadZone} ${styleDragging ? styles.styleUploadDragging : ''}`}
                onClick={() => styleFileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setStyleDragging(true) }}
                onDragLeave={() => setStyleDragging(false)}
                onDrop={(e) => { e.preventDefault(); setStyleDragging(false); addStyleFiles(e.dataTransfer.files) }}
              >
                <Upload size={20} color="#C0C0C0" />
                <span className={styles.styleUploadTitle}>Or upload past listings</span>
                <span className={styles.styleUploadSub}>PDF, Word (.docx), or text files</span>
              </div>
              <input
                ref={styleFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { addStyleFiles(e.target.files); e.target.value = '' }}
              />
              {styleFiles.length > 0 && (
                <div className={styles.styleFileList}>
                  {styleFiles.map((f, i) => (
                    <div key={i} className={styles.styleFileItem}>
                      <span>{f.name}</span>
                      <button className={styles.styleFileRemove} onClick={() => removeStyleFile(i)}>
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple
            style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />

          {error && <div className={styles.errorCard}>{error}</div>}
        </main>
      </div>
    )
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  const displayAddress = results.address || address
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const allText = `MLS DESCRIPTION\n${'─'.repeat(48)}\n${results.mls}\n\nZILLOW · WHAT'S SPECIAL\n${'─'.repeat(48)}\n${results.marketing}\n\nINSTAGRAM CAPTION\n${'─'.repeat(48)}\n${results.social}`

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>Intelist <span className={styles.brandAccent}>Pro</span></span>
        <div className={styles.headerUser}>
          {user && (
            <span className={styles.headerName}>
              {user.user_metadata?.full_name ?? user.email}
            </span>
          )}
          <button className={styles.newBtn} onClick={reset}>New listing</button>
          {user && (
            <button className={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
          )}
        </div>
      </header>

      <main className={styles.resultsMain}>
        <div className={styles.resultsHero}>
          <p className={styles.resultsTitle}>Your listing copy is ready.</p>
          <h2 className={styles.resultsAddress}>{displayAddress}</h2>
        </div>
        <div className={styles.copyAllRow} style={{ marginBottom: 16 }}>
          <CopyButton text={allText} label="Copy all three" className={styles.copyAllBtn} />
        </div>

        {/* ── Revise All ── */}
        <div className={styles.reviseAllRow}>
          <ReviseAllInput
            value={reviseAllInput}
            onChange={setReviseAllInput}
            onRevise={reviseAll}
            revising={revisingAll}
          />
        </div>

        <div className={styles.cards}>
          <ResultCard key={`mls-${reviseAllCount}`}       tag="MLS Description"         sublabel="Short description · 200–300 words" content={results.mls}       apiKey={apiKey} onChange={(t) => setResults((r) => ({ ...r, mls: t }))}       listingId={listingId} sectionKey="mls"       initialVerb={reviseAllCount > 0 ? 'Revised' : 'Generated'} revisingAll={revisingAll} />
          <ResultCard key={`zillow-${reviseAllCount}`}    tag="Zillow · What's Special" sublabel="Long form · 300–400 words"          content={results.marketing} apiKey={apiKey} onChange={(t) => setResults((r) => ({ ...r, marketing: t }))} listingId={listingId} sectionKey="zillow"    initialVerb={reviseAllCount > 0 ? 'Revised' : 'Generated'} revisingAll={revisingAll} />
          <ResultCard key={`instagram-${reviseAllCount}`} tag="Instagram Caption"        sublabel="Instagram / Facebook caption"       content={results.social}    apiKey={apiKey} onChange={(t) => setResults((r) => ({ ...r, social: t }))}    listingId={listingId} sectionKey="instagram" initialVerb={reviseAllCount > 0 ? 'Revised' : 'Generated'} revisingAll={revisingAll} />
        </div>
        <div className={styles.copyAllRow} style={{ marginTop: 16 }}>
          <CopyButton text={allText} label="Copy all three" className={styles.copyAllBtn} />
        </div>
      </main>
    </div>
  )
}
