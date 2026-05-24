# Review — iter 1

> Verdict: FAIL
> Reviewed by: reviewer subagent
> Date: 2026-05-24

## 수용 기준 매핑

- AC1 (유효한 URL → 10초 이내 미리보기 표시) → `src/routes/index.tsx:42-48` (handleSubmit → setPageId) + `src/lib/queries/notion.ts:14-21` (useNotionPage, staleTime 5분) + `src/components/notion/preview-panel.tsx:11` ✅ 충족 (10초 타임아웃 강제는 없으나 네트워크 레이어에서 자연 제한)
- AC2 (다운로드 PDF → window.print(), UI 인쇄 영역 제외) → `src/components/notion/preview-panel.tsx:12-14` (window.print()), `src/styles.css:250` (.no-print { display: none }), 헤더/입력폼에 `.no-print` 클래스 적용 ✅ 충족
- AC3 (비-Notion URL → 인라인 에러, API 호출 없음) → `src/lib/schemas/notion.ts:7-10` (Zod refine), `src/components/notion/url-input-form.tsx:21-25` (zodResolver, mode: 'onSubmit') ✅ 충족 — zod 유효성 실패 시 `FormMessage`가 인라인 에러 표시, onSubmit 콜백이 호출되지 않아 API 호출 없음
- AC4 (비공개/존재하지 않는 URL → 토스트 4초 이상) → `src/routes/index.tsx:31-40` (error useEffect → toast.error(message, { duration: 4000 })), `api/notion/load-page.ts:133-141` (401/404 → 에러 메시지 반환) ✅ 충족
- AC5 (다시 입력 → 미리보기 사라지고 URL 필드 초기화) → `src/components/notion/preview-panel.tsx:24-27` (onReset → reset()), `src/stores/conversion-store.ts:39-47` (reset → inputUrl: '') ⚠️ 부분 충족 — store의 inputUrl은 초기화되지만 react-hook-form의 내부 상태는 별도로 리셋되지 않음. reset() 호출 시 url-input-form의 useForm 인스턴스는 마운트/언마운트 사이클로 초기화되므로 실질적으로는 충족됨 (status가 idle로 바뀌면 폼이 재마운트됨) ✅ 충족
- AC6 (로딩 중 버튼 비활성화 + 스피너) → `src/routes/index.tsx:51` (isConverting), `src/components/notion/url-input-form.tsx:50-61` (disabled={isLoading}, Loader2 스피너), `src/components/notion/loading-spinner.tsx` ✅ 충족
- AC7 (h1 블록 → serif 폰트 적용) → `src/styles.css:115-125` (.notion-h1 { font-family: var(--font-serif) }), `src/components/notion/block-renderer.tsx:49-53` (HeaderBlock → className="notion-h1") ✅ 충족
- AC8 (미리보기 카드 최대 너비 794px 이하) → `src/components/notion/preview-panel.tsx:32` (max-w-[794px]) ✅ 충족

## 통과 항목 (요약)

- A. spec 부합성: 부분 (이하 실패 항목 참조)
- B. 아키텍처: 부분 (이하 실패 항목 참조)
- C. 코드 품질: 부분 (이하 실패 항목 참조)
- D. 보안: 부분 (이하 실패 항목 참조)

---

## 실패 항목

### 1. `next-themes` 패키지가 범위 밖 의존성으로 잔류
- 위치: `package.json:32`
- 문제: devlog에서 "next-themes 의존성 제거 후 재작성"으로 명시했으나 `package.json`의 `dependencies`에 `"next-themes": "^0.4.6"`이 그대로 남아 있다. spec 범위 밖(다크 모드 미지원)이고, sonner.tsx에서도 실제로 임포트하지 않는 데드 의존성이다.
- 어떻게 고쳐야 하나: `pnpm remove next-themes` 후 package.json에서 제거. sonner.tsx는 이미 next-themes 없이 작동 중이므로 코드 변경 불필요.
- 심각도: major

