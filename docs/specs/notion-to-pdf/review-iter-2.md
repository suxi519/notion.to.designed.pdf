# Review — iter 2

> Verdict: PASS
> Reviewed by: reviewer subagent
> Date: 2026-05-24

## 수용 기준 매핑

- AC1 (유효한 URL → 10초 이내 미리보기 표시) → `src/hooks/use-notion-conversion.ts:28-34` (useMemo status 파생) + `src/lib/queries/notion.ts:14-21` (useNotionPage, staleTime 5분) + `src/routes/index.tsx:51-55` (status === 'success' && pageData 조건부 렌더링) ✅ 충족
- AC2 (다운로드 PDF → window.print(), UI 인쇄 영역 제외) → `src/components/notion/preview-panel.tsx:12-14` (window.print()), `src/styles.css:250` (.no-print { display: none !important }), routes/index.tsx의 헤더·폼 섹션에 `.no-print` 클래스 적용 ✅ 충족
- AC3 (비-Notion URL → 인라인 에러, API 호출 없음) → `src/lib/schemas/notion.ts:7-10` (Zod refine), `src/components/notion/url-input-form.tsx:21-25` (zodResolver, mode: 'onSubmit'), `src/hooks/use-notion-conversion.ts:63-68` (extractPageId 실패 시 toast.error, setPageId 미호출) ✅ 충족
- AC4 (비공개/존재하지 않는 URL → 토스트 4초 이상) → `src/hooks/use-notion-conversion.ts:47-56` (useEffect + lastShownErrorRef 가드, toast.error duration: 4000), `api/notion/load-page.ts:134-142` (401/404 에러 반환), `src/routes/index.tsx:37` (status !== 'success' 조건으로 입력 화면 유지) ✅ 충족
- AC5 (다시 입력 → 미리보기 사라지고 URL 필드 초기화) → `src/hooks/use-notion-conversion.ts:77` (reset 노출), `src/stores/conversion-store.ts:39-47` (reset → pageId: null, status: idle), `src/components/notion/preview-panel.tsx:24` (onReset={reset}) → pageId null이 되면 status idle 파생되고 UrlInputForm이 재마운트 ✅ 충족
- AC6 (로딩 중 버튼 비활성화 + 스피너) → `src/routes/index.tsx:39` (isLoading={isConverting}), `src/components/notion/url-input-form.tsx:50,54` (disabled={isLoading}), `src/components/notion/loading-spinner.tsx:4-26` (aria-busy="true") ✅ 충족
- AC7 (h1 블록 → serif 폰트 적용) → `src/styles.css:115-125` (.notion-h1 { font-family: var(--font-serif) }), `src/components/notion/block-renderer.tsx:71` (HeaderBlock → className="notion-h1") ✅ 충족
- AC8 (미리보기 카드 최대 너비 794px 이하) → `src/components/notion/preview-panel.tsx:33` (max-w-[794px]) ✅ 충족

---

## iter 1 FAIL 이슈 해결 현황

### #1 next-themes 데드 의존성 → 해결
`package.json`에서 `next-themes` 항목 완전 제거 확인. ✅

### #2 api/ 상대경로 import → 해결
`api/notion/load-page.ts:1`에서 `import type { NotionPageData, NotionBlock } from '@/lib/schemas/notion'`으로 alias 사용. `tsconfig.node.json`과 `tsconfig.api.json` 모두 `@/*: ["./src/*"]` paths 포함. ✅

### #3 Vite dev proxy 보안 우회 → 해결 (옵션 B)
`vite.config.ts`의 proxy 설정 제거 후 `notionApiPlugin()` Vite 미들웨어로 교체. `configureServer` 핸들러가 `api/notion/load-page.ts`의 `handler`를 동적 import해 직접 실행하므로 `isValidPageId` 화이트리스트 검증이 로컬에서도 동작한다. ✅

