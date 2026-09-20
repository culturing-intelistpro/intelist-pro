// VideoGenerator.jsx — 1분 슬라이드쇼 영상 자동 생성 (Phase 4)
// 브라우저 내장 Canvas + MediaRecorder 사용 (API 비용 0원)
// 켄번즈 효과 + 에이전트 브랜딩 오버레이 + 사진 관리 UI
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Play, Download, Film, Plus, Trash2, GripVertical } from 'lucide-react'
import styles from './VideoGenerator.module.css'
import { supabase } from './supabase'

// ─── 슬라이드 구조 ────────────────────────────────────────────────────────────
const SLIDE_DURATION = 5000
const TITLE_DURATION = 3000
const END_DURATION   = 5000
const FADE_DURATION  = 400
const TARGET_FPS     = 30
const FRAME_MS       = 1000 / TARGET_FPS
const MAX_PHOTOS     = 20
const MAX_SIDE       = 1280
const JPEG_Q         = 0.80

export const SLIDE_LABELS = [
  '외관 정면 (Exterior Front)',
  '외관 사이드/앵글 (Exterior Angle)',
  '거실 (Living Room)',
  '다이닝/주방 전경 (Dining / Kitchen)',
  '주방 클로즈업 (Kitchen Detail)',
  '안방 (Master Bedroom)',
  '안방 욕실 (Master Bath)',
  '서브 룸 / 특징 공간 (Feature Room)',
  '뒷마당 / 야외 (Backyard / Outdoor)',
  '전경 / 드론 / 커뮤니티 (Aerial or Community)',
]

const CANVAS_W = 1080
const CANVAS_H = 1920

// ─── 이미지 압축 ─────────────────────────────────────────────────────────────
async function compressToDataUrl(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth, h = img.naturalHeight
      if (w > MAX_SIDE || h > MAX_SIDE) {
        if (w > h) { h = Math.round(h * MAX_SIDE / w); w = MAX_SIDE }
        else       { w = Math.round(w * MAX_SIDE / h); h = MAX_SIDE }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', JPEG_Q))
    }
    img.src = url
  })
}

// ─── 이미지 로드 ─────────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load: ${src}`))
    img.src = src
  })
}

// ─── Canvas 드로잉 헬퍼 ──────────────────────────────────────────────────────
function drawCover(ctx, img, x, y, w, h, scale = 1, offsetX = 0) {
  const imgAspect = img.width / img.height
  const canAspect = w / h
  let sx, sy, sw, sh
  if (imgAspect > canAspect) {
    sh = img.height / scale
    sw = sh * canAspect
    sx = (img.width - sw) / 2 + offsetX * (img.width - sw)
    sy = (img.height - sh) / 2
  } else {
    sw = img.width / scale
    sh = sw / canAspect
    sx = (img.width - sw) / 2 + offsetX * (img.width - sw)
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function drawGradientOverlay(ctx, x, y, w, h) {
  const grad = ctx.createLinearGradient(x, y, x, y + h)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0.2)')
  grad.addColorStop(1, 'rgba(0,0,0,0.72)')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = '', currY = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currY); line = word; currY += lineHeight
    } else { line = test }
  }
  if (line) ctx.fillText(line, x, currY)
  return currY + lineHeight
}

// ─── 슬라이드 렌더러 ─────────────────────────────────────────────────────────
function renderTitleCard(ctx, address, agent, brandColor, alpha, zillow) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = brandColor
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_H * 0.55); ctx.lineTo(CANVAS_W, CANVAS_H * 0.42)
  ctx.lineTo(CANVAS_W, CANVAS_H); ctx.lineTo(0, CANVAS_H)
  ctx.fill()
  // JUST LISTED 배지
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  roundRect(ctx, 80, 280, 280, 54, 27); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 22px system-ui, sans-serif'
  ctx.letterSpacing = '3px'
  ctx.fillText('JUST LISTED', 115, 316)
  ctx.letterSpacing = '0px'
  // 주소
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 68px system-ui, sans-serif'
  const parts = address.split(',')
  ctx.fillText(parts[0] || address, 80, 440)
  if (parts[1]) {
    ctx.font = '40px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.fillText(parts.slice(1).join(',').trim(), 80, 500)
  }
  // 침실/욕실
  const bedbath = [
    zillow?.beds  ? `${zillow.beds} BD`   : null,
    zillow?.baths ? `${zillow.baths} BA`  : null,
    zillow?.sqft  ? `${Number(zillow.sqft).toLocaleString()} SF` : null,
  ].filter(Boolean)
  if (bedbath.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(80, 548, 420, 2)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 42px system-ui, sans-serif'
    ctx.fillText(bedbath.join('  ·  '), 80, 614)
  }
  // 에이전트
  if (agent?.full_name) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = 'bold 36px system-ui, sans-serif'
    ctx.fillText(agent.full_name, 80, CANVAS_H - 220)
    if (agent.brokerage) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '28px system-ui, sans-serif'
      ctx.fillText(agent.brokerage, 80, CANVAS_H - 175)
    }
    if (agent.phone) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '28px system-ui, sans-serif'
      ctx.fillText(agent.phone, 80, CANVAS_H - 135)
    }
  }
  ctx.globalAlpha = 1
}

