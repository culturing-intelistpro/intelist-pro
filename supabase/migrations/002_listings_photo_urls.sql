-- ============================================================
-- Intelist Pro — listings에 photo_urls 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. listings 테이블에 photo_urls 배열 컬럼 추가
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- 2. Supabase Dashboard → Storage에서 아래 버킷을 수동으로 생성하세요:
--    Bucket name: listing-photos
--    Public: OFF (private)
--    File size limit: 5MB
--    Allowed MIME types: image/jpeg, image/png, image/webp

-- 3. Storage → Policies에서 아래 정책 추가:
--    Policy name: "Users manage their own listing photos"
--    Operation: ALL
--    Target roles: authenticated
--    USING: (auth.uid()::text = (storage.foldername(name))[1])
--    WITH CHECK: (auth.uid()::text = (storage.foldername(name))[1])
