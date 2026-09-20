# Intelist Pro — Design System

> **AI 코딩 바인딩 규칙**: 새 컴포넌트를 만들거나 기존 컴포넌트를 수정할 때는
> 반드시 이 문서의 토큰과 패턴을 준수하라. 하드코딩된 색상값이나 자의적인
> 폰트 크기를 추가하지 말 것. 예외는 이 문서에 명시적으로 기술된 경우에만 허용.

---

## 1. Brand Identity

**제품명**: Intelist Pro  
**카테고리**: AI 부동산 마케팅 카피 생성 도구  
**핵심 포지셔닝**: "에이전트가 아니라, 에이전트를 도와주는 AI"  
**톤 앤 보이스**: 전문적·간결·신뢰감. 과장하지 않는다. 부동산 업계 용어를 정확히 쓴다.

### 브랜드 색
- **Primary Red** `#D94035` — 아이콘, CTA, 브랜드 앵커. 따뜻하고 자신감 있는 빨강.
- **Primary Blue** `#0071E3` — 액션, 링크, 탭 활성. Apple-계열 신뢰 파랑.
- **Near-Black** `#1D1D1F` — 기본 텍스트, 고대비 UI. Apple SF 시스템에서 차용.

### 로고 규칙
- 로고타입 글꼴: 시스템 sans-serif 17px/600, letter-spacing -0.02em
- 최소 크기: 14px (모바일 헤더)
- 여백: 로고 높이의 50% 이상

---

## 2. Color Palette

### CSS 토큰 (`:root` 기준)

```css
/* Surface */
--bg:           #FFFFFF;   /* 페이지 기본 배경 */
--bg-sec:       #FAFAFA;   /* 패널, 입력 배경 */

/* Text */
--text-1:       #1D1D1F;   /* 주요 텍스트 */
--text-2:       #6E6E73;   /* 보조 텍스트 */
--text-3:       #86868B;   /* 힌트, 라벨, 비활성 */

/* Border */
--border:       #D2D2D7;   /* 기본 테두리 */
--border-light: #E5E5E5;   /* 내부 구분선 */

/* Accent */
--accent:       #0071E3;   /* 블루 CTA */
--accent-hover: #0077ED;   /* 블루 호버 */

/* Brand */
--icon:         #D94035;   /* 브랜드 레드 */
--danger:       #FF3B30;   /* 에러, 저장 버튼 */

/* Radius */
--r-card:       18px;      /* 카드 모서리 */
--r-pill:       980px;     /* 알약형 버튼 */
```

### 확장 팔레트 (토큰 없음 — 주의해서 사용)

| 역할 | 값 | 사용처 |
|------|-----|--------|
| Success | `#34C759` | 복사 완료, 타임라인 완료 |
| Gold | `#FFB800` | Pro 배지 시작색 |
| Orange | `#FF6B00` | Pro 배지 끝색 (gradient) |
| Muted text | `#ABABAB` | 타임스탬프, placeholder |
| Hover surface | `#F5F5F7` | 버튼 hover 배경 |
| Active surface | `#EBEBED` | 버튼 active 배경 |
| Danger bg | `#FFFAFA` | 편집 영역 배경 |
| Error bg | `#FFF5F5` | 에러 카드 배경 |
| Error border | `#FFD0D0` | 에러 카드 테두리 |
| Accent tint | `rgba(0,113,227,0.03–0.10)` | 드롭존 hover, 포커스 링 |

### 사용 금지
- 다크 모드 전용 재정의는 `@media (prefers-color-scheme: dark)` 블록만 사용  
- 토큰 없이 임의 회색(`#888`, `#ccc` 등)을 컴포넌트에 추가하지 말 것

---

## 3. Typography

**기본 폰트 스택**: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif`  
(SF Pro Display → SF Pro Text → 시스템 fallback. Google Fonts 사용 안 함)

### 타입 스케일

| 역할 | 크기 | 굵기 | 간격 | 색상 |
|------|------|------|------|------|
| Hero Title | 56px (mobile: 40px) | 700 | — | `--text-1` |
| Hero Sub | 19px (mobile: 16px) | 400 | — | `#86868B` |
| Brand / Logo | 17px | 600 | -0.02em | `--text-1` |
| Results Address | 22px | 700 | -0.3px | `--text-1` |
| Results Title | 17px | 600 | — | `#0071E3` |
| Coming Soon Title | 32px | 700 | -0.3px | `--text-1` |
| Coming Soon Sub | 16px | 400 | — | `--text-3` |
| Card Text | 15px | 400 | line-height 1.75 | `--text-1` |
| Card Tag (label) | 13px | 600 | 0.5px / uppercase | `--text-2` |
| Card Sub | 13px | 400 | — | `--text-3` |
| Tab Button | 14px | 500 (active: 600) | — | `--text-3` / `--text-1` |
| Generate Button | 16px | 600 | 0.01em | `#FFFFFF` |
| Secondary Buttons | 14–15px | 500 | — | context |
| Copy Button | 15px | 400 | — | `--accent` |
| Timestamp | 12px | 400 | italic | `#ABABAB` |
| Group Label | 12px | 600 | 0.3px / uppercase | `--text-3` |
| Toast | 14px | 500 | — | `#FFFFFF` |

