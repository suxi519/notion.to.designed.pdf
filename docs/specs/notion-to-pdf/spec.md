# Notion to Designed PDF

> Status: draft
> Slug: notion-to-pdf
> Created: 2026-05-24

## 1. 목표 (Why)

Notion 공개 페이지 URL만 있으면 누구나 별도 계정·API 키 없이 세련된 PDF를 즉시 생성할 수 있어야 한다.
기존 노션 내보내기(Export)는 디자인이 없고, 유료 서드파티 도구는 가입 장벽이 있다.
이 도구는 한 페이지짜리 웹앱으로 URL 입력 → 미리보기 → 다운로드 흐름을 3분 안에 완결한다.

## 2. 사용자 스토리

- As a Notion 사용자, I want 공개 페이지 URL을 붙여넣기만 해서 디자인된 PDF를 받고 싶다, so that 별도 편집 없이 포트폴리오·문서를 배포할 수 있다.
- As a 방문자, I want 다운로드 전 미리보기로 결과물을 확인하고 싶다, so that 기대와 다른 파일을 받는 일을 방지할 수 있다.

## 3. 기능 요구사항 (What)

### 랜딩 + 입력 영역

- 페이지 최상단에 서비스 제목과 1줄 설명 문구를 표시한다.
- URL 입력 필드(placeholder: `https://notion.so/...`)와 "변환" 버튼을 단일 행으로 배치한다.
- 입력값이 `notion.so` 또는 `notion.site` 도메인이 아니면 버튼 클릭 시 인라인 에러 메시지를 표시한다. 다른 URL은 처리하지 않는다.
- 변환 진행 중 버튼은 비활성화되고 로딩 스피너를 표시한다.

### 콘텐츠 페치 (기술 선택: 1안 권장)

**1안 (권장) — Notion 비공식 API + 서버리스 프록시**
- `https://www.notion.so/api/v3/loadPageChunk` 엔드포인트를 서버리스 함수(Vercel Edge Function 또는 Vite dev-proxy)를 통해 CORS 우회 호출한다.
- 응답 JSON을 파싱해 제목·블록 트리를 추출한다.
- 장점: 별도 라이브러리 없이 원본 데이터 취득, 포맷 제어 용이.
- 단점: 비공식 API 스펙 변경 위험, 비공개 페이지는 401.

**2안 — `react-notion-x` 라이브러리**
- `NotionAPI` 클라이언트가 동일 비공식 API를 래핑해준다.
- 장점: 블록 렌더러(`NotionRenderer`) 동봉, 초기 구현 빠름.
- 단점: SSR 최적화 전제로 설계돼 CSR에서 번들 크기 비대(~200 kB). 스타일 오버라이드 복잡.

**3안 — 서버사이드 헤드리스 브라우저 (Puppeteer/Playwright)**
- 실제 Notion 페이지를 렌더링 후 PDF 출력.
- 장점: 노션 공식 렌더링 그대로.
- 단점: 서버 인프라 필요, 클라이언트 사이드 불가, 비용 발생.

**결론: 1안 채택.** Vite devProxy(`/api` → `https://www.notion.so`)로 로컬 CORS 해결, 프로덕션은 Vercel rewrites로 동일 경로 프록시. `react-notion-x`는 선택적으로 렌더러 부분만 추가 고려.

### PDF 변환 (기술 선택)

| 라이브러리 | 장점 | 단점 | 권장 |
|---|---|---|---|
| `html2pdf.js` | 간단한 API, jspdf+html2canvas 래핑 | canvas 기반이라 텍스트 선택 불가, 폰트 래스터화 | 후보 |
| `jspdf + html2canvas` | 세밀한 제어 | 구현량 많음, 위와 동일 단점 | 비권장 |
| `@react-pdf/renderer` | 텍스트 선택 가능, 벡터 PDF | DSL 별도 학습, 노션 블록 → PDF 컴포넌트 매핑 공수 큼 | 비권장(1차) |
| 브라우저 인쇄 CSS (`window.print`) | 텍스트 선택 가능, 폰트 품질 최상, 추가 라이브러리 0 | 브라우저마다 렌더링 차이, 저장 경로 사용자 지정 불가 | **1차 권장** |

