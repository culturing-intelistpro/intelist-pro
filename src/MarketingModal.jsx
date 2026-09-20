// MarketingModal.jsx — Phase 3: 홍보물 키트 자동 생성
// 브로셔 (세로/가로 전환) + SNS 소셜 템플릿 + PNG/PDF 다운로드
// Canvas API 기반, 브라우저 내장 렌더링 (API 비용 0원)
import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Download, Image, FileText, RotateCcw, Smartphone } from 'lucide-react'
import styles from './MarketingModal.module.css'

// ─── 캔버스 치수 ─────────────────────────────────────────────────────────────
const BROCHURE = {
  portrait:  { w: 2550, h: 3300, label: '8.5"×11" Portrait' },
  landscape: { w: 3300, h: 2550, label: '11"×8.5" Landscape' },
}
const SNS = {
  square:    { w: 1080, h: 1080, label: 'Square 1:1',    platform: 'Instagram Feed' },
  portrait:  { w: 1080, h: 1350, label: 'Portrait 4:5',  platform: 'Instagram Feed' },
  story:     { w: 1080, h: 1920, label: 'Story 9:16',    platform: 'Instagram Story / TikTok' },
}

// ─── 드로잉 헬퍼 ─────────────────────────────────────────────────────────────
function drawCover(ctx, img, x, y, w, h) {
  const imgAspect = img.width / img.height
  const boxAspect = w / h
  let sx, sy, sw, sh
  if (imgAspect > boxAspect) {
    sh = img.height; sw = sh * boxAspect
    sx = (img.width - sw) / 2; sy = 0
  } else {
    sw = img.width; sh = sw / boxAspect
    sx = 0; sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const words = text.split(' ')
  let line = '', currY = y, count = 0
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currY); line = word; currY += lineHeight; count++
      if (count >= maxLines) break
    } else { line = test }
  }
  if (line && count < maxLines) { ctx.fillText(line, x, currY); currY += lineHeight }
  return currY
}