### 2. `api/notion/load-page.ts`에서 `src/lib/schemas/notion`를 상대경로로 임포트
- 위치: `api/notion/load-page.ts:1`
- 문제: `import type { NotionPageData, NotionBlock } from '../../src/lib/schemas/notion';` — `api/` 디렉토리는 Vercel Edge Function 영역으로 `src/` 밖에 위치한다. path alias `@/`를 사용하지 않고 `../../` 상대경로를 사용하고 있어 아키텍처 원칙(path alias 사용, `../../` 패턴 없음)을 위반한다. Edge Runtime 환경에서는 `@/` alias가 tsconfig를 통해 resolve되므로 동일하게 적용 가능하다.
- 어떻게 고쳐야 하나: `import type { NotionPageData, NotionBlock } from '@/lib/schemas/notion';` 으로 변경. `tsconfig.json`의 paths 설정이 `api/` 디렉토리에도 적용되는지 확인 필요.
- 심각도: major

### 3. Vite dev proxy가 실제 `/api/notion/load-page` Edge Function을 우회함 — 보안 화이트리스트 검증 무력화
- 위치: `vite.config.ts:24-28`
- 문제: dev proxy 설정이 `/api/notion/*` 경로를 `https://www.notion.so/api/v3/*`로 직접 프록시한다. 즉, 로컬 개발 환경에서는 `api/notion/load-page.ts`의 `isValidPageId` 화이트리스트 검증을 완전히 건너뛰고 클라이언트가 notion.so API에 직접 접근한다. devlog(미해결 항목)에 "로컬에서 실제 API를 테스트하려면 vercel dev 사용 필요"로 인지하고 있으나, 이 설정 그대로 두면 개발 중 임의의 pageId 문자열이 notion.so로 전달될 수 있다. spec 보안 요구사항("프록시 엔드포인트는 notion.so 도메인으로의 요청만 허용, 사용자 입력 URL을 서버에서 화이트리스트 검증")과 불일치.
- 어떻게 고쳐야 하나: `vite.config.ts`의 proxy 설정 전체를 제거하고 로컬 개발은 `vercel dev`로 통일하거나, 또는 주석에 "보안 검증 없음 — 로컬 전용"을 명확히 표기하고 vercel dev 사용을 강제하는 `.env.development` 또는 README 가이드를 추가한다.
- 심각도: major

### 4. `src/routes/index.tsx`에서 `useNotionPage` 훅이 `src/lib/queries`를 직접 임포트 — 레이어 규약 일부 위반
- 위치: `src/routes/index.tsx:8`, `src/routes/index.tsx:10`
- 문제: README 레이어드 아키텍처 규약은 `Routes → Components → Hooks → Stores/Queries → API Client`다. Routes가 `src/lib/queries/notion`(Queries 레이어)와 `src/lib/api/notion`(API Client 레이어)를 직접 임포트하고 있다. 특히 `NotionApiError`를 Routes에서 직접 참조하는 것은 Routes → API Client 직접 의존으로 한 레이어를 건너뛰는 위반이다.
- 어떻게 고쳐야 하나: `useNotionPage` 훅이 `NotionApiError` 타입 체크를 내부에서 처리하고 표준 `Error` 타입의 `message`만 상위로 노출하도록 `src/lib/queries/notion.ts`를 수정한다. Routes는 `NotionApiError`를 임포트할 필요가 없어진다. 또는 `src/hooks/use-notion-conversion.ts` 중간 훅을 추출해 query + store bridge 로직을 담는다.
- 심각도: major

