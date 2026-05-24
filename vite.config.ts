import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

/**
 * Vite 미들웨어 플러그인: /api/notion/load-page 요청을 Edge Function 핸들러로 라우팅.
 * dev/prod 동일한 핸들러(api/notion/load-page.ts)를 사용하므로
 * 보안 화이트리스트 검증(isValidPageId)이 로컬 개발에서도 동작한다.
 */
function notionApiPlugin(): Plugin {
  return {
    name: 'notion-api-middleware',
    configureServer(server) {
      server.middlewares.use(
        '/api/notion/load-page',
        async (req, res, next) => {
          // Node.js IncomingMessage → Web API Request 변환
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const rawBody = Buffer.concat(chunks).toString('utf-8');
              const webReq = new Request(
                `http://localhost${req.url ?? '/api/notion/load-page'}`,
                {
                  method: req.method,
                  headers: req.headers as Record<string, string>,
                  body:
                    req.method !== 'GET' && req.method !== 'HEAD'
                      ? rawBody
                      : undefined,
                },
              );

              // 동일한 핸들러 실행 → 보안 검증 포함
              const { default: handler } = await import(
                './api/notion/load-page.ts'
              );
              const webRes: Response = await (
                handler as (req: Request) => Promise<Response>
              )(webReq);

              res.statusCode = webRes.status;
              webRes.headers.forEach((value, key) => {
                res.setHeader(key, value);
              });
              const body = await webRes.text();
              res.end(body);
            } catch (err) {
              next(err);
            }
          });
        },
      );
    },
  };
}

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    notionApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // proxy 설정 제거: 로컬 개발도 동일 핸들러를 통해 보안 검증이 적용된다.
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
  },
  // @ts-expect-error vitest config merged here
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
