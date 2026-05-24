# Test — iter 2

> Verdict: PASS
> Tested by: tester subagent
> Date: 2026-05-24

## 명령 실행 결과

- `pnpm typecheck`: ✅
  - `tsc -b --noEmit` 및 `tsc -p tsconfig.api.json --noEmit` 모두 오류 없이 통과.
- `pnpm lint`: ✅
  - error 0, warning 2 (기존 shadcn/ui 파일인 `button.tsx`, `form.tsx`의 `react-refresh/only-export-components` 경고 — iter 1 이전부터 존재하는 파일, production 코드 수정 범위 밖)
- `pnpm test:run`: ✅ 85 passed, 0 failed, 0 skipped
  - iter 1 기존 74 tests: 전부 PASS
  - iter 2 신규 11 tests (`use-notion-conversion.test.ts`): 전부 PASS
  - 총 7개 test file, 85개 test

## 수용 기준 ↔ 테스트 매핑

### iter 1 기존 테스트 (74 tests)

- **AC1** (유효한 URL → 미리보기 표시)
  - `src/lib/queries/notion.test.ts :: "pageId가 있으면 loadNotionPage를 호출하고 data를 반환한다"` ✅
  - `src/hooks/use-notion-conversion.test.ts :: "쿼리 성공 시 status가 success이고 pageData가 반환된다"` ✅ (iter 2 신규)

- **AC3** (비-Notion URL → 인라인 에러, API 미호출)
  - `src/lib/schemas/notion.test.ts :: "다른 도메인 URL은 'Notion 공개 페이지 URL만 지원합니다.' 에러를 반환한다"` ✅
  - `src/lib/schemas/notion.test.ts :: "github.com 같은 URL도 거부한다"` ✅
  - `src/hooks/use-notion-conversion.test.ts :: "pageId를 추출할 수 없는 URL이면 toast.error를 호출하고 pageId는 null을 유지한다"` ✅ (iter 2 신규)

- **AC4** (비공개/존재하지 않는 URL → 토스트 표시)
  - `src/lib/api/notion.test.ts :: "401 응답 시 NotionApiError를 던지고 메시지가 비공개 페이지 안내다"` ✅
  - `src/lib/api/notion.test.ts :: "404 응답 시 NotionApiError를 던지고 status가 404다"` ✅
  - `src/lib/api/notion.test.ts :: "fetch 자체가 throw하면 네트워크 오류 메시지로 NotionApiError를 던진다"` ✅
  - `src/lib/queries/notion.test.ts :: "loadNotionPage가 에러를 던지면 isError가 true가 된다"` ✅
  - `src/stores/conversion-store.test.ts :: "setError를 호출하면 status가 error가 되고 errorMessage가 설정된다"` ✅
  - `src/hooks/use-notion-conversion.test.ts :: "쿼리 실패 시 status가 error이고 errorMessage가 파생된다"` ✅ (iter 2 신규)
  - `src/hooks/use-notion-conversion.test.ts :: "쿼리 실패 시 toast.error가 에러 메시지와 duration:4000으로 호출된다"` ✅ (iter 2 신규)
  - `src/hooks/use-notion-conversion.test.ts :: "에러 메시지가 빈 문자열이면 기본 메시지를 errorMessage로 파생한다"` ✅ (iter 2 신규)
  - `src/hooks/use-notion-conversion.test.ts :: "동일한 error 객체에 대해 toast.error는 한 번만 호출된다"` ✅ (iter 2 신규, useRef 가드 검증)

- **AC5** (미리보기 화면 → "다시 입력" → 입력 화면 복귀)
  - `src/stores/conversion-store.test.ts :: "reset을 호출하면 초기 상태로 돌아간다"` ✅
  - `src/hooks/use-notion-conversion.test.ts :: "reset 호출 시 store의 pageId가 null로 초기화된다"` ✅ (iter 2 신규)

- **AC6** (변환 중 버튼 비활성화 + 스피너)
  - `src/stores/conversion-store.test.ts :: "setPageId를 호출하면 status가 loading이 되고 pageId가 설정된다"` ✅
  - `src/stores/conversion-store.test.ts :: "초기 상태가 idle이다"` ✅
  - `src/hooks/use-notion-conversion.test.ts :: "초기 status가 idle이다"` ✅ (iter 2 신규)
  - `src/hooks/use-notion-conversion.test.ts :: "pageId 설정 후 쿼리가 fetching 중이면 status가 loading으로 파생된다"` ✅ (iter 2 신규)

- **AC7** (h1 블록 serif 폰트 적용)
  - `src/components/notion/block-renderer.test.tsx :: "header 블록을 <h1> 태그로 렌더링한다"` ✅
  - 실제 computed font-family는 JSDOM 환경에서 CSS 미적용으로 검증 불가 → E2E 권고 (하단 참조)