**결론: 브라우저 인쇄 CSS + `window.print()` 1차 채택.** `@media print` CSS로 헤더/UI 숨기고 A4 페이지 레이아웃 적용. 사용자가 "PDF로 저장" 선택하면 파일 다운로드. 폴백(fallback)으로 `html2pdf.js` 버튼도 제공 가능 — 1차 범위 밖.

### 미리보기 화면

- 변환 성공 시 페이지 콘텐츠를 A4 비율 카드 안에 렌더링한다(웹 미리보기).
- 미리보기 카드는 최대 너비 794px(A4 픽셀 기준 96dpi), 스크롤 가능.
- "다운로드 PDF" 버튼 클릭 시 `window.print()` 실행. 인쇄 CSS가 미리보기 카드만 출력 영역으로 지정.
- "다시 입력" 버튼으로 입력 화면으로 돌아간다(URL 필드 초기화).

### 디자인 스타일

- 배경: 오프화이트(`#FAFAF8`).
- 헤드라인: serif 계열 폰트(Google Fonts `Playfair Display` 또는 `Lora`), 크기 scale 48/36/24/18px.
- 본문: sans-serif(`Inter`), 16px, line-height 1.7.
- 여백: 페이지 수직 여백 최소 80px, 섹션 간 48px.
- 컬러: 흑백 단색 위주, 강조 accent 없음(매거진 스타일).
- 미리보기 카드: 흰 배경, 좌우 64px 패딩, 상하 80px 패딩, 그림자 없음(인쇄 감각).
- 블록별 스타일: h1 serif 대문자 tracking, h2 serif, h3 sans-serif semibold, blockquote 왼쪽 4px 라인 + italic, callout 연회색 배경, 코드블록 monospace.
- 페이지 번호: 인쇄 CSS `@page` counter로 하단 중앙 표시.

## 4. 비기능 요구사항

- **성능**: 공개 노션 페이지 콘텐츠 페치 완료 후 미리보기 렌더링까지 총 10초 이내 (네트워크 지연 제외 순수 처리 5초 이내).
- **접근성**: 입력 필드에 `aria-label`, 에러 메시지에 `role="alert"`, 로딩 상태에 `aria-busy`.
- **에러 처리**:
  - 비공개 페이지 또는 존재하지 않는 URL → "페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요." 토스트.
  - 네트워크 오류 → "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." 토스트.
  - 지원하지 않는 블록 타입 → 해당 블록 건너뛰고 나머지 렌더링 계속.
- **보안**: 프록시 엔드포인트는 `notion.so` 도메인으로의 요청만 허용. 사용자 입력 URL을 서버에서 화이트리스트 검증.
- **번들**: 초기 JS 번들 500kB(gzip) 이하 유지.

## 5. UI 스케치

### 화면 흐름

```
[랜딩/입력 화면]
  ↓ URL 입력 + "변환" 클릭
[로딩 상태] (스피너, 버튼 비활성화)
  ↓ 성공
[미리보기 화면]
  ├─ "다운로드 PDF" → window.print() → 브라우저 인쇄 다이얼로그
  └─ "다시 입력" → 입력 화면으로 돌아감
  ↓ 실패
[에러 토스트 표시] → 입력 화면 유지
```

### 주요 컴포넌트 구성

```
<RootLayout>               // 전체 여백, 배경색
  <HeroSection>            // 서비스 제목 + 설명
  <UrlInputForm>           // 입력 필드 + 변환 버튼
  <LoadingOverlay>         // 로딩 스피너 (조건부)
  <PreviewPanel>           // A4 카드 + 액션 버튼 (조건부)
    <NotionBlockRenderer>  // 블록별 styled 컴포넌트
  <PrintStyles>            // @media print CSS (style 태그)
```