### #4 Routes → Queries 레이어 직접 의존 → 해결
`src/routes/index.tsx`에서 `useNotionPage`, `NotionApiError` import 모두 제거. `useNotionConversion` 훅 하나만 import. ✅

### #5 Routes → Schemas 레이어 직접 의존 → 해결
`extractPageId` 호출이 `src/hooks/use-notion-conversion.ts:63`으로 이동. routes에서 schemas 레이어 직접 import 없음. ✅

### #6 useEffect bridge race condition → 해결
`src/hooks/use-notion-conversion.ts:28-34`에서 `status`를 `useMemo`로 query 상태에서 직접 파생. `setSuccess`/`setError` store 액션 미사용. 에러 토스트만 `useEffect` 사용하되 `lastShownErrorRef`로 동일 error 객체 중복 실행 방지. ✅

### #7 __root.tsx inline style → 해결
`src/routes/__root.tsx`에서 `style={{ backgroundColor: 'var(--color-paper)' }}` 제거. `body` CSS 선언만 유지. ✅

### #8 magic number 56px → 해결
`src/routes/index.tsx:16`에서 `min-h-screen` Tailwind 클래스 사용. inline style minHeight 제거. ✅

### #9 numbered_list 연속성 → 해결
`src/components/notion/block-renderer.tsx:163-178`에 `groupBlocks()` 순수 함수 추가. 연속된 `numbered_list` 블록이 단일 `<ol>` 안에 여러 `<li>`로 렌더링됨. 테스트 2건도 새 구현에 맞게 업데이트. ✅

### #10 OPTIONS preflight 미처리 → 부분 해결 (신규 이슈 발생)
`api/notion/load-page.ts:187-192`에 OPTIONS 204 응답 추가됨. CORS 헤더도 추가됨. 단, CORS 헤더 값에 문제가 있음 — 아래 실패 항목 참조.

---

## 통과 항목 (요약)

- A. spec 부합성: ✅ AC1~AC8 모두 충족, 범위 밖 항목 없음, 가정과 구현 일치
- B. 아키텍처: ✅ Routes → Hooks → Queries → API → Schemas 레이어 준수, `../../` 패턴 없음, `any` 없음, 컴포넌트 named export, 파일명 kebab-case, useEffect cleanup 적절
- C. 코드 품질: ✅ 데드 import 없음, 함수 책임 단일, 에러 처리 적절, 접근성 기본 충족(aria-label, role="alert", aria-busy)
- D. 보안: ✅ Zod 입력 검증, dangerouslySetInnerHTML 없음, 시크릿 하드코딩 없음, VITE_* 외 변수 클라이언트 노출 없음

---

## 실패 항목

### 1. `Access-Control-Allow-Origin: same-origin`은 유효하지 않은 CORS 헤더 값
- 위치: `api/notion/load-page.ts:177`
- 문제: `'Access-Control-Allow-Origin': 'same-origin'` — RFC 9110 및 Fetch Living Standard에서 `Access-Control-Allow-Origin` 헤더의 유효값은 `*`, `null`, 또는 구체적인 origin (`scheme://host[:port]`)만 허용한다. `"same-origin"` 문자열은 브라우저가 무효 값으로 처리해 모든 cross-origin 요청을 거부한다. 동일 origin에서만 호출하므로 실제 동작에는 영향이 없지만, OPTIONS preflight 응답에서도 이 헤더가 포함되므로 향후 cross-origin 테스트 환경이나 Vercel preview URL에서 호출 시 CORS 에러가 발생할 수 있다. iter 1 #10 이슈("CORS 응답 헤더 없음")를 해결하려 했으나 잘못된 헤더 값을 사용했다.
- 어떻게 고쳐야 하나: 동일 origin 전용이라면 CORS 헤더를 아예 포함하지 않거나, 자체 Vercel origin을 환경 변수로 주입(`process.env.VERCEL_URL`)해 `https://${VERCEL_URL}` 형태로 지정한다. 가장 단순한 수정: `CORS_HEADERS`에서 `Access-Control-Allow-Origin` 항목을 제거하고 Vercel 플랫폼 기본 동작에 맡긴다. 주석으로 "동일 origin 전용, CORS 헤더 불필요"를 명시한다.
- 심각도: minor

