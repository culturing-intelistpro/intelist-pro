-- Migration 003: video_feedback table
-- 에이전트 동영상 수정요청 저장 → 개인화 데이터 축적
-- 실행: Supabase Dashboard > SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS public.video_feedback (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id    UUID        REFERENCES public.listings(id) ON DELETE SET NULL,
  feedback_text TEXT        NOT NULL,
  applied       BOOLEAN     DEFAULT false,   -- 실제 적용됐는지 여부
  params_json   JSONB,                       -- 파싱된 수정 파라미터 (향후 활용)
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.video_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_feedback: users can CRUD own rows"
  ON public.video_feedback
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_video_feedback_user ON public.video_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_video_feedback_listing ON public.video_feedback(listing_id);

COMMENT ON TABLE public.video_feedback IS
  '에이전트 동영상 수정요청 — 개인화 학습 데이터로 활용';
