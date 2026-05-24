import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingSpinner() {
  return (
    <div
      className="no-print flex flex-col items-center gap-6 py-16"
      aria-busy="true"
      aria-label="페이지를 불러오는 중입니다"
    >
      <Loader2 className="size-10 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Notion 페이지를 불러오는 중입니다...
      </p>
      <div className="w-full max-w-[794px] space-y-4 px-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-6 w-1/2 mt-4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