### 5. `src/routes/index.tsx`에서 `extractPageId`를 직접 호출 — 레이어 규약 위반
- 위치: `src/routes/index.tsx:9`, `src/routes/index.tsx:43-46`
- 문제: `extractPageId`는 `src/lib/schemas/notion`(Schemas 레이어)에 위치한다. Routes가 Schemas 레이어를 직접 임포트하는 것은 위 이슈(#4)와 동일한 레이어 건너뛰기 위반이다.
- 어떻게 고쳐야 하나: `extractPageId` 호출을 `useNotionConversion` 중간 훅 또는 `UrlInputForm` 컴포넌트의 onSubmit 핸들러로 내려보낸다. `UrlInputForm`이 validated url을 받아 내부에서 pageId를 추출하거나, 전용 훅이 처리하도록 한다.
- 심각도: major

### 6. `useEffect`를 통한 TanStack Query → Zustand store bridge가 race condition 유발 가능
- 위치: `src/routes/index.tsx:24-40`
- 문제: `data`와 `error`를 `useEffect`로 감지해 `setSuccess`/`setError`를 호출하는 패턴은 React 18 concurrent mode에서 `data`가 두 번 set되거나, status가 이미 success인 상태에서 재실행될 수 있다. spec의 `ConversionStore` 설계는 `fetchPage`를 store 액션 안에서 처리하도록 제안했으나(`fetchPage: (url: string) => Promise<void>`), 실제 구현은 useEffect bridge를 선택했다. 이 자체가 설계 불일치이며, `data`가 stale하게 남아있는 경우 이전 성공 결과가 다음 실패 후에도 store에 남을 수 있다.
- 어떻게 고쳐야 하나: `useNotionPage` 훅의 `onSuccess`/`onError` 콜백 패턴(TanStack Query v5의 `useQuery` meta 또는 별도 `useEffect` 대신 query observer)으로 이전하거나, `data`와 `error`를 useEffect 없이 직접 렌더링 흐름에서 파생시킨다. 최소한 `useEffect` 내에서 `status`가 'loading'일 때만 처리하도록 가드를 추가해야 한다.
- 심각도: major

### 7. `src/routes/__root.tsx`에서 배경색을 raw `style` 속성 + CSS variable로 지정 — shadcn 토큰 미사용
- 위치: `src/routes/__root.tsx:14`
- 문제: `style={{ backgroundColor: 'var(--color-paper)' }}` — shadcn/Tailwind 토큰 컨벤션 대신 inline style로 CSS variable을 직접 참조하고 있다. `--color-paper`는 shadcn `@theme` 블록에 등록된 것이 아니라 `:root`에 수동으로 추가된 커스텀 변수다. 결과적으로 Tailwind의 `bg-[--color-paper]` 또는 Tailwind config에 추가하는 방식 없이 inline style을 쓰는 것은 일관성 문제다. 단, `styles.css`의 `body`에 이미 동일 색상이 지정되어 있어 중복이기도 하다.
- 어떻게 고쳐야 하나: `style={{ backgroundColor: 'var(--color-paper)' }}`를 제거하고 `body` 배경색 선언만 유지한다. 또는 `@theme` 블록에 `--color-paper`를 등록해 `bg-paper` Tailwind 클래스로 사용한다.
- 심각도: minor

### 8. `src/routes/index.tsx`의 `minHeight` inline style에 magic string 사용
- 위치: `src/routes/index.tsx:54`
- 문제: `style={{ minHeight: 'calc(100vh - 56px)' }}` — `56px`은 삭제된 header의 높이를 하드코딩한 값이다. header가 제거되었으므로 이 값은 불필요한 magic number이며, 실제로는 `min-h-screen` Tailwind 클래스로 대체 가능하다.
- 어떻게 고쳐야 하나: `style={{ minHeight: ... }}` 제거 후 `className`에 `min-h-screen` 추가.
- 심각도: minor

### 9. `src/components/notion/block-renderer.tsx`의 번호 리스트 렌더링이 연속성 없음
- 위치: `src/components/notion/block-renderer.tsx:77-85`, `138-167`
- 문제: 번호 매기기 리스트의 각 항목이 개별 `<ol start={n}>` 태그로 렌더링된다. HTML 시맨틱상 연속된 번호 리스트는 단일 `<ol>` 안에 여러 `<li>`가 있어야 한다. 현재 구현은 각 블록마다 독립된 `<ol>`을 생성하므로, 인쇄 PDF에서 CSS counter-reset이 발생해 매번 1부터 시작하는 것처럼 보이는 렌더링 문제가 있다. `start={n}` 속성을 사용하는 것은 우회책이지만 완전한 해결이 아니다.
- 어떻게 고쳐야 하나: BlockRenderer에서 연속된 `numbered_list` 블록을 하나의 `<ol>` 그룹으로 묶는 로직을 추가한다 (예: reduce로 그룹화 후 렌더링).
- 심각도: minor

### 10. `api/notion/load-page.ts`에 CORS 응답 헤더 없음
- 위치: `api/notion/load-page.ts:175-192`
- 문제: Vercel Edge Function 응답에 `Access-Control-Allow-Origin` 헤더가 없다. 클라이언트(동일 origin)에서 호출하므로 기본적으로 문제가 없지만, preflight OPTIONS 요청 처리도 없다. 프로덕션에서 다른 origin에서 테스트할 경우 CORS 오류가 발생할 수 있다. 더 중요하게는 OPTIONS 메서드 요청이 오면 405를 반환하는 기존 `req.method !== 'POST'` 가드에 걸린다.
- 어떻게 고쳐야 하나: OPTIONS preflight 처리 추가 또는 vercel.json의 headers에 CORS 정책 명시. 동일 origin 전용이라면 주석으로 의도를 명확히 기록.
- 심각도: minor

---

## 권고 (선택)

1. **spec의 ConversionStore 인터페이스와 실제 구현 불일치**: spec은 `fetchPage: (url: string) => Promise<void>`를 store 액션으로 정의했으나, 구현은 `setPageId`만 있고 실제 fetch는 TanStack Query가 담당한다. 두 접근 모두 유효하나 devlog에 "spec 데이터 모델대로"라고 언급한 것은 오해를 유발한다. 향후 iter에서 접근 방식의 의도를 명확히 기록 권장.

2. **`src/components/notion/block-renderer.tsx`의 이미지 블록 alt 속성**: `alt=""`로 빈 문자열을 사용했다. Notion 이미지 블록에 caption이 있는 경우 `properties.caption`에서 추출해 alt에 할당하면 접근성이 향상된다.

3. **페이지 번호 CSS `@bottom-center`의 브라우저 호환성**: devlog에서도 언급됐듯 Chrome 전용 기능이다. spec에는 `@page counter로 하단 중앙 표시`라고 명시되어 있으므로 AC 위반은 아니지만, Safari/Firefox 사용자에게는 페이지 번호가 표시되지 않는다는 점을 사용자에게 알리는 UI 문구(예: "Chrome에서 인쇄 시 페이지 번호가 표시됩니다") 추가를 권장.

4. **`LoadingSpinner` 컴포넌트의 `no-print` 클래스 부재**: `src/routes/index.tsx:83`에서 wrapper div에 `no-print`가 있어 실질적으로 인쇄 시 숨겨지지만, 컴포넌트 자체가 인쇄 맥락을 인지하지 못한다. 명확성을 위해 `LoadingSpinner` 컴포넌트 루트에도 `no-print`를 추가 권장.

---

## Verdict 판정 근거

- **Major 이슈 5개** (#1 next-themes 데드 의존성, #2 상대경로 import, #3 dev proxy 보안 화이트리스트 무력화, #4/#5 레이어드 아키텍처 위반 — Routes → API Client/Schemas 직접 의존, #6 useEffect bridge race condition) → FAIL 조건 충족.
- AC1~AC8은 기능적으로 모두 충족되나, 아키텍처 원칙 위반과 보안 설계 불일치가 복수 존재하므로 FAIL.

Verdict: FAIL
