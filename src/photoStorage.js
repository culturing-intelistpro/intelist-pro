// photoStorage.js — Supabase Storage에 사진 압축 업로드
// 보안: 경로를 {userId}/{listingId}/ 로 구성해 RLS에서 uid 기반 접근 제어
import { supabase } from './supabase'

const BUCKET = 'listing-photos'
const MAX_SIDE = 1280   // 마케팅/영상용 충분한 해상도
const JPEG_QUALITY = 0.75

/**
 * base64 이미지를 최대 MAX_SIDE × MAX_SIDE로 리사이즈 후 JPEG 압축
 * @returns {Blob}
 */
async function compressForStorage(base64) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
        'image/jpeg', JPEG_QUALITY)
    }
    img.onerror = reject
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * 리스팅 사진들을 Supabase Storage에 업로드하고 공개 URL 배열을 반환
 * @param {string} userId
 * @param {string} listingId
 * @param {Array<{base64: string, name: string}>} photos - isPDF=false 인 것들만
 * @returns {Promise<string[]>} - public URLs
 */
export async function uploadListingPhotos(userId, listingId, photos) {
  if (!userId || !listingId || !photos.length) return []

  const results = await Promise.allSettled(
    photos.map(async (photo, idx) => {
      try {
        const blob = await compressForStorage(photo.base64)
        const path = `${userId}/${listingId}/photo_${String(idx + 1).padStart(2, '0')}.jpg`
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        return data.publicUrl
      } catch (e) {
        console.warn(`[Storage] photo_${idx + 1} upload failed:`, e?.message)
        return null
      }
    })
  )

  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
}

/**
 * 리스팅의 저장된 사진 URLs를 Supabase DB에서 가져옴
 * @param {string} listingId
 * @returns {Promise<string[]>}
 */
export async function fetchListingPhotoUrls(listingId) {
  try {
    const { data } = await supabase
      .from('listings')
      .select('photo_urls')
      .eq('id', listingId)
      .maybeSingle()
    return data?.photo_urls ?? []
  } catch { return [] }
}
