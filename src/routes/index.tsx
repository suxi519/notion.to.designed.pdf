import { createFileRoute } from '@tanstack/react-router';
import { UrlInputForm } from '@/components/notion/url-input-form';
import { LoadingSpinner } from '@/components/notion/loading-spinner';
import { PreviewPanel } from '@/components/notion/preview-panel';
import { useNotionConversion } from '@/hooks/use-notion-conversion';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { status, pageData, isConverting, startConversion, reset } =
    useNotionConversion();

  return (
    <div className="flex min-h-screen flex-col items-center w-full">
      {/* 헤더 영역 — 인쇄 시 숨김 */}
      <section
        className="no-print flex flex-col items-center text-center gap-4 w-full py-20"
        style={{ paddingBottom: 'var(--spacing-section)' }}
      >
        <h1
          className="text-5xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}
        >
          Notion to PDF
        </h1>
        <p
          className="text-lg text-muted-foreground max-w-md"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Notion 공개 페이지 URL을 입력하면 세련된 PDF를 즉시 만들어 드립니다.
        </p>
      </section>

      {/* 입력 폼 — 미리보기 상태가 아닐 때, 인쇄 시 숨김 */}
      {status !== 'success' && (
        <section className="no-print w-full max-w-2xl px-4">
          <UrlInputForm isLoading={isConverting} onSubmit={startConversion} />
        </section>
      )}

      {/* 로딩 상태 */}
      {isConverting && (
        <div className="no-print w-full mt-12">
          <LoadingSpinner />
        </div>
      )}

      {/* 미리보기 패널 */}
      {status === 'success' && pageData && (
        <section className="w-full flex flex-col items-center mt-12 px-4">
          <PreviewPanel pageData={pageData} onReset={reset} />
        </section>
      )}
    </div>
  );
}
