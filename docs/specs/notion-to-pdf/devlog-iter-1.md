# Devlog — iter 1

> Slug: notion-to-pdf
> Date: 2026-05-24

## 이 iteration의 의도

spec의 수용 기준 AC1~AC8을 충족하는 최소 구현을 완성한다.
Notion 비공식 API + 브라우저 인쇄 CSS 조합(1안)으로 URL 입력 → 미리보기 → PDF 다운로드 흐름을 구현한다.

## 변경 파일

### 신규 생성
- `src/lib/schemas/notion.ts` — UrlInputSchema, NotionBlockSchema, NotionPageDataSchema, extractPageId 헬퍼
- `src/lib/api/notion.ts` — loadNotionPage (fetch 래퍼), NotionApiError 클래스
- `src/lib/queries/notion.ts` — useNotionPage (TanStack Query 훅, staleTime 5분)
- `src/stores/conversion-store.ts` — Zustand ConversionStore (status/inputUrl/pageId/pageData)
- `src/components/notion/url-input-form.tsx` — react-hook-form + zod 폼
- `src/components/notion/preview-panel.tsx` — A4 카드 + 다운로드/다시입력 버튼
- `src/components/notion/block-renderer.tsx` — 7개 블록 타입 렌더링
- `src/components/notion/loading-spinner.tsx` — Skeleton + Loader2 아이콘
- `api/notion/load-page.ts` — Vercel Edge Function (Notion API 프록시)

### 수정
- `src/routes/index.tsx` — 새 컴포넌트 조립, 상태별 분기 렌더링
- `src/routes/__root.tsx` — Sonner Toaster 추가, nav/header 제거 (인쇄 친화적)
- `src/styles.css` — 디자인 토큰(--font-serif, --font-sans, --color-paper 등) + notion-* CSS + @media print
- `index.html` — Google Fonts (Inter, Playfair Display) + 타이틀 변경
- `vite.config.ts` — dev proxy (/api/notion → https://www.notion.so/api/v3), vitest @ts-expect-error
- `vercel.json` — API function 라우팅 추가
- `src/env.ts` — VITE_API_BASE_URL 필수 요구 제거 (이 앱에서 불필요)
- `src/components/ui/sonner.tsx` — next-themes 의존성 제거 (다크모드 범위 밖)

### shadcn 컴포넌트 추가 (pnpm dlx shadcn@latest add)
- `src/components/ui/input.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/sonner.tsx` (next-themes 제거 후 재작성)

## 결정 요지

1. **ConversionStore ↔ TanStack Query 분리**: spec 데이터 모델대로 `status/inputUrl/pageId`는 Zustand, 서버 데이터(`pageData`)는 TanStack Query가 캐싱한다. `useNotionPage`는 `pageId`가 null이면 쿼리를 비활성화(`enabled: false`)하고, store의 `setSuccess/setError`로 결과를 bridge한다.

2. **NotionApiError 클래스**: `erasableSyntaxOnly: true` TypeScript 옵션 때문에 생성자 파라미터에 `public readonly` 접근 제한자를 쓸 수 없다. 명시적 클래스 필드 선언 방식으로 우회했다.

3. **vite.config.ts test 필드**: vitest 2.1.x가 vite 5 타입을 내장하고 있어서 `vitest/config`의 `defineConfig`를 사용하면 vite 6 플러그인 타입과 충돌한다. 기존 `vite`의 `defineConfig`를 유지하고 `test` 필드에만 `@ts-expect-error`를 적용해 경고를 억제했다.

4. **Vercel Edge Function**: `api/notion/load-page.ts`는 Vercel Edge Runtime의 표준 `Request/Response` Web API를 사용한다. `@vercel/node` 패키지 없이도 타입 안전하게 동작한다.

## 자가 점검 결과

- `pnpm typecheck`: ✅
- `pnpm lint`: ✅ (warning 2개 — shadcn 기존 파일의 react-refresh 경고, 수정 대상 아님)
- `pnpm build`: ✅ (gzip ~149kB, 500kB 이하)

## 미해결 / 향후 작업

- **로컬 개발 시 API 미작동**: Vite dev proxy는 `/api/notion/*` 경로를 `https://www.notion.so/api/v3/*`로 프록시하지만, `/api/notion/load-page`는 실제 Vercel Edge Function 경로다. 로컬에서 실제 API를 테스트하려면 `vercel dev` 명령어 사용 필요. 이는 spec 가정 9.1에 따른 의도된 설계.
- **이미지 블록**: Notion `image` 블록의 이미지 URL이 만료되거나 auth가 필요한 경우 표시되지 않을 수 있음. 범위 밖(1차 지원만).
- **페이지 번호 CSS counter**: `@page @bottom-center` 규칙은 Chrome에서만 정상 작동하며, Safari/Firefox에서는 다르게 보일 수 있음 (AC 미명시 항목).
