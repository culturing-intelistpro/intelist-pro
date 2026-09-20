# Intelist Pro — Product Roadmap
> 부동산 에이전트를 위한 구글 랩스

## 비전
에이전트의 디자인 DNA를 추출·저장하고,
몇 번의 클릭만으로 모든 마케팅 자료를 자동 완성하는 플랫폼.

---

## Phase 1 ✅ 완료
**리스팅 카피 AI 자동 생성**
- 주소 입력 → MLS 카피 / 포털 카피 / SNS 캡션 3종 즉시 생성
- 에이전트 노트 · 음성 녹음 · 사진/PDF 업로드 지원
- AI 재작성(Revise All) 기능
- Supabase 이력 저장 (My Listings)

## Phase 2 🚧 진행 중
**에이전트 개인화 프로필 시스템**
- `profiles` 테이블에 디자인 DNA 저장:
  이름, 연락처, 소속사, 브랜드 색상, 로고, 프로필 사진,
  카피 톤(professional/warm/luxury/energetic),
  이전 리스팅 샘플, 전문 분야, 자격증, 태그라인
- 개인화 점수 체크리스트 (0~100%)
- 저장된 프로필 → 생성 프롬프트 자동 주입
- **마이그레이션**: `supabase/migrations/001_agent_profile_fields.sql` 실행 필요

## Phase 3 📋 예정
**2D 마케팅 자료 자동 생성**
- 브로셔 (A4/Letter, PDF 출력) — 에이전트 프로필 + 리스팅 카피 + 사진 자동 레이아웃
- SNS 홍보물 (Instagram 1:1, Stories 9:16, Facebook 1.91:1)
- 브랜드 색상 · 로고 · 프로필 사진 자동 적용
- 클릭 3번으로 완성: 주소 입력 → 생성 → 다운로드
- 방향 선택: **기본값 세로(Portrait)**, 가로(Landscape)로 전환 가능

## Phase 4 🔮 비전
**1분 슬라이드 영상 자동 생성** ← 에이전트들 환장할 기능 😄
- 첨부 사진들 + 리스팅 카피 + 에이전트 디자인 DNA
- 슬라이드 쇼 형태 MP4 자동 생성 (자막, 브랜드 색상, 로고 워터마크 포함)
- SNS별 최적 포맷 (Instagram Reels, YouTube Shorts, TikTok)
- BGM 선택 옵션

---

## 기술 스택
- Frontend: React + Vite + CSS Modules
- Backend: Vercel Serverless Functions
- DB: Supabase (PostgreSQL + RLS)
- AI: Claude claude-opus-4-6 (카피 생성)
- 예정: Runway / Sora API (동영상 생성), PDFKit (브로셔 생성)

## 용어 기준
Amazon UI 메뉴 기준으로 통일 (Products → Listings, Account → Profile 등)