### shadcn/ui 컴포넌트 후보

- `Button` (기존 존재) — 변환/다운로드/다시입력 버튼
- `Input` (신규 추가) — URL 입력 필드
- `Form` + `FormField` (신규) — react-hook-form 연동 폼 래퍼
- `Sonner` (신규) — 에러/성공 토스트
- `Skeleton` (신규) — 로딩 중 콘텐츠 플레이스홀더

### 디자인 토큰 노트

- `--font-serif`: `'Playfair Display', Georgia, serif`
- `--font-sans`: `'Inter', system-ui, sans-serif`
- `--color-paper`: `#FAFAF8`
- `--color-ink`: `#1A1A1A`
- `--color-ink-muted`: `#6B6B6B`
- `--spacing-page`: `80px`
- `--spacing-section`: `48px`
- 인쇄 페이지: `@page { size: A4; margin: 20mm 25mm; }`

## 6. 데이터 모델 / API

### Zod 스키마

```ts
// URL 입력 폼
const UrlInputSchema = z.object({
  url: z
    .string()
    .url('유효한 URL을 입력해 주세요.')
    .refine(
      (v) => /^https:\/\/(www\.)?notion\.(so|site)\//.test(v),
      'Notion 공개 페이지 URL만 지원합니다.'
    ),
});

// 노션 블록 (최소 필요 타입)
const NotionBlockSchema = z.object({
  id: z.string(),
  type: z.enum([
    'page', 'text', 'header', 'sub_header', 'sub_sub_header',
    'bulleted_list', 'numbered_list', 'quote', 'code',
    'callout', 'image', 'divider', 'table_of_contents',
  ]),
  properties: z.record(z.unknown()).optional(),
  content: z.array(z.string()).optional(), // child block IDs
});

const NotionPageDataSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  blocks: z.array(NotionBlockSchema),
});
```

### 클라이언트 상태 (Zustand store)

```ts
type ConversionStore = {
  status: 'idle' | 'loading' | 'success' | 'error';
  inputUrl: string;
  pageData: NotionPageData | null;
  errorMessage: string | null;
  setInputUrl: (url: string) => void;
  fetchPage: (url: string) => Promise<void>;
  reset: () => void;
};
```

### 프록시 API (Vite devProxy / Vercel rewrite)

```
POST /api/notion/load-page
Request:  { pageId: string }          // URL からパース
Response: { pageData: NotionPageData } // 200
          { error: string }            // 4xx/5xx
```

내부적으로 `https://www.notion.so/api/v3/loadPageChunk` 를 서버에서 호출해 CORS 우회. 클라이언트는 `/api/notion/load-page` 만 알면 됨.

**클라이언트 상태 vs 서버 상태 분리**
- 서버 상태: TanStack Query `useQuery`로 페이지 데이터 캐싱 (staleTime: 5분).
- 클라이언트 상태: Zustand `ConversionStore`로 `status`, `inputUrl` 관리.

## 7. 수용 기준 (Acceptance Criteria)

- **AC1**: GIVEN 유효한 Notion 공개 페이지 URL을 입력 WHEN "변환" 버튼 클릭 THEN 10초 이내에 미리보기 패널이 화면에 표시된다.
- **AC2**: GIVEN 미리보기가 표시된 상태 WHEN "다운로드 PDF" 버튼 클릭 THEN 브라우저 인쇄 다이얼로그가 열리고 미리보기 UI(헤더, 입력 폼)는 인쇄 영역에서 제외된다.
- **AC3**: GIVEN `notion.so` 또는 `notion.site` 도메인이 아닌 URL 입력 WHEN "변환" 버튼 클릭 THEN "Notion 공개 페이지 URL만 지원합니다." 인라인 에러 메시지가 즉시(0초) 표시되고 API 호출은 발생하지 않는다.
- **AC4**: GIVEN 비공개이거나 존재하지 않는 Notion URL 입력 WHEN 변환 시도 THEN "페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요." 토스트가 4초 이상 표시되고 입력 화면이 유지된다.
- **AC5**: GIVEN 미리보기 화면 WHEN "다시 입력" 버튼 클릭 THEN 미리보기 패널이 사라지고 URL 입력 필드가 빈 상태로 입력 화면이 표시된다.
- **AC6**: GIVEN 변환 진행 중 WHEN 로딩 상태 THEN 버튼이 비활성화(disabled)되고 스피너가 표시된다.
- **AC7**: GIVEN 미리보기 렌더링 WHEN h1 블록 확인 THEN serif 폰트(Playfair Display 또는 Lora)가 적용된다 (브라우저 computed style 기준).
- **AC8**: GIVEN 미리보기 패널 WHEN A4 카드 너비 확인 THEN 최대 너비 794px 이하로 렌더링된다.

