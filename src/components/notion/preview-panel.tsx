import { Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlockRenderer } from '@/components/notion/block-renderer';
import type { NotionPageData } from '@/lib/schemas/notion';

type PreviewPanelProps = {
  pageData: NotionPageData;
  onReset: () => void;
};

export function PreviewPanel({ pageData, onReset }: PreviewPanelProps) {
  function handleDownload() {
    window.print();
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* 액션 버튼 영역 — 인쇄 시 숨김 */}
      <div className="no-print flex gap-3 w-full max-w-[794px]">
        <Button onClick={handleDownload} className="gap-2">
          <Download className="size-4" />
          다운로드 PDF
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="size-4" />
          다시 입력
        </Button>
      </div>

      {/* A4 미리보기 카드 — 인쇄 시 이 영역만 출력 */}
      <div
        id="print-area"
        className="a4-card w-full max-w-[794px] bg-white px-16 py-20"
        aria-label="A4 미리보기"
      >
        <h1 className="notion-page-title">{pageData.title}</h1>
        <BlockRenderer blocks={pageData.blocks} />
      </div>
    </div>
  );
}