- **AC8** (미리보기 패널 최대 너비 794px 이하)
  - 자동 단위 테스트 불가 (CSS 레이아웃 수치 검증) → E2E/시각적 검증 권고 (하단 참조)

- **AC2** (다운로드 PDF 버튼 → window.print())
  - `src/components/notion/preview-panel.tsx`에 `window.print()` 호출 로직 존재하나 단위 테스트 미작성 상태
  - `window.print()` 자체는 JSDOM 환경에서 no-op이며 인쇄 CSS 검증은 브라우저 필요 → E2E 권고

### iter 2 신규 추가 테스트 (11 tests)

- `src/hooks/use-notion-conversion.test.ts` (신규 작성) — 아래 항목 전체 ✅
  1. 초기 status가 idle이다 (AC6)
  2. startConversion에 유효한 URL 전달 시 extractPageId 호출 후 store에 pageId 설정 (AC3)
  3. pageId 추출 불가 URL이면 toast.error 호출, pageId null 유지 (AC3)
  4. fetching 중 status가 loading으로 파생된다 (AC6, useMemo 파생 검증)
  5. 쿼리 성공 시 status success, pageData 반환 (AC1)
  6. 쿼리 실패 시 status error, errorMessage 파생 (AC4)
  7. 에러 메시지 빈 문자열이면 기본 메시지 반환 (AC4)
  8. toast.error가 duration:4000과 함께 호출 (AC4)
  9. 동일 error 객체에 대해 toast.error 한 번만 호출 (AC4, useRef 가드)
  10. reset 호출 시 store pageId null로 초기화 (AC5)
  11. pageId null 상태에서 status idle (useMemo 파생)

### groupBlocks 그룹화 테스트 (iter 1에서 2건, iter 2에서 2건 추가)

`groupBlocks()`는 `block-renderer.tsx` 내부 함수로 export되지 않아 `BlockRenderer` 컴포넌트를 통한 통합 테스트로 검증:

- `src/components/notion/block-renderer.test.tsx :: "numbered_list가 여러 개이면 단일 <ol> 안에 묶여 연속 번호로 렌더링된다"` ✅ (AC9 — iter 2 #9 피드백)
- `src/components/notion/block-renderer.test.tsx :: "numbered_list 사이에 다른 블록이 있으면 별도 <ol>로 분리된다"` ✅ (iter 2 #9 피드백)

## 작성한 테스트 파일

- `/Users/fox-mac/Documents/GitHub/self/notion.to.designed.pdf/src/hooks/use-notion-conversion.test.ts` (신규 작성, 11 tests)

## 실패 상세

없음. 모든 명령 PASS.

## stderr 경고 (비-FAIL)

`pnpm test:run` 실행 시 `use-notion-conversion.test.ts` 테스트마다 다음 경고가 stderr에 출력된다:

```
An update to TestComponent inside a test was not wrapped in act(...).
```

이 경고는 TanStack Query의 내부 비동기 상태 업데이트(캐시 갱신 등)가 React Testing Library의 `act()` 경계 밖에서 발생할 때 출력된다. 테스트 코드에는 이미 `await act(async () => { ... })`와 `waitFor()`가 사용되어 있으나, TanStack Query v5의 내부 scheduler가 `act()` 외부에서 상태를 flush하는 알려진 패턴에 의해 경고가 발생한다. 테스트 결과(PASS/FAIL)에는 영향 없다.

## 커버리지 / 권고

### 빠진 영역 (자동 테스트 불가)

1. **AC2** (`window.print()` 인쇄 다이얼로그): `preview-panel.tsx`의 "다운로드 PDF" 버튼 클릭 → `window.print()` 트리거 검증. JSDOM에서 `window.print()` mock으로 호출 여부 단위 테스트 추가 가능하나 인쇄 CSS(`@media print`) 적용 여부는 브라우저 필요.
2. **AC7** (h1 serif 폰트): JSDOM에서 Google Fonts CSS가 로드되지 않아 `getComputedStyle` 검증 불가. Playwright로 실제 브라우저 computed style 확인 필요.
3. **AC8** (최대 너비 794px): CSS 레이아웃 수치 검증은 JSDOM에서 불가. Playwright `element.boundingBox()` 또는 스크린샷 비교 필요.

### 향후 E2E가 필요한 시나리오

- AC1 전체 흐름 (실제 Notion 공개 페이지 URL → 미리보기 렌더링까지 10초 이내): 수동 QA 체크리스트로 대체 권고 (Notion 비공식 API 의존, CI flaky 위험)
- AC2 인쇄 CSS + 브라우저 인쇄 다이얼로그: Playwright로 `@media print` 스타일 검증 가능하나 OS 네이티브 다이얼로그 자동화 불가
- AC7 폰트 렌더링: Playwright 또는 Percy/Chromatic 시각적 회귀 테스트 권고

---

Verdict: PASS