function renderPhotoSlide(ctx, img, address, agent, brandColor, progress, alpha) {
  ctx.globalAlpha = alpha
  const scale = 1 + progress * 0.08
  const offX  = (progress - 0.5) * 0.04
  drawCover(ctx, img, 0, 0, CANVAS_W, CANVAS_H, scale, 0.5 + offX)
  // 상단 그라디언트
  const topGrad = ctx.createLinearGradient(0, 0, 0, 420)
  topGrad.addColorStop(0, 'rgba(0,0,0,0.50)')
  topGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = topGrad; ctx.fillRect(0, 0, CANVAS_W, 420)
  // 하단 그라디언트
  drawGradientOverlay(ctx, 0, CANVAS_H * 0.48, CANVAS_W, CANVAS_H * 0.52)
  // 브랜드 컬러 좌측 바
  ctx.fillStyle = brandColor
  ctx.fillRect(0, 0, 8, CANVAS_H)
  // 에이전트 이름 상단
  if (agent?.full_name) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = 'bold 34px system-ui, sans-serif'
    ctx.fillText(agent.full_name, 48, 90)
    if (agent.brokerage) {
      ctx.fillStyle = 'rgba(255,255,255,0.68)'
      ctx.font = '25px system-ui, sans-serif'
      ctx.fillText(agent.brokerage, 48, 128)
    }
  }
  // 주소 하단
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 46px system-ui, sans-serif'
  wrapText(ctx, address, 50, CANVAS_H - 200, CANVAS_W - 100, 58)
  ctx.globalAlpha = 1
}