### 규칙
- 라인 하이트: 본문 1.75, UI 요소 1.0, 힌트/캡션 1.3–1.45
- `white-space: pre-wrap` — 생성된 카피 텍스트 전용
- 자간 음수값(`-0.02em`, `-0.3px`)은 큰 제목에만 허용

---

## 4. Spacing & Layout Grid

### 기준 단위: 4px 그리드

| 토큰 이름 | 값 |
|----------|-----|
| xs | 4px |
| sm | 8px |
| md | 12px |
| base | 16px |
| lg | 20px–24px |
| xl | 32px |
| xxl | 40px+ |

### 주요 레이아웃 치수

- **폼 최대폭**: 콘텐츠 자연 폭 (세로 스크롤)
- **결과 최대폭**: `680px` (좌우 `padding: 40px 24px 80px`)
- **히스토리 패널 폭**: `420px` (슬라이드 인)
- **주소 바 높이**: `66px` (mobile: `56px`)
- **Submit 버튼 크기**: `38px` 원형 (mobile: `34px`)
- **옵션 아이콘 크기**: `48px` 원형 (mobile: `44px`)
- **카드 내부 패딩**: `24px` (mobile: `16px`)
- **카드 간격**: `10px gap`

### 모바일 중단점

```
@media (max-width: 480px)  — 주요 재배치
@media (max-width: 375px)  — 최소 폰 최적화
```

---

## 5. Component Patterns

### Address Bar (검색 입력)
```
height: 66px | border-radius: var(--r-pill) | border: 1.5px solid var(--border)
padding: 0 8px 0 20px | background: var(--bg)
focus: border-color var(--accent), box-shadow 0 0 0 4px rgba(0,113,227,0.10)
```

### Submit Arrow Button
```
width/height: 38px | border-radius: 50%
inactive: background #EFEFEF, color var(--text-3)
active:   background var(--icon), color #fff
```

### Generate Button (Primary CTA)
```
padding: 16px 48px | border-radius: var(--r-pill)
background: #D94035 | box-shadow: 0 2px 12px rgba(217,64,53,0.30)
hover: background #C0372D, translateY(-1px)
active: background #B0302A, translateY(0)
disabled: opacity 0.35
```

### Card
```
border: 1px solid var(--border) | border-radius: var(--r-card)
padding: 24px | background: var(--bg)
hover (Coming Soon): translateY(-2px), box-shadow 0 8px 24px rgba(0,0,0,0.06)
```

### Tab Bar
```
gap: 4px | border-bottom: 1px solid var(--border-light)
tabBtn: padding 10px 16px 12px | font-size 14px/500 | color --text-3
active: border-bottom 2px solid var(--accent) | color --text-1 | font-weight 600
```

### Revise Input
```
border: 1px solid var(--border-light) | border-radius: 8px | padding: 8px 12px
focus: border-color var(--accent), background var(--bg)
background: var(--bg-sec)
```

### Toast
```
position: fixed, bottom 32px, center
background: #1D1D1F | color: #fff | border-radius: var(--r-pill)
padding: 10px 20px | font-size: 14px/500
animation: toastIn 0.2s ease (fadeUp + translateY)
```

### Paywall Modal
```
overlay: rgba(0,0,0,0.55) + blur(4px)
card: background #fff | border-radius: 20px | padding: 40px 36px 32px
max-width: 420px | box-shadow: 0 24px 64px rgba(0,0,0,0.18)
```

### Pro Badge
```
background: linear-gradient(135deg, #FFB800 0%, #FF6B00 100%)
color: #fff | border-radius: 20px | padding: 5px 12px | font-size: 12px/600
```

### Autocomplete Dropdown
```
border-radius: 12px | box-shadow: 0 8px 24px rgba(0,0,0,0.10)
item padding: 12px 16px | border-top: 1px solid #F5F5F5
hover: background #F5F5F7
```

---

## 6. Interactive States

### 트랜지션 기본값
```
transition: <property> 0.15s ease   /* 대부분의 UI */
transition: <property> 0.1s          /* 빠른 피드백 */
transition: <property> 0.2s ease     /* 색상 전환 */
transition: <property> 0.4s ease     /* placeholder 페이드 */
```

### 상태 매핑