// ─── 브로셔 렌더러 ───────────────────────────────────────────────────────────
async function renderBrochureClassic(canvas, { orientation, address, results, profile, photos, photoUrls, zillow }) {
  const dim = BROCHURE[orientation]
  canvas.width  = dim.w
  canvas.height = dim.h
  const ctx    = canvas.getContext('2d')
  const W      = dim.w
  const H      = dim.h
  const BRAND  = profile?.brand_color || '#D94035'
  const isPort = orientation === 'portrait'

  // 배경
  ctx.fillStyle = '#FAFAFA'
  ctx.fillRect(0, 0, W, H)

  // 이미지 로드
  const imgSrcs = [
    ...photos.filter(p => !p.isPDF).map(p => p.preview || `data:image/jpeg;base64,${p.base64}`),
    ...photoUrls,
  ].filter(Boolean).slice(0, 6)

  let imgs = []
  try { imgs = await Promise.all(imgSrcs.map(loadImage)) } catch {}

  if (isPort) {
    // ── 세로 브로셔 레이아웃 ─────────────────────────────────────────────────
    const PAD = 120

    // 메인 이미지 (상단 40%)
    const heroH = Math.round(H * 0.40)
    if (imgs[0]) {
      drawCover(ctx, imgs[0], 0, 0, W, heroH)
    } else {
      ctx.fillStyle = BRAND + '22'
      ctx.fillRect(0, 0, W, heroH)
    }
    // 히어로 오버레이 그라디언트
    const heroGrad = ctx.createLinearGradient(0, heroH * 0.4, 0, heroH)
    heroGrad.addColorStop(0, 'rgba(0,0,0,0)'); heroGrad.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = heroGrad; ctx.fillRect(0, 0, W, heroH)

    // Brand Color 상단 바
    ctx.fillStyle = BRAND; ctx.fillRect(0, 0, W, 18)

    // JUST LISTED 배지
    ctx.fillStyle = BRAND
    roundRect(ctx, PAD, heroH - 170, 370, 70, 35); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `bold 32px system-ui, sans-serif`
    ctx.letterSpacing = '4px'; ctx.fillText('JUST LISTED', PAD + 40, heroH - 125); ctx.letterSpacing = '0px'

    // 주소 히어로
    ctx.fillStyle = '#fff'; ctx.font = `bold 88px system-ui, sans-serif`
    const parts = address.split(',')
    ctx.fillText(parts[0] || address, PAD, heroH - 55)

    // 도시/주 라인
    if (parts[1]) {
      ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.font = `52px system-ui, sans-serif`
      ctx.fillText(parts.slice(1).join(',').trim(), PAD, heroH + 10)
    }

    // 스펙 정보 바
    const specY = heroH + 80
    ctx.fillStyle = '#fff'; ctx.fillRect(0, heroH + 40, W, 120)
    ctx.fillStyle = BRAND
    const specs = [
      zillow?.beds  ? `🛏  ${zillow.beds} Beds`   : null,
      zillow?.baths ? `🚿  ${zillow.baths} Baths` : null,
      zillow?.sqft  ? `📐  ${Number(zillow.sqft).toLocaleString()} sq ft` : null,
      zillow?.price ? `💰  ${zillow.price}`        : null,
    ].filter(Boolean)
    const specGap = Math.min((W - PAD * 2) / Math.max(specs.length, 1), 550)
    ctx.font = `bold 42px system-ui, sans-serif`
    specs.forEach((s, i) => ctx.fillText(s, PAD + i * specGap, specY))

    // 구분선
    ctx.fillStyle = BRAND + '33'; ctx.fillRect(PAD, heroH + 175, W - PAD * 2, 3)

    // 설명 텍스트 (MLS copy)
    const descY = heroH + 220
    ctx.fillStyle = '#1D1D1F'; ctx.font = `40px system-ui, sans-serif`
    const descText = results?.mls || ''
    wrapText(ctx, descText, PAD, descY, W - PAD * 2, 58, 8)

    // 사진 그리드 (3장, 중간 영역)
    const gridY = heroH + 780
    const gridH = 520
    const gridW = (W - PAD * 2 - 20) / 3
    if (imgs.length > 1) {
      for (let i = 0; i < Math.min(3, imgs.length - 1); i++) {
        const gx = PAD + i * (gridW + 10)
        ctx.save()
        roundRect(ctx, gx, gridY, gridW, gridH, 20)
        ctx.clip()
        drawCover(ctx, imgs[i + 1], gx, gridY, gridW, gridH)
        ctx.restore()
      }
    }

    // 에이전트 섹션 (하단)
    const agentY = H - 420
    ctx.fillStyle = '#fff'; ctx.fillRect(0, agentY, W, H - agentY)
    ctx.fillStyle = BRAND; ctx.fillRect(0, agentY, W, 6)
    ctx.fillStyle = '#1D1D1F'; ctx.font = `bold 52px system-ui, sans-serif`
    ctx.fillText(profile?.full_name || '', PAD, agentY + 90)
    ctx.fillStyle = BRAND; ctx.font = `36px system-ui, sans-serif`
    ctx.fillText(profile?.brokerage || '', PAD, agentY + 145)
    ctx.fillStyle = '#555'; ctx.font = `34px system-ui, sans-serif`
    const contacts = [profile?.phone, profile?.website_url?.replace(/^https?:\/\//, ''), profile?.email].filter(Boolean)
    contacts.forEach((c, i) => ctx.fillText(c, PAD, agentY + 210 + i * 52))
    // Brand Color 하단 바
    ctx.fillStyle = BRAND; ctx.fillRect(0, H - 18, W, 18)

  } else {
    // ── 가로 브로셔 레이아웃 ─────────────────────────────────────────────────
    const PAD = 100
    const leftW = Math.round(W * 0.42)

    // 왼쪽: 메인 사진
    if (imgs[0]) {
      drawCover(ctx, imgs[0], 0, 0, leftW, H)
    } else {
      ctx.fillStyle = BRAND + '22'; ctx.fillRect(0, 0, leftW, H)
    }
    const lGrad = ctx.createLinearGradient(leftW * 0.5, 0, leftW, 0)
    lGrad.addColorStop(0, 'rgba(0,0,0,0)'); lGrad.addColorStop(1, 'rgba(0,0,0,0.28)')
    ctx.fillStyle = lGrad; ctx.fillRect(0, 0, leftW, H)

    // 브랜드 상단/하단 바
    ctx.fillStyle = BRAND
    ctx.fillRect(0, 0, leftW, 16)
    ctx.fillRect(0, H - 16, leftW, 16)

    // 오른쪽 배경
    ctx.fillStyle = '#fff'; ctx.fillRect(leftW, 0, W - leftW, H)

    // 오른쪽 콘텐츠
    const rx = leftW + PAD
    const rw = W - leftW - PAD * 2

    // JUST LISTED 배지
    ctx.fillStyle = BRAND
    roundRect(ctx, rx, PAD, 300, 58, 29); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `bold 28px system-ui, sans-serif`
    ctx.letterSpacing = '4px'; ctx.fillText('JUST LISTED', rx + 28, PAD + 38); ctx.letterSpacing = '0px'

    // 주소
    ctx.fillStyle = '#1D1D1F'; ctx.font = `bold 72px system-ui, sans-serif`
    const parts = address.split(',')
    const addrEndY = wrapText(ctx, parts[0] || address, rx, PAD + 140, rw, 82)
    if (parts[1]) {
      ctx.fillStyle = '#777'; ctx.font = `42px system-ui, sans-serif`
      ctx.fillText(parts.slice(1).join(',').trim(), rx, addrEndY + 10)
    }

    // 스펙
    const specs = [
      zillow?.beds  ? `${zillow.beds} BD`  : null,
      zillow?.baths ? `${zillow.baths} BA` : null,
      zillow?.sqft  ? `${Number(zillow.sqft).toLocaleString()} SF` : null,
    ].filter(Boolean)
    const specY2 = addrEndY + 80
    ctx.fillStyle = BRAND; ctx.font = `bold 46px system-ui, sans-serif`
    ctx.fillText(specs.join('   ·   '), rx, specY2)

    // 구분선
    ctx.fillStyle = BRAND + '33'; ctx.fillRect(rx, specY2 + 30, rw, 2)

    // 설명
    ctx.fillStyle = '#333'; ctx.font = `36px system-ui, sans-serif`
    const descEnd = wrapText(ctx, results?.mls || '', rx, specY2 + 70, rw, 54, 7)

    // 에이전트 (하단)
    const agY = H - 320
    ctx.fillStyle = BRAND + '15'; ctx.fillRect(leftW, agY, W - leftW, H - agY)
    ctx.fillStyle = BRAND; ctx.fillRect(leftW, agY, W - leftW, 5)
    ctx.fillStyle = '#1D1D1F'; ctx.font = `bold 44px system-ui, sans-serif`
    ctx.fillText(profile?.full_name || '', rx, agY + 72)
    ctx.fillStyle = BRAND; ctx.font = `30px system-ui, sans-serif`
    ctx.fillText(profile?.brokerage || '', rx, agY + 118)
    ctx.fillStyle = '#555'; ctx.font = `28px system-ui, sans-serif`
    const contacts = [profile?.phone, profile?.website_url?.replace(/^https?:\/\//, '')].filter(Boolean)
    contacts.forEach((c, i) => ctx.fillText(c, rx, agY + 165 + i * 42))

    // 오른쪽 브랜드 바
    ctx.fillStyle = BRAND
    ctx.fillRect(leftW, 0, 8, H)
    ctx.fillRect(W - 8, 0, 8, H)
  }
}


// ─── MODERN 템플릿 ───────────────────────────────────────────────────────────
async function renderBrochureModern(canvas, { orientation, address, results, profile, photos, photoUrls, zillow }) {
  const dim = BROCHURE[orientation]
  canvas.width = dim.w; canvas.height = dim.h
  const ctx = canvas.getContext('2d')
  const W = dim.w; const H = dim.h
  const BRAND = profile?.brand_color || '#D94035'
  const isPort = orientation === 'portrait'
  const PAD = isPort ? 120 : 100
  const imgSrcs = [...photos.filter(p=>!p.isPDF).map(p=>p.preview||`data:image/jpeg;base64,${p.base64}`),...photoUrls].filter(Boolean).slice(0,6)
  let imgs = []; try { imgs = await Promise.all(imgSrcs.map(loadImage)) } catch {}

  if (isPort) {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H)
    const heroH = Math.round(H * 0.40)
    if (imgs[0]) { drawCover(ctx, imgs[0], 0, 0, W, heroH) } else { ctx.fillStyle = '#E8E8E8'; ctx.fillRect(0, 0, W, heroH) }
    ctx.fillStyle = BRAND; ctx.fillRect(0, heroH, W, 12)
    const addrY = heroH + 90
    ctx.fillStyle = '#1A1A1A'; ctx.font = `bold 90px system-ui, sans-serif`
    const parts = address.split(',')
    const addrEndY = wrapText(ctx, parts[0] || address, PAD, addrY, W - PAD * 2, 100, 2)
    if (parts[1]) { ctx.fillStyle = '#888'; ctx.font = `48px system-ui, sans-serif`; ctx.fillText(parts.slice(1).join(',').trim(), PAD, addrEndY + 20) }
    const specs = [zillow?.beds?`${zillow.beds} Beds`:null, zillow?.baths?`${zillow.baths} Baths`:null, zillow?.sqft?`${Number(zillow.sqft).toLocaleString()} sf`:null, zillow?.price?zillow.price:null].filter(Boolean)
    const pillY = addrEndY + 110
    let pillX = PAD
    ctx.font = `bold 36px system-ui, sans-serif`
    specs.forEach(s => {
      const tw = ctx.measureText(s).width; const ph = 72
      roundRect(ctx, pillX, pillY - ph + 12, tw + 56, ph, 36)
      ctx.fillStyle = BRAND + '18'; ctx.fill()
      ctx.strokeStyle = BRAND + '88'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = BRAND; ctx.fillText(s, pillX + 28, pillY)
      pillX += tw + 76
    })
    ctx.fillStyle = '#E0E0E0'; ctx.fillRect(PAD, pillY + 50, W - PAD * 2, 2)
    ctx.fillStyle = '#444'; ctx.font = `38px system-ui, sans-serif`
    wrapText(ctx, results?.mls || '', PAD, pillY + 110, W - PAD * 2, 56, 9)
    const gridY = pillY + 820; const gridH = 500; const gridW = (W - PAD * 2 - 20) / 3
    if (imgs.length > 1) {
      for (let i = 0; i < Math.min(3, imgs.length - 1); i++) {
        const gx = PAD + i * (gridW + 10)
        ctx.save(); roundRect(ctx, gx, gridY, gridW, gridH, 16); ctx.clip(); drawCover(ctx, imgs[i+1], gx, gridY, gridW, gridH); ctx.restore()
      }
    }
    const agY = H - 400
    ctx.fillStyle = '#FAFAFA'; ctx.fillRect(0, agY, W, H - agY)
    ctx.fillStyle = BRAND; ctx.fillRect(PAD, agY + 10, 80, 6)
    ctx.fillStyle = '#1A1A1A'; ctx.font = `bold 52px system-ui, sans-serif`; ctx.fillText(profile?.full_name || '', PAD, agY + 90)
    ctx.fillStyle = BRAND; ctx.font = `36px system-ui, sans-serif`; ctx.fillText(profile?.brokerage || '', PAD, agY + 145)
    ctx.fillStyle = '#666'; ctx.font = `32px system-ui, sans-serif`
    const contacts = [profile?.phone, profile?.website_url?.replace(/^https?:\/\//, '')].filter(Boolean)
    contacts.forEach((c, i) => ctx.fillText(c, PAD, agY + 200 + i * 48))
  } else {
    const leftW = Math.round(W * 0.50)
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H)
    if (imgs[0]) { drawCover(ctx, imgs[0], 0, 0, leftW, H) } else { ctx.fillStyle = '#E8E8E8'; ctx.fillRect(0, 0, leftW, H) }
    ctx.fillStyle = BRAND; ctx.fillRect(leftW, 0, 8, H)
    const rx = leftW + PAD + 8; const rw = W - leftW - PAD * 2 - 8
    ctx.fillStyle = '#1A1A1A'; ctx.font = `bold 76px system-ui, sans-serif`
    const parts = address.split(',')
    const addrEndY = wrapText(ctx, parts[0] || address, rx, PAD + 120, rw, 88)
    if (parts[1]) { ctx.fillStyle = '#888'; ctx.font = `42px system-ui, sans-serif`; ctx.fillText(parts.slice(1).join(',').trim(), rx, addrEndY + 20) }
    const specs = [zillow?.beds?`${zillow.beds} BD`:null, zillow?.baths?`${zillow.baths} BA`:null, zillow?.sqft?`${Number(zillow.sqft).toLocaleString()} SF`:null].filter(Boolean)
    const specY = addrEndY + 80
    ctx.fillStyle = BRAND; ctx.font = `bold 44px system-ui, sans-serif`; ctx.fillText(specs.join('  ·  '), rx, specY)
    ctx.fillStyle = '#E0E0E0'; ctx.fillRect(rx, specY + 28, rw, 2)
    ctx.fillStyle = '#444'; ctx.font = `34px system-ui, sans-serif`; wrapText(ctx, results?.mls || '', rx, specY + 72, rw, 52, 7)
    const agY = H - 300
    ctx.fillStyle = '#FAFAFA'; ctx.fillRect(leftW + 8, agY, W - leftW - 8, H - agY)
    ctx.fillStyle = BRAND; ctx.fillRect(rx, agY + 8, 60, 5)
    ctx.fillStyle = '#1A1A1A'; ctx.font = `bold 44px system-ui, sans-serif`; ctx.fillText(profile?.full_name || '', rx, agY + 72)
    ctx.fillStyle = BRAND; ctx.font = `30px system-ui, sans-serif`; ctx.fillText(profile?.brokerage || '', rx, agY + 118)
    ctx.fillStyle = '#666'; ctx.font = `26px system-ui, sans-serif`
    const cs = [profile?.phone, profile?.website_url?.replace(/^https?:\/\//, '')].filter(Boolean)
    cs.forEach((c, i) => ctx.fillText(c, rx, agY + 162 + i * 40))
  }
}

// ─── DARK 템플릿 ─────────────────────────────────────────────────────────────
async function renderBrochureDark(canvas, { orientation, address, results, profile, photos, photoUrls, zillow }) {
  const dim = BROCHURE[orientation]
  canvas.width = dim.w; canvas.height = dim.h
  const ctx = canvas.getContext('2d')
  const W = dim.w; const H = dim.h
  const BRAND = profile?.brand_color || '#D94035'
  const isPort = orientation === 'portrait'
  const PAD = isPort ? 120 : 100
  const imgSrcs = [...photos.filter(p=>!p.isPDF).map(p=>p.preview||`data:image/jpeg;base64,${p.base64}`),...photoUrls].filter(Boolean).slice(0,6)
  let imgs = []; try { imgs = await Promise.all(imgSrcs.map(loadImage)) } catch {}

  if (isPort) {
    ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, W, H)
    const heroH = Math.round(H * 0.45)
    if (imgs[0]) { drawCover(ctx, imgs[0], 0, 0, W, heroH) } else { ctx.fillStyle = '#2A2A2A'; ctx.fillRect(0, 0, W, heroH) }
    const heroGrad = ctx.createLinearGradient(0, heroH * 0.5, 0, heroH)
    heroGrad.addColorStop(0, 'rgba(20,20,20,0)'); heroGrad.addColorStop(1, 'rgba(20,20,20,0.80)')
    ctx.fillStyle = heroGrad; ctx.fillRect(0, 0, W, heroH)
    ctx.fillStyle = BRAND; ctx.fillRect(0, heroH, W, 10)
    const addrY = heroH + 90
    ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 90px system-ui, sans-serif`
    const parts = address.split(',')
    const addrEndY = wrapText(ctx, parts[0] || address, PAD, addrY, W - PAD * 2, 100, 2)
    if (parts[1]) { ctx.fillStyle = '#888'; ctx.font = `48px system-ui, sans-serif`; ctx.fillText(parts.slice(1).join(',').trim(), PAD, addrEndY + 20) }
    if (zillow?.price) { ctx.fillStyle = BRAND; ctx.font = `bold 64px system-ui, sans-serif`; ctx.fillText(zillow.price, PAD, addrEndY + 110) }
    const specs = [zillow?.beds?`${zillow.beds} Beds`:null, zillow?.baths?`${zillow.baths} Baths`:null, zillow?.sqft?`${Number(zillow.sqft).toLocaleString()} sq ft`:null].filter(Boolean)
    const specY = addrEndY + (zillow?.price ? 195 : 105)
    if (specs.length) { ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = `40px system-ui, sans-serif`; ctx.fillText(specs.join('  ·  '), PAD, specY) }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(PAD, specY + 30, W - PAD * 2, 1)
    ctx.fillStyle = '#AAAAAA'; ctx.font = `38px system-ui, sans-serif`; wrapText(ctx, results?.mls || '', PAD, specY + 88, W - PAD * 2, 56, 8)
    const gridY = specY + 840; const gridH = 500; const gridW = (W - PAD * 2 - 20) / 3
    if (imgs.length > 1) {
      for (let i = 0; i < Math.min(3, imgs.length - 1); i++) {
        const gx = PAD + i * (gridW + 10)
        ctx.save(); roundRect(ctx, gx, gridY, gridW, gridH, 16); ctx.clip(); drawCover(ctx, imgs[i+1], gx, gridY, gridW, gridH); ctx.restore()
        ctx.save(); roundRect(ctx, gx, gridY, gridW, gridH, 16); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(gx, gridY, gridW, gridH); ctx.restore()
      }
    }
    const agY = H - 420
    ctx.fillStyle = '#1E1E1E'; ctx.fillRect(0, agY, W, H - agY)
    ctx.fillStyle = BRAND; ctx.fillRect(PAD, agY + 10, 80, 4)
    ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 52px system-ui, sans-serif`; ctx.fillText(profile?.full_name || '', PAD, agY + 90)
    ctx.fillStyle = BRAND; ctx.font = `36px system-ui, sans-serif`; ctx.fillText(profile?.brokerage || '', PAD, agY + 145)
    ctx.fillStyle = '#777'; ctx.font = `32px system-ui, sans-serif`
    const contacts = [profile?.phone, profile?.website_url?.replace(/^https?:\/\//, '')].filter(Boolean)
    contacts.forEach((c, i) => ctx.fillText(c, PAD, agY + 200 + i * 48))
    ctx.fillStyle = BRAND; ctx.fillRect(0, H - 12, W, 12)
  } else {
    const leftW = Math.round(W * 0.52)
    ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, W, H)
    if (imgs[0]) { drawCover(ctx, imgs[0], 0, 0, leftW, H) } else { ctx.fillStyle = '#2A2A2A'; ctx.fillRect(0, 0, leftW, H) }
    const lGrad = ctx.createLinearGradient(leftW * 0.6, 0, leftW, 0)
    lGrad.addColorStop(0, 'rgba(20,20,20,0)'); lGrad.addColorStop(1, 'rgba(20,20,20,0.55)')
    ctx.fillStyle = lGrad; ctx.fillRect(0, 0, leftW, H)
    ctx.fillStyle = BRAND; ctx.fillRect(leftW, 0, 8, H)
    const rx = leftW + PAD + 8; const rw = W - leftW - PAD * 2 - 8
    if (zillow?.price) { ctx.fillStyle = BRAND; ctx.font = `bold 60px system-ui, sans-serif`; ctx.fillText(zillow.price, rx, PAD + 80) }
    ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 72px system-ui, sans-serif`
    const parts = address.split(',')
    const addrEndY = wrapText(ctx, parts[0] || address, rx, PAD + (zillow?.price ? 170 : 80), rw, 84)
    if (parts[1]) { ctx.fillStyle = '#888'; ctx.font = `40px system-ui, sans-serif`; ctx.fillText(parts.slice(1).join(',').trim(), rx, addrEndY + 20) }
    const specs = [zillow?.beds?`${zillow.beds} BD`:null, zillow?.baths?`${zillow.baths} BA`:null, zillow?.sqft?`${Number(zillow.sqft).toLocaleString()} SF`:null].filter(Boolean)
    const specY = addrEndY + 70
    if (specs.length) { ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = `38px system-ui, sans-serif`; ctx.fillText(specs.join('  ·  '), rx, specY) }
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(rx, specY + 28, rw, 1)
    ctx.fillStyle = '#AAAAAA'; ctx.font = `32px system-ui, sans-serif`; wrapText(ctx, results?.mls || '', rx, specY + 72, rw, 48, 7)
    const agY = H - 300
    ctx.fillStyle = '#1E1E1E'; ctx.fillRect(leftW + 8, agY, W - leftW - 8, H - agY)
    ctx.fillStyle = BRAND; ctx.fillRect(rx, agY + 8, 60, 4)
    ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 44px system-ui, sans-serif`; ctx.fillText(profile?.full_name || '', rx, agY + 72)
    ctx.fillStyle = BRAND; ctx.font = `30px system-ui, sans-serif`; ctx.fillText(profile?.brokerage || '', rx, agY + 118)
    ctx.fillStyle = '#777'; ctx.font = `26px system-ui, sans-serif`
    const cs = [profile?.phone, profile?.website_url?.replace(/^https?:\/\//, '')].filter(Boolean)
    cs.forEach((c, i) => ctx.fillText(c, rx, agY + 162 + i * 40))
  }
}

// ─── SNS 템플릿 렌더러 ───────────────────────────────────────────────────────
async function renderSNS(canvas, { format, address, results, profile, photos, photoUrls, zillow }) {
  const dim = SNS[format]
  canvas.width  = dim.w
  canvas.height = dim.h
  const ctx   = canvas.getContext('2d')
  const W     = dim.w
  const H     = dim.h
  const BRAND = profile?.brand_color || '#D94035'

  const imgSrcs = [
    ...photos.filter(p => !p.isPDF).map(p => p.preview || `data:image/jpeg;base64,${p.base64}`),
    ...photoUrls,
  ].filter(Boolean)

  let imgs = []
  try { imgs = await Promise.all(imgSrcs.slice(0, 1).map(loadImage)) } catch {}

  // 배경 이미지
  if (imgs[0]) {
    drawCover(ctx, imgs[0], 0, 0, W, H)
  } else {
    ctx.fillStyle = BRAND; ctx.fillRect(0, 0, W, H)
  }

  // 그라디언트 오버레이 (하단 2/3)
  const grad = ctx.createLinearGradient(0, H * 0.2, 0, H)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.4, 'rgba(0,0,0,0.35)')
  grad.addColorStop(1, 'rgba(0,0,0,0.80)')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

  // Brand Color 좌측 바
  ctx.fillStyle = BRAND; ctx.fillRect(0, 0, 10, H)

  const PAD = Math.round(W * 0.075)

  if (format === 'story') {
    // Story 레이아웃 (세로)
    // 상단: JUST LISTED 배지
    ctx.fillStyle = BRAND
    roundRect(ctx, PAD, PAD * 1.5, 340, 64, 32); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `bold 28px system-ui, sans-serif`
    ctx.letterSpacing = '3px'; ctx.fillText('JUST LISTED', PAD + 32, PAD * 1.5 + 42); ctx.letterSpacing = '0px'

    // 중간: 주소
    ctx.fillStyle = '#fff'; ctx.font = `bold 84px system-ui, sans-serif`
    const parts = address.split(',')
    wrapText(ctx, parts[0] || address, PAD, H * 0.35, W - PAD * 2, 96)

    // 스펙
    const specs = [zillow?.beds ? `${zillow.beds} BD` : null, zillow?.baths ? `${zillow.baths} BA` : null, zillow?.sqft ? `${Number(zillow.sqft).toLocaleString()} SF` : null].filter(Boolean)
    if (specs.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(PAD, H * 0.52, W - PAD * 2, 2)
      ctx.fillStyle = '#fff'; ctx.font = `bold 52px system-ui, sans-serif`
      ctx.fillText(specs.join('  ·  '), PAD, H * 0.58)
    }

    // 하단: 에이전트
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `bold 44px system-ui, sans-serif`
    ctx.fillText(profile?.full_name || '', PAD, H - 220)
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = `32px system-ui, sans-serif`
    ctx.fillText(profile?.brokerage || '', PAD, H - 165)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `28px system-ui, sans-serif`
    ctx.fillText(profile?.phone || '', PAD, H - 120)

  } else {
    // Square / Portrait 레이아웃
    const isSquare = format === 'square'
    const textY = isSquare ? H * 0.55 : H * 0.60

    // JUST LISTED
    ctx.fillStyle = BRAND
    roundRect(ctx, PAD, textY - 100, 300, 56, 28); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `bold 24px system-ui, sans-serif`
    ctx.letterSpacing = '3px'; ctx.fillText('JUST LISTED', PAD + 24, textY - 63); ctx.letterSpacing = '0px'

    // 주소
    ctx.fillStyle = '#fff'; ctx.font = `bold ${isSquare ? 64 : 72}px system-ui, sans-serif`
    const parts = address.split(',')
    const addrEndY = wrapText(ctx, parts[0] || address, PAD, textY, W - PAD * 2, isSquare ? 74 : 84)

    // 스펙
    const specs = [zillow?.beds ? `${zillow.beds} BD` : null, zillow?.baths ? `${zillow.baths} BA` : null].filter(Boolean)
    if (specs.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `bold ${isSquare ? 36 : 40}px system-ui, sans-serif`
      ctx.fillText(specs.join('  ·  '), PAD, addrEndY + 18)
    }

    // 에이전트
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = `bold ${isSquare ? 30 : 34}px system-ui, sans-serif`
    ctx.fillText(profile?.full_name || '', PAD, H - 80)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `${isSquare ? 24 : 26}px system-ui, sans-serif`
    ctx.fillText(profile?.brokerage || '', PAD, H - 44)
  }

  // 하단 브랜드 바
  ctx.fillStyle = BRAND; ctx.fillRect(0, H - 10, W, 10)
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function MarketingModal({ address, results, profile, photos = [], photoUrls = [], zillow, onClose }) {
  const [tab,         setTab]         = useState('brochure')
  const [orientation, setOrientation] = useState('portrait')
  const [snsFormat,   setSnsFormat]   = useState('square')
  const [rendering,   setRendering]   = useState(false)
  const [rendered,    setRendered]    = useState(false)
  const [errMsg,      setErrMsg]      = useState('')
  const [template,    setTemplate]    = useState('classic')

  // ─── 독립 모드: 자체 입력값 (props로 초기화, 직접 편집 가능) ───────────────
  const [propAddr,  setPropAddr]  = useState(address || '')
  const [propBeds,  setPropBeds]  = useState(zillow?.beds  ?? '')
  const [propBaths, setPropBaths] = useState(zillow?.baths ?? '')
  const [propSqft,  setPropSqft]  = useState(zillow?.sqft  ?? '')
  const [propPrice, setPropPrice] = useState(zillow?.price ?? '')
  const [propDesc,  setPropDesc]  = useState(results?.mls  ?? '')
  const [localPhotos, setLocalPhotos] = useState(photos || [])

  // props가 나중에 채워지면 동기화 (listing 서비스 연동)
  useEffect(() => { if (address) setPropAddr(address) }, [address])
  useEffect(() => { if (zillow?.beds)  setPropBeds(zillow.beds)   }, [zillow?.beds])
  useEffect(() => { if (zillow?.baths) setPropBaths(zillow.baths) }, [zillow?.baths])
  useEffect(() => { if (zillow?.sqft)  setPropSqft(zillow.sqft)   }, [zillow?.sqft])
  useEffect(() => { if (zillow?.price) setPropPrice(zillow.price)  }, [zillow?.price])
  useEffect(() => { if (results?.mls)  setPropDesc(results.mls)   }, [results?.mls])
  useEffect(() => { if (photos?.length) setLocalPhotos(photos)    }, [photos])

  const canvasRef  = useRef(null)
  const previewRef = useRef(null)
  const photoInputRef = useRef(null)

  // 독립 모드 데이터: 내부 상태를 canvas 렌더에 전달
  const renderData = {
    address:   propAddr,
    profile,
    photos:    localPhotos,
    photoUrls,
    results:   { mls: propDesc },
    zillow:    { beds: propBeds, baths: propBaths, sqft: propSqft, price: propPrice },
  }

  // 로컬 사진 추가
  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files)
    const readers = files.map(file => new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = ev => resolve({ name: file.name, type: file.type, preview: ev.target.result })
      reader.readAsDataURL(file)
    }))
    Promise.all(readers).then(newPhotos => {
      setLocalPhotos(prev => [...prev, ...newPhotos])
      setRendered(false)
    })
  }

  const doRender = useCallback(async () => {
    setRendering(true); setRendered(false); setErrMsg('')
    try {
      const canvas = canvasRef.current
      if (tab === 'brochure') {
        if (template === 'modern') await renderBrochureModern(canvas, { ...renderData, orientation })
        else if (template === 'dark') await renderBrochureDark(canvas, { ...renderData, orientation })
        else await renderBrochureClassic(canvas, { ...renderData, orientation })
      } else {
        await renderSNS(canvas, { ...renderData, format: snsFormat })
      }
      // 미리보기 업데이트
      if (previewRef.current) {
        previewRef.current.src = canvas.toDataURL('image/jpeg', 0.85)
      }
      setRendered(true)
    } catch (e) {
      setErrMsg('Render error: ' + e.message)
    } finally {
      setRendering(false)
    }
  }, [tab, orientation, snsFormat, template, address, results, profile, photos, photoUrls, zillow])

  const downloadPNG = () => {
    if (!canvasRef.current || !rendered) return
    const a = document.createElement('a')
    const slug = address.split(',')[0].replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const suffix = tab === 'brochure' ? `brochure_${orientation}` : `sns_${snsFormat}`
    a.href = canvasRef.current.toDataURL('image/png')
    a.download = `${slug}_${suffix}.png`
    a.click()
  }

  const downloadJPEG = () => {
    if (!canvasRef.current || !rendered) return
    const a = document.createElement('a')
    const slug = address.split(',')[0].replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const suffix = tab === 'brochure' ? `brochure_${orientation}` : `sns_${snsFormat}`
    a.href = canvasRef.current.toDataURL('image/jpeg', 0.92)
    a.download = `${slug}_${suffix}.jpg`
    a.click()
  }

  const currentDim = tab === 'brochure' ? BROCHURE[orientation] : SNS[snsFormat]

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Image size={20} style={{ color: 'var(--icon)' }} />
            <div>
              <h2 className={styles.title}>D-Lap</h2>
              <p className={styles.sub}>Brochure · SNS · PNG / JPEG Download</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.body}>
          {/* 좌측: 미리보기 */}
          <div className={styles.previewCol}>
            <div className={`${styles.previewFrame} ${tab === 'brochure' && orientation === 'landscape' ? styles.landscape : ''}`}>
              {rendered ? (
                <img ref={previewRef} className={styles.previewImg} alt="Marketing material preview" />
              ) : (
                <div className={styles.previewPlaceholder}>
                  <FileText size={32} style={{ opacity: 0.3 }} />
                  <p>Generate to preview</p>
                  <p className={styles.previewDim}>{currentDim.label}</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* 우측: 컨트롤 */}
          <div className={styles.controlCol}>

            {/* ── Property Info (독립 모드: 직접 입력 or listing에서 자동입력) ── */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Property</p>
              <input
                className={styles.propInput}
                placeholder="Property address"
                value={propAddr}
                onChange={e => { setPropAddr(e.target.value); setRendered(false) }}
              />
              <div className={styles.propRow}>
                <input className={styles.propInputSm} placeholder="Beds" type="number" min="0" value={propBeds}  onChange={e => { setPropBeds(e.target.value);  setRendered(false) }} />
                <input className={styles.propInputSm} placeholder="Baths" type="number" min="0" value={propBaths} onChange={e => { setPropBaths(e.target.value); setRendered(false) }} />
                <input className={styles.propInputSm} placeholder="Sq ft" type="number" min="0" value={propSqft}  onChange={e => { setPropSqft(e.target.value);  setRendered(false) }} />
                <input className={styles.propInputSm} placeholder="Price" value={propPrice} onChange={e => { setPropPrice(e.target.value); setRendered(false) }} />
              </div>
              <textarea
                className={styles.propTextarea}
                placeholder="Listing description (optional — used in brochure)"
                rows={3}
                value={propDesc}
                onChange={e => { setPropDesc(e.target.value); setRendered(false) }}
              />
            </div>

            {/* ── Photos ─────────────────────────────────────────────────── */}
            <div className={styles.section}>
              <div className={styles.photoHeader}>
                <p className={styles.sectionTitle}>Photos</p>
                <button className={styles.photoAddBtn} onClick={() => photoInputRef.current?.click()}>
                  + Add
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={handlePhotoAdd} />
              </div>
              {localPhotos.length > 0 ? (
                <div className={styles.photoStrip}>
                  {localPhotos.filter(p => !p.isPDF).slice(0, 6).map((p, i) => (
                    <div key={i} className={styles.photoThumb} style={{ backgroundImage: `url(${p.preview})` }}>
                      <button className={styles.photoRemove} onClick={() => { setLocalPhotos(prev => prev.filter((_, j) => j !== i)); setRendered(false) }}>×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.photoEmpty}>No photos — click Add to upload property photos</p>
              )}
            </div>

            {/* 탭: Brochure / SNS */}
            <div className={styles.tabRow}>
              <button
                className={`${styles.tabBtn} ${tab === 'brochure' ? styles.tabBtnActive : ''}`}
                onClick={() => { setTab('brochure'); setRendered(false) }}>
                <FileText size={15} /> Brochure
              </button>
              <button
                className={`${styles.tabBtn} ${tab === 'sns' ? styles.tabBtnActive : ''}`}
                onClick={() => { setTab('sns'); setRendered(false) }}>
                <Smartphone size={15} /> SNS
              </button>
            </div>

            {/* Brochure 옵션 */}
            {tab === 'brochure' && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Orientation</p>
                <div className={styles.optionRow}>
                  {Object.entries(BROCHURE).map(([key, val]) => (
                    <button
                      key={key}
                      className={`${styles.optBtn} ${orientation === key ? styles.optBtnActive : ''}`}
                      onClick={() => { setOrientation(key); setRendered(false) }}>
                      {key === 'portrait' ? '📄' : '🖥️'} {val.label}
                    </button>
                  ))}
                </div>
                <p className={styles.hint}>Portrait: Print / Email  ·  Landscape: Presentation</p>
              </div>

              <div className={styles.section}>
                <p className={styles.sectionTitle}>Template</p>
                <div className={styles.optionRow}>
                  <button
                    className={`${styles.optBtn} ${template === 'classic' ? styles.optBtnActive : ''}`}
                    onClick={() => { setTemplate('classic'); setRendered(false) }}>
                    ⬜ Classic
                  </button>
                  <button
                    className={`${styles.optBtn} ${template === 'modern' ? styles.optBtnActive : ''}`}
                    onClick={() => { setTemplate('modern'); setRendered(false) }}>
                    🗒 Modern
                  </button>
                  <button
                    className={`${styles.optBtn} ${template === 'dark' ? styles.optBtnActive : ''}`}
                    onClick={() => { setTemplate('dark'); setRendered(false) }}>
                    🌑 Dark
                  </button>
                </div>
              </div>
            )}

            {/* SNS 옵션 */}
            {tab === 'sns' && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Format</p>
                <div className={styles.optionCol}>
                  {Object.entries(SNS).map(([key, val]) => (
                    <button
                      key={key}
                      className={`${styles.optBtn} ${snsFormat === key ? styles.optBtnActive : ''}`}
                      onClick={() => { setSnsFormat(key); setRendered(false) }}>
                      <span className={styles.optBtnLabel}>{val.label}</span>
                      <span className={styles.optBtnSub}>{val.platform}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 에이전트 정보 확인 */}
            <div className={styles.agentCheck}>
              <p className={styles.sectionTitle}>Design DNA</p>
              <div className={styles.dnaItems}>
                <DnaItem label="Name" value={profile?.full_name} />
                <DnaItem label="Brokerage" value={profile?.brokerage} />
                <DnaItem label="Brand Color" value={profile?.brand_color} isColor />
                <DnaItem label="Phone" value={profile?.phone} />
              </div>
              {(!profile?.full_name || !profile?.brokerage) && (
                <p className={styles.dnaWarning}>⚠️ Add your info in Profile to personalize this marketing material</p>
              )}
            </div>

            {/* 에러 */}
            {errMsg && <p className={styles.errorMsg}>{errMsg}</p>}

            {/* 액션 */}
            <div className={styles.actions}>
              <button className={styles.generateBtn} onClick={doRender} disabled={rendering}>
                {rendering ? (
                  <><span className={styles.spinner} /> Rendering…</>
                ) : (
                  <><RotateCcw size={15} /> {rendered ? 'Re-generate' : 'Generate'}</>
                )}
              </button>
              {rendered && (
                <>
                  <button className={styles.dlBtn} onClick={downloadPNG}>
                    <Download size={14} /> PNG
                  </button>
                  <button className={styles.dlBtn} onClick={downloadJPEG}>
                    <Download size={14} /> JPEG
                  </button>
                </>
              )}
            </div>

            <p className={styles.techNote}>
              Print resolution (300 dpi) · Browser rendering · No extra cost
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DnaItem({ label, value, isColor }) {
  const hasValue = Boolean(value)
  return (
    <div className={styles.dnaItem}>
      <span className={styles.dnaLabel}>{label}</span>
      {isColor && hasValue ? (
        <span className={styles.dnaColorChip} style={{ background: value }} title={value} />
      ) : (
        <span className={`${styles.dnaValue} ${!hasValue ? styles.dnaValueMissing : ''}`}>
          {hasValue ? value : 'Not set'}
        </span>
      )}
    </div>
  )
}