function renderEndCard(ctx, address, agent, brandColor, alpha) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#1D1D1F'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.fillStyle = brandColor
  ctx.fillRect(0, 0, CANVAS_W, 18)
  ctx.fillStyle = brandColor
  ctx.font = 'bold 96px system-ui, sans-serif'
  ctx.fillText('NOW', 80, 250)
  ctx.fillText('AVAILABLE', 80, 360)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(80, 400, CANVAS_W - 160, 2)
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '36px system-ui, sans-serif'
  wrapText(ctx, address, 80, 460, CANVAS_W - 160, 50)
  const infoY = CANVAS_H * 0.60
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(80, infoY - 20, 360, 2)
  if (agent?.full_name) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 56px system-ui, sans-serif'
    ctx.fillText(agent.full_name, 80, infoY + 60)
  }
  if (agent?.phone) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '42px system-ui, sans-serif'
    ctx.fillText(agent.phone, 80, infoY + 130)
  }
  if (agent?.brokerage) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = '32px system-ui, sans-serif'
    ctx.fillText(agent.brokerage, 80, infoY + 188)
  }
  if (agent?.website_url) {
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.font = '26px system-ui, sans-serif'
    ctx.fillText(agent.website_url.replace(/^https?:\/\//, ''), 80, infoY + 235)
  }
  ctx.fillStyle = brandColor
  ctx.fillRect(0, CANVAS_H - 14, CANVAS_W, 14)
  ctx.globalAlpha = 1
}

// ─── 수정 요청 파라미터 파서 ─────────────────────────────────────────────────
function parseFeedback(text) {
  const t = text.toLowerCase()
  const params = {}
  if (t.includes('느리게') || t.includes('slower') || t.includes('천천히') || t.includes('길게'))
    params.slideDuration = Math.min(SLIDE_DURATION * 1.4, 9000)
  if (t.includes('빠르게') || t.includes('faster') || t.includes('빠른') || t.includes('짧게'))
    params.slideDuration = Math.max(SLIDE_DURATION * 0.65, 2000)
  if (t.includes('글씨 크게') || t.includes('폰트 크게') || t.includes('텍스트 크게') || t.includes('larger'))
    params.fontScale = 1.2
  if (t.includes('글씨 작게') || t.includes('폰트 작게') || t.includes('smaller'))
    params.fontScale = 0.82
  if (t.includes('부드럽게') || t.includes('smoother') || t.includes('전환 느리게'))
    params.fadeDuration = Math.min(FADE_DURATION * 1.6, 800)
  if (t.includes('전환 빠르게') || t.includes('transition faster'))
    params.fadeDuration = Math.max(FADE_DURATION * 0.5, 80)
  return params
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function VideoGenerator({ address, results, profile, photos, photoUrls, zillow, onClose }) {
  const canvasRef  = useRef(null)
  const recRef     = useRef(null)
  const rafRef     = useRef(null)
  const chunksRef  = useRef([])
  const startRef   = useRef(null)
  const fileInputRef = useRef(null)

  const [status,   setStatus]   = useState('idle')
  const [progress, setProgress] = useState(0)
  const [blobUrl,  setBlobUrl]  = useState(null)
  const [errMsg,   setErrMsg]   = useState('')

  // 사진 목록 — 세션 사진 + Supabase URL 병합, 편집 가능
  const initPhotos = useCallback(() => {
    const sessionImgs = photos
      .filter(p => !p.isPDF)
      .map(p => ({ id: Date.now() + Math.random(), src: p.preview || `data:image/jpeg;base64,${p.base64}`, name: p.name || 'photo' }))
    if (sessionImgs.length > 0) return sessionImgs.slice(0, MAX_PHOTOS)
    // 세션 사진 없으면 Supabase URL 사용
    return photoUrls.slice(0, MAX_PHOTOS).map((url, i) => ({ id: i, src: url, name: `Photo ${i + 1}` }))
  }, [photos, photoUrls])

  const [managedPhotos, setManagedPhotos] = useState(initPhotos)
  const [dragIdx, setDragIdx] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [appliedParams, setAppliedParams] = useState({})

  const brandColor = profile?.brand_color || '#D94035'
  const agent = {
    full_name:   profile?.full_name   || '',
    brokerage:   profile?.brokerage   || '',
    phone:       profile?.phone       || '',
    website_url: profile?.website_url || '',
  }

  const totalMsEst = TITLE_DURATION + managedPhotos.length * (appliedParams.slideDuration ?? SLIDE_DURATION) + END_DURATION

  // 사진 추가
  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const remaining = MAX_PHOTOS - managedPhotos.length
    const toAdd = files.slice(0, remaining)
    const newPhotos = await Promise.all(
      toAdd.map(async (f) => ({ id: Date.now() + Math.random(), src: await compressToDataUrl(f), name: f.name }))
    )
    setManagedPhotos(prev => [...prev, ...newPhotos])
    e.target.value = ''
  }

  // 사진 제거
  const removePhoto = (id) => {
    setManagedPhotos(prev => prev.filter(p => p.id !== id))
  }

  // 드래그 재정렬
  const onDragStart = (i) => setDragIdx(i)
  const onDragOver  = (e, i) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    setManagedPhotos(prev => {
      const arr = [...prev]
      const [item] = arr.splice(dragIdx, 1)
      arr.splice(i, 0, item)
      setDragIdx(i)
      return arr
    })
  }
  const onDragEnd = () => setDragIdx(null)

  // 영상 생성
  const generate = async (overrideParams = {}) => {
    if (status === 'generating' || managedPhotos.length < 1) return
    setStatus('generating'); setProgress(0); setBlobUrl(null)
    const params = { ...appliedParams, ...overrideParams }
    const SLIDE_DUR  = params.slideDuration ?? SLIDE_DURATION
    const FADE_DUR   = params.fadeDuration  ?? FADE_DURATION
    const FONT_SCALE = params.fontScale     ?? 1
    chunksRef.current = []

    const canvas = canvasRef.current
    canvas.width = CANVAS_W; canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')

    let imgs = []
    try {
      imgs = await Promise.all(managedPhotos.map(p => loadImage(p.src)))
    } catch (e) {
      setStatus('error')
      setErrMsg('사진 로드 실패: CORS 오류이거나 URL이 만료되었습니다. 사진을 다시 첨부해주세요.')
      return
    }

    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    const mimeType  = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm'
    const totalMs = TITLE_DURATION + managedPhotos.length * SLIDE_DUR + END_DURATION
    const stream    = canvas.captureStream(TARGET_FPS)
    const recorder  = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
    recRef.current  = recorder

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      setBlobUrl(URL.createObjectURL(blob))
      setStatus('done')
    }

    recorder.start(100)
    startRef.current = performance.now()

    let lastFrame = 0
    const render = (now) => {
      if (now - lastFrame < FRAME_MS - 1) { rafRef.current = requestAnimationFrame(render); return }
      lastFrame = now
      const elapsed = now - startRef.current
      setProgress(Math.round(Math.min(elapsed / totalMs, 1) * 100))

      if (elapsed >= totalMs) {
        renderEndCard(ctx, address, agent, brandColor, 1)
        recorder.stop(); return
      }

      if (elapsed < TITLE_DURATION) {
        const alpha = elapsed < FADE_DUR ? elapsed / FADE_DUR : 1
        renderTitleCard(ctx, address, agent, brandColor, alpha, zillow)
      } else {
        const afterTitle  = elapsed - TITLE_DURATION
        const slideIdx    = Math.floor(afterTitle / SLIDE_DUR)
        if (slideIdx >= imgs.length) {
          const endElapsed = afterTitle - imgs.length * SLIDE_DUR
          const alpha = endElapsed < FADE_DUR ? endElapsed / FADE_DUR : 1
          renderEndCard(ctx, address, agent, brandColor, alpha)
        } else {
          const withinSlide    = afterTitle - slideIdx * SLIDE_DUR
          const slideProgress  = withinSlide / SLIDE_DUR
          let alpha = 1
          if (withinSlide < FADE_DUR) alpha = withinSlide / FADE_DUR
          else if (withinSlide > SLIDE_DUR - FADE_DUR)
            alpha = (SLIDE_DUR - withinSlide) / FADE_DUR
          renderPhotoSlide(ctx, imgs[slideIdx], address, agent, brandColor, slideProgress, Math.max(0, Math.min(1, alpha)))
        }
      }
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)
  }

  const cancel = () => {
    cancelAnimationFrame(rafRef.current)
    if (recRef.current?.state === 'recording') recRef.current.stop()
    setStatus('idle'); setProgress(0)
  }

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    if (blobUrl) URL.revokeObjectURL(blobUrl)
  }, [blobUrl])

  const handleApplyFeedback = async () => {
    if (!feedbackText.trim()) return
    setFeedbackSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const parsed = parseFeedback(feedbackText)
      await supabase.from('video_feedback').insert({
        user_id: user?.id ?? null,
        feedback_text: feedbackText.trim(),
        applied: true,
        params_json: parsed,
      })
    } catch (err) {
      console.warn('video_feedback 저장 실패:', err)
    }
    const newParams = parseFeedback(feedbackText)
    setAppliedParams(newParams)
    setFeedbackText('')
    setFeedbackSaving(false)
    generate(newParams)
  }

  const downloadVideo = () => {
    if (!blobUrl) return
    const a = document.createElement('a')
    const slug = address.split(',')[0].replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    a.href = blobUrl; a.download = `${slug}_listing_video.webm`; a.click()
  }

  const photoCount = managedPhotos.length

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Film size={20} style={{ color: 'var(--icon)' }} />
            <div>
              <h2 className={styles.title}>Video Generator</h2>
              <p className={styles.sub}>자동 슬라이드쇼 · 9:16 세로형 · Instagram Reels / TikTok / YouTube Shorts</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.body}>
          {/* 좌측: canvas 미리보기 */}
          <div className={styles.previewCol}>
            <div className={styles.phoneFrame}>
              <canvas ref={canvasRef}
                width={CANVAS_W} height={CANVAS_H}
                className={styles.canvas}
                style={{ width: '100%', aspectRatio: `${CANVAS_W}/${CANVAS_H}` }} />
            </div>
            <p className={styles.canvasLabel}>1080 × 1920</p>
            {status === 'generating' && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.progressLabel}>{progress}%</span>
              </div>
            )}
          </div>

          {/* 우측: 사진 관리 + 설정 */}
          <div className={styles.controlCol}>
            {/* 사진 관리 */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionTitle}>Photos ({photoCount}/{MAX_PHOTOS})</p>
                  <p className={styles.sectionHint}>드래그로 순서 변경 · ✕ 버튼으로 제거 · 추가 버튼으로 사진 보충</p>
                </div>
                <button
                  className={styles.addPhotoBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoCount >= MAX_PHOTOS}>
                  <Plus size={14} /> Add Photos
                </button>
                <input
                  ref={fileInputRef}
                  type="file" accept="image/*" multiple hidden
                  onChange={handleAddPhotos} />
              </div>

              {/* 썸네일 그리드 */}
              {photoCount > 0 ? (
                <div className={styles.photoGrid}>
                  {managedPhotos.map((photo, i) => (
                    <div
                      key={photo.id}
                      className={`${styles.photoThumb} ${dragIdx === i ? styles.dragging : ''}`}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={e => onDragOver(e, i)}
                      onDragEnd={onDragEnd}>
                      <img src={photo.src} alt={`Photo ${i + 1}`} className={styles.thumbImg} />
                      <span className={styles.thumbNum}>{i + 1}</span>
                      <button className={styles.removeBtn} onClick={() => removePhoto(photo.id)} title="제거">
                        <X size={10} />
                      </button>
                      <div className={styles.dragHandle}><GripVertical size={12} /></div>
                    </div>
                  ))}
                  {photoCount < MAX_PHOTOS && (
                    <button
                      className={styles.addThumbBtn}
                      onClick={() => fileInputRef.current?.click()}>
                      <Plus size={18} />
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.emptyPhotos} onClick={() => fileInputRef.current?.click()}>
                  <Plus size={24} />
                  <p>사진을 추가하세요</p>
                  <p className={styles.emptyHint}>JPG / PNG · 최대 {MAX_PHOTOS}장</p>
                </div>
              )}
            </div>

            {/* 추천 순서 가이드 */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Recommended Photo Order</p>
              <ul className={styles.slideList}>
                {SLIDE_LABELS.map((label, i) => {
                  const filled = i < photoCount
                  return (
                    <li key={i} className={`${styles.slideItem} ${filled ? styles.slideItemFilled : ''}`}>
                      <span className={`${styles.slideNum} ${filled ? styles.slideNumFilled : ''}`}>{i + 1}</span>
                      <span className={styles.slideLabel}>{label}</span>
                      {filled && <span className={styles.slideDot}>✓</span>}
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* 영상 정보 & 액션 */}
            <div className={styles.statusSection}>
              <p className={styles.durationLabel}>
                예상 길이: <strong>{Math.round(totalMsEst / 1000)}초</strong>
                {' '}(오프닝 3s + 사진 {photoCount}장 × {(appliedParams.slideDuration ?? SLIDE_DURATION) / 1000}s + 클로징 5s)
              </p>

              {photoCount < 3 && photoCount > 0 && (
                <p className={styles.warningNote}>⚠️ 3장 이상 권장합니다</p>
              )}

              {status === 'error' && (
                <p className={styles.errorMsg}>{errMsg}</p>
              )}

              <div className={styles.actions}>
                {(status === 'idle' || status === 'error') && (
                  <button className={styles.generateBtn} onClick={generate} disabled={photoCount < 1}>
                    <Play size={16} /> Generate Video
                  </button>
                )}
                {status === 'generating' && (
                  <button className={styles.cancelBtn} onClick={cancel}>Cancel</button>
                )}
                {status === 'done' && (
                  <>
                    <button className={styles.downloadBtn} onClick={downloadVideo}>
                      <Download size={16} /> Download .webm
                    </button>
                    <button className={styles.regenBtn} onClick={() => generate()}>
                      <Play size={14} /> Regenerate
                    </button>
                  </>
                )}
              </div>
              {/* ── 수정 요청 UI ───────────────────────────────────────── */}
              {status === 'done' && (
                <div className={styles.feedbackSection}>
                  <p className={styles.feedbackLabel}>✏️ 수정 요청</p>
                  <p className={styles.feedbackHint}>
                    예: "조금 더 느리게" · "글씨 크게" · "전환 부드럽게"
                  </p>
                  <textarea
                    className={styles.feedbackTextarea}
                    placeholder="수정하고 싶은 부분을 자유롭게 작성하세요..."
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    rows={3}
                  />
                  <button
                    className={styles.applyBtn}
                    onClick={handleApplyFeedback}
                    disabled={!feedbackText.trim() || feedbackSaving}>
                    {feedbackSaving ? '저장 중...' : '✦ 수정 적용 후 재생성'}
                  </button>
                  {Object.keys(appliedParams).length > 0 && (
                    <p className={styles.paramsApplied}>
                      ✓ 적용됨:{' '}
                      {[
                        appliedParams.slideDuration != null &&
                          `슬라이드 ${appliedParams.slideDuration / 1000}s`,
                        appliedParams.fontScale != null &&
                          `폰트 ×${appliedParams.fontScale}`,
                        appliedParams.fadeDuration != null &&
                          `페이드 ${appliedParams.fadeDuration}ms`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              )}

              <p className={styles.techNote}>
                브라우저에서 직접 렌더링 · API 비용 없음 · Instagram Reels, TikTok, YouTube Shorts 호환
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
