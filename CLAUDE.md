# Intelist Pro — AI 코딩 가이드

## 핵심 원칙

1. **기존 기능을 절대 깨뜨리지 말 것** — 새 코드는 기존 동작에 영향을 주지 않는다
2. **엉뚱한 파일 삭제 금지** — 파일 삭제 전 반드시 확인
3. **보안 위험은 사전에 언급** — 환경변수, API 키, RLS 정책 변경 시 리스크 명시
4. **Amazon UI 용어 기준** — 메뉴명, 버튼명 등 UI 용어는 Amazon 표준 참조

## 디자인 시스템 바인딩

**모든 UI 작업 전 `DESIGN.md`를 참조할 것.**

- 색상 토큰: `--bg`, `--text-1`, `--accent`, `--icon` 등 CSS 변수 사용
- 하드코딩 금지: `#0071E3` 대신 `var(--accent)`, `#D94035` 대신 `var(--icon)` 사용
- 예외: `#34C759`(성공), `#ABABAB`(타임스탬프) 등 단일 역할 색상은 DESIGN.md 섹션 2 참조
- 새 컴포넌트는 DESIGN.md 섹션 5의 패턴 먼저 확인

## 기술 스택

- **프레임워크**: React + Vite (CSS Modules)
- **배포**: Vercel (자동 배포 — main 브랜치 push 시)
- **DB**: Supabase (PostgreSQL + RLS)
- **빌드 확인**: `./node_modules/.bin/vite build` (로컬 빌드 테스트)

## 파일 구조

```
src/
  App.jsx           — 메인 컴포넌트 (2500+ 줄)
  App.module.css    — 전체 스타일 (1586줄, 디자인 시스템의 실제 구현)
  main.jsx          — 엔트리포인트
api/
  nearby.js         — Vercel Edge Function
DESIGN.md           — 디자인 시스템 문서 (이 파일)
CLAUDE.md           — AI 코딩 가이드 (현재 파일)
```

## 코드 컨벤션

- CSS: `camelCase` 클래스명 (`cardBottom`, `tabBtnActive`)
- 상태: `useState` + `useRef` (리렌더 필요 없는 플래그는 ref)
- 모달: `showXxx` state + 오버레이 패턴
- 이벤트: `triggerXxx()` 함수로 추상화
- Supabase 호출: 항상 try/catch 감싸기

## 빌드 주의사항

- JSX 문자열 내 단따옴표: 외부 따옴표와 충돌 주의 (이전 버그 참조)
  - 해결: 외부를 double quote로, 내부 apostrophe는 `'` (U+2019) 사용
- esbuild는 단따옴표 문자열 안의 `\'` 이스케이프를 처리하지 못함

## 응답 언어

**항상 한국어로 응답할 것.**