## 8. 범위 밖 (Out of Scope)

- Notion 공식 API(API key / OAuth) 연동
- 비공개 페이지 접근
- 다크 모드 미리보기 / 다크 모드 PDF
- PDF 내 레이아웃 커스터마이징 옵션 (폰트 선택, 컬러 테마 등)
- 데이터베이스(Database) 블록, 임베드(Embed) 블록 렌더링
- 변환 이력 저장 / 사용자 계정
- 모바일 전용 최적화 (반응형은 기본 지원하되 모바일 인쇄 플로우 미검증)
- `html2pdf.js` 폴백 다운로드 (2차 작업)
- 다국어(i18n)

## 9. 가정 (Assumptions)

1. **CORS 우회 방식**: Vite devProxy로 로컬 개발, 프로덕션 배포는 Vercel rewrites 사용 가정. 다른 호스팅 환경이면 별도 서버리스 함수 구성 필요.
2. **Notion 비공식 API 안정성**: `loadPageChunk` 엔드포인트는 2026년 5월 기준 동작 확인되었다고 가정. 스펙 변경 시 파서 수정 필요.
3. **공개 페이지 정의**: URL에 인증 없이 브라우저에서 열 수 있는 페이지를 "공개"로 정의. workspace 내 공유는 범위 밖.
4. **폰트 로딩**: Google Fonts CDN 접근 가능 환경 가정. 방화벽 환경에서는 서체 폴백(Georgia, system-ui)으로 표시됨.
5. **지원 브라우저**: Chrome 120+, Safari 17+, Firefox 121+. IE/Legacy Edge 미지원.
6. **인쇄 다이얼로그 경험**: `window.print()`는 브라우저 네이티브 다이얼로그를 사용하므로 파일명 자동 지정 불가. 사용자가 직접 "PDF로 저장" 선택 필요.
7. **블록 파싱 범위**: 텍스트, 헤딩(h1~h3), 불릿/번호 리스트, 인용, 코드, callout, 이미지, divider만 1차 지원. 나머지 블록은 빈 영역으로 처리.

## 10. E2E 검증 필요 여부

- **needsE2E**: `false`

**판단 근거**: 사용자 플로우는 다단계(입력 → 로딩 → 미리보기 → 인쇄 다이얼로그)로 E2E 조건에 해당하나, 핵심 스텝이 **외부 Notion 서버**에 의존한다. Playwright/Cypress에서 실제 Notion 공개 URL을 호출하면:
- 페이지가 비공개로 전환될 경우 flaky 테스트 발생
- CI에서 Notion 비공식 API rate-limit 가능성
- `window.print()` 다이얼로그는 E2E 도구에서 자동화 불가(OS 네이티브 UI)

대신 다음 전략으로 검증 커버리지를 확보한다:
- **Vitest + msw**: `/api/notion/load-page` mock 응답으로 입력→미리보기 렌더링 단위 테스트
- **Vitest**: URL 유효성 검사 로직, 블록 파서 함수 단위 테스트
- **수동 E2E 체크리스트** (AC1~AC8): QA 시점에 실제 공개 페이지 URL로 직접 확인
