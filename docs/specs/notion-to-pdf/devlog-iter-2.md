# Devlog — iter 2

> Slug: notion-to-pdf
> Date: 2026-05-24

## 이 iteration의 의도

iter 1 Reviewer의 10개 FAIL 항목(Major 6개, Minor 4개)을 모두 수정한다.
레이어드 아키텍처 위반, 보안 우회, 데드 의존성, race condition 등 구조적 문제를 해결한다.

## 변경 파일

- `package.json` — `next-themes` 제거 (dependencies), `typecheck` 스크립트에 `tsc -p tsconfig.api.json --noEmit` 추가
- `tsconfig.json` — 루트 references에서 `tsconfig.api.json` 제거 (standalone 방식으로 전환)
- `tsconfig.app.json` — 변경 없음 (composite 추가/제거 반복 후 원상복구)
- `tsconfig.node.json` — `baseUrl`, `paths(@/*)`, `"include": ["vite.config.ts", "api"]` 추가 — Vite 플러그인의 dynamic import가 `api/` 파일을 당겨와서 node tsconfig가 alias를 알아야 함
- `tsconfig.api.json` — 신규 — `api/`와 `src/lib/schemas/notion.ts`만 포함하는 standalone tsconfig. `@/*` paths 포함
- `vite.config.ts` — proxy 설정 제거, `notionApiPlugin()` Vite 미들웨어 플러그인 추가 (옵션 B 선택)
- `api/notion/load-page.ts` — import를 `@/lib/schemas/notion`으로 변경, OPTIONS preflight 응답(204) 추가, CORS 헤더 추가
- `src/hooks/use-notion-conversion.ts` — 신규 — 변환 흐름 전체 캡슐화 훅
- `src/routes/index.tsx` — `useNotionConversion` 훅 하나만 import, `NotionApiError`/`extractPageId`/`useNotionPage` 직접 import 제거, magic number `56px` 제거, `min-h-screen` Tailwind 클래스 사용
- `src/routes/__root.tsx` — `style={{ backgroundColor: 'var(--color-paper)' }}` inline style 제거
- `src/components/notion/block-renderer.tsx` — `groupBlocks()` 함수로 연속 `numbered_list`를 단일 `<ol>`로 그룹화, 이미지 alt에 caption 활용, `extractCaption` 헬퍼 추가
- `src/components/notion/loading-spinner.tsx` — 루트에 `no-print` 클래스 추가
- `src/components/notion/block-renderer.test.tsx` — numbered_list 그룹화에 맞게 테스트 2건 업데이트

## 결정 요지

### #3 Vite dev proxy 보안 우회 — 옵션 B 선택

옵션 A(proxy 제거 + `vercel dev` 사용)는 추가 CLI 설치 의존성이 생기고, 로컬 개발 환경 설정 부담이 커진다.
옵션 B(Vite 미들웨어 플러그인)를 선택했다. `vite.config.ts`의 `configureServer`에서 Node.js `IncomingMessage`를 Web API `Request`로 변환한 뒤 `api/notion/load-page.ts`의 `handler`를 직접 실행한다. 이렇게 하면:
- 로컬에서도 `isValidPageId` 화이트리스트 검증이 통과해야만 Notion API를 호출할 수 있다.
- dev/prod가 동일한 코드 경로를 사용해 환경 간 일관성이 유지된다.
- `vercel` CLI 없이 `pnpm dev`만으로 개발 가능하다.

Dynamic import(`import('./api/notion/load-page.ts')`)로 인해 `tsconfig.node.json`이 `api/` 파일을 타입 체크 범위에 포함하게 됐고, `@/*` alias를 node tsconfig에도 추가해야 했다.

### #4/#5/#6 Routes 레이어 위반 + race condition 해결 — `useNotionConversion` 훅

`src/hooks/use-notion-conversion.ts`를 신규 작성해 다음을 모두 캡슐화했다:
- `extractPageId` 호출 (Schemas 레이어 접근)
- `useNotionPage` 쿼리 사용 (Queries 레이어 접근)
- 에러 메시지 표준화 (API 레이어 타입 처리)
- 에러 토스트 표시

race condition 해결: `useEffect + setSuccess/setError` 패턴을 완전히 제거하고 `status`와 `pageData`를 `useMemo`로 query 상태에서 직접 파생했다. 에러 토스트만 불가피하게 `useEffect`를 사용하되, `useRef`로 동일 `error` 객체에 대한 중복 표시를 방지했다.

Routes(`src/routes/index.tsx`)는 이 훅 하나만 import한다.

### #9 numbered_list 그룹화

`groupBlocks()` 순수 함수로 블록 배열을 `NumberedGroup | OtherBlock` 배열로 변환한다. 연속된 `numbered_list` 블록은 단일 `<ol>`의 여러 `<li>`로 렌더링되어 HTML 시맨틱과 CSS counter가 정상 동작한다. 기존 테스트 2건(`start` 속성 검증)을 새 구현(단일 `<ol>` + 다수 `<li>`)에 맞게 업데이트했다.

## 자가 점검 결과

- `pnpm typecheck`: ✅ (`tsc -b --noEmit && tsc -p tsconfig.api.json --noEmit` 모두 통과)
- `pnpm lint`: ✅ (error 0, warning 2 — 기존 shadcn 파일 동일)
- `pnpm test:run`: ✅ (74 tests passed)

## 피드백 반영

- Reviewer #1 (`next-themes 데드 의존성`) → `pnpm remove next-themes`로 제거
- Reviewer #2 (`api/ 상대경로 import`) → `@/lib/schemas/notion` alias 사용. `tsconfig.node.json` + `tsconfig.api.json` 보강으로 타입 체크 통과
- Reviewer #3 (`Vite dev proxy 보안 우회`) → proxy 제거, Vite 미들웨어 플러그인(옵션 B)으로 교체
- Reviewer #4 (`Routes → Queries 레이어 위반`) → `useNotionConversion` 훅으로 캡슐화
- Reviewer #5 (`Routes → Schemas 레이어 위반`) → `extractPageId` 호출을 훅 내부로 이동
- Reviewer #6 (`useEffect race condition`) → `useMemo` 직접 파생으로 전환, 에러 토스트는 `useRef` 가드 추가
- Reviewer #7 (`__root.tsx inline style`) → `style={{ backgroundColor: ... }}` 제거, `body` CSS만 유지
- Reviewer #8 (`magic number 56px`) → `min-h-screen` Tailwind 클래스로 대체
- Reviewer #9 (`numbered_list 연속성`) → `groupBlocks()` 그룹화 로직 추가
- Reviewer #10 (`OPTIONS preflight 미처리`) → `req.method === 'OPTIONS'` 분기 추가, 204 + CORS 헤더 응답

## 미해결 / 향후 작업

- `conversion-store.ts`의 `setLoading/setSuccess/setError` 액션들이 `useNotionConversion` 훅 도입으로 사용되지 않게 됐다. store는 `pageId`와 `reset()`만 실질적으로 사용 중이다. 향후 store 슬림화를 고려할 수 있으나 spec 범위 밖이므로 이 iter에서 건드리지 않는다.
- `src/test/utils.tsx:33`의 `renderWithQuery` 타입 추론 오류(`pretty-format` 참조 필요)가 `tsc -b`에서 warning으로 표시된다 — 기존 파일 문제이고 테스트 실행에는 영향 없음.