| 상태 | 시각 처리 |
|------|----------|
| hover (버튼) | `background` 한 단계 어둡게 + `translateY(-1px)` (CTA) |
| hover (카드) | `translateY(-2px)` + 미묘한 shadow |
| hover (링크/copy) | `opacity 0.7` |
| focus (입력) | `border-color: --accent` + 파란 글로우 |
| active (버튼) | `translateY(0)` 원복 |
| disabled | `opacity 0.35–0.40` + `cursor: not-allowed` |
| success | `color: #34C759` (copyDone) |
| error | `border: 2px solid #FF3B30` + `box-shadow rgba(255,59,48,0.1)` |

### 포커스 링
```
box-shadow: 0 0 0 4px rgba(0,113,227,0.10)   /* 파란 포커스 */
box-shadow: 0 0 0 4px rgba(255,59,48,0.10)   /* 레드 에디트 */
```

---

## 7. Visual Effects & Motion

### 애니메이션 카탈로그

| 이름 | 트리거 | 효과 |
|------|--------|------|
| `fadeUp` | 결과 페이지 진입 | `opacity 0→1 + translateY(12px→0)`, 0.3s ease |
| `toastIn` | 토스트 표시 | `opacity 0→1 + translateY(8px→0)`, 0.2s ease |
| `spin` | 로딩 스피너 | `rotate(360deg)` 0.75s linear infinite |
| `micPulse` | 녹음 중 도트 | `opacity/scale` 1s ease-in-out infinite |
| `sandFall1/2/3` | 모래시계 파티클 | `translateY(0→52px) + opacity`, 1.1s ease-in, 0/0.37s/0.72s delay |
| 히스토리 패널 | 버튼 클릭 | `translateX(100%→0)` slide-in (inline transition) |

### 블러 효과
```
loadingOverlay: backdrop-filter: blur(2px)   /* 생성 중 */
paywallOverlay: backdrop-filter: blur(4px)   /* 페이월 */
thumbRemove:    backdrop-filter: blur(4px)   /* 이미지 삭제 버튼 */
```

### 그림자 스케일
```
xs:  box-shadow: 0 2px 12px rgba(0,0,0,0.08)    /* 카드 내부 */
sm:  box-shadow: 0 4px 16px rgba(0,0,0,0.10)    /* 드롭다운 */
md:  box-shadow: 0 8px 24px rgba(0,0,0,0.10)    /* 패널 */
lg:  box-shadow: 0 8px 32px rgba(0,0,0,0.08)    /* 로딩 카드 */
xl:  box-shadow: 0 24px 64px rgba(0,0,0,0.18)   /* 페이월 */
brand: box-shadow: 0 2px 12px rgba(217,64,53,0.30)  /* CTA 버튼 */
history: box-shadow: -4px 0 24px rgba(0,0,0,0.18)   /* 사이드 패널 */
```

### `prefers-reduced-motion` 처리
```css
@media (prefers-reduced-motion: reduce) {
  /* sandFall, micPulse, spin 등 모든 animation: none으로 */
}
```
*현재 미구현 — 향후 접근성 개선 항목*

---

## 8. Design Rationale

### 왜 Apple HIG를 참조했나
부동산 에이전트는 Mac/iPhone 헤비 유저다. SF Pro 시스템 폰트, 애플식 색상 팔레트,
`--r-pill: 980px`의 완전한 라운드 버튼은 "이미 아는 인터페이스" 느낌을 준다.
학습 곡선을 낮추고 신뢰감을 높이는 전략적 선택.

### 왜 레드가 브랜드 앵커인가
`#D94035`는 부동산 업계(빨간 For Sale 표지판)의 암묵적 색상 코드다.
단순 주목도를 넘어, 카테고리 연상을 즉시 활성화한다.
파랑(`#0071E3`)은 "디지털 액션" 역할로 명확히 분리.

### 왜 680px 최대폭인가
생성된 카피는 읽기 편한 라인 길이가 핵심이다. 680px ≈ 65–70자 기준.
독자가 텍스트를 검토·편집할 때 피로감이 없다.

### 빠른 전환(0.15s)의 이유
에이전트는 빠른 속도로 여러 리스팅을 처리한다.
애니메이션이 작업 속도를 방해해선 안 된다.
0.15s는 "즉각적"으로 느껴지면서도 상태 변화가 명확히 인지되는 최적 지점.

### `--bg-sec: #FAFAFA`의 역할
입력 패널과 카드 내부 상태를 구분하기 위한 미묘한 깊이.
흰 배경 위에서 흰 입력창은 구분이 안 된다.
`#FAFAFA`는 시스템이 "여기에 뭔가 입력할 수 있다"고 말하는 방법.

### 토큰 없는 하드코딩 색상들
`#34C759`(성공), `#FFB800`(골드), `#ABABAB`(타임스탬프) 등은
기능적으로 매우 제한된 단일 역할 색상이라 토큰화하지 않았다.
확장될 경우 토큰으로 승격할 것.

---

*마지막 업데이트: 자동 추출 — App.module.css 전체 분석 기반*  
*다음 업데이트: 다크 모드 토큰 추가 시*
