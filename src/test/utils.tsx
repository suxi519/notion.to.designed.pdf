import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * TanStack Query를 사용하는 훅/컴포넌트 테스트용 래퍼.
 * 각 테스트마다 새로운 QueryClient를 생성하여 캐시 누수를 방지한다.
 */
export function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return { queryClient, QueryWrapper };
}

/**
 * QueryClientProvider로 감싸서 render하는 헬퍼.
 */
export function renderWithQuery(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const { QueryWrapper, queryClient } = createQueryWrapper();
  const result = render(ui, { wrapper: QueryWrapper, ...options });
  return { ...result, queryClient };
}