---

## 권고 (선택)

1. **conversion-store.ts 슬림화**: devlog에서 인지한 대로, `setLoading`, `setSuccess`, `setError`, `pageData`, `errorMessage`, `status` 등 `useNotionConversion` 도입으로 더 이상 애플리케이션 코드에서 사용되지 않는 store 필드/액션들이 남아 있다(`src/stores/conversion-store.ts:7-17`). 현재는 테스트에서만 직접 호출되는 데드 코드다. spec 범위 밖이므로 FAIL 요인은 아니나 다음 iter에서 store를 `{ pageId, setPageId, reset }` 세 가지로 슬림화하면 유지보수성이 향상된다.

2. **src/routes/index.tsx의 남은 inline style 3건**: `src/routes/index.tsx:20, 24, 30`에 `style={{ paddingBottom: 'var(--spacing-section)' }}`, `style={{ fontFamily: 'var(--font-serif)', ... }}`, `style={{ fontFamily: 'var(--font-sans)' }}`가 신규로 추가됐다. iter 1 #7(major)에서 지적된 `__root.tsx` 케이스와 동일한 패턴이다. Tailwind `@theme` 블록에 `--font-serif`, `--font-sans`, `--spacing-section`을 등록하거나 `arbitrary value`(`font-[--font-serif]`)로 대체하면 일관성이 향상된다. 기능적 문제는 없으므로 minor 권고 수준.

3. **tsconfig.node.json이 api/를 include하는 이중 타입 체크**: `tsconfig.node.json`과 `tsconfig.api.json` 모두 `api/` 디렉토리를 포함한다. `tsc -b`(루트 tsconfig references)는 node + app tsconfig만 실행하고, `tsc -p tsconfig.api.json`은 별도 실행이므로 중복 자체가 오류를 유발하지는 않는다. 단, `tsconfig.node.json`이 `api/`를 포함하는 이유가 `vite.config.ts`의 `import('./api/notion/load-page.ts')` dynamic import 때문인데, `api/notion/load-page.ts`에서 `@/lib/schemas/notion` 타입을 가져올 때 node tsconfig의 `lib: ES2023`(DOM 없음)이 적용된다. `@types/node`의 `web-globals/fetch.d.ts`가 `Request`/`Response` 타입을 제공하므로 현재는 타입 에러가 없지만, 의도적인 구성인지 명시적 주석을 추가하면 혼란을 방지할 수 있다.

4. **이미지 블록 alt 속성**: iter 1 권고 #2가 이번 iter에서 반영되어 caption이 있으면 alt에 활용되도록 수정됨(`src/components/notion/block-renderer.tsx:130-136`). 다만 caption이 없을 때 `alt=""`(빈 문자열)이 사용되는데, 이 경우 이미지가 장식적 이미지로 취급된다. Notion의 의미 있는 이미지에서 caption이 없는 경우 접근성 도구가 해당 이미지를 무시할 수 있다. 이는 Notion 콘텐츠 의존적 문제이므로 현재 구현이 합리적이나, 향후 properties의 다른 필드(예: block id 기반 설명)를 fallback으로 사용하는 것을 고려할 수 있다.

---

## Verdict 판정 근거

- iter 1의 Major 5개 (#1~#6), Minor 4개 (#7~#10) 모두 해결됨.
- 신규 이슈 1건(CORS 헤더 invalid value): minor 심각도. 동일 origin 전용 서비스에서 실제 동작 영향 없음.
- minor 이슈만 존재하므로 PASS.

Verdict: PASS
