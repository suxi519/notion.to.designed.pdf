import { describe, it, expect } from 'vitest';
import {
  extractPageId,
  UrlInputSchema,
  NotionBlockSchema,
  NotionPageDataSchema,
} from './notion';

// AC3: notion.so / notion.site 가 아닌 URL은 거부해야 한다
describe('UrlInputSchema', () => {
  it('notion.so URL을 유효하다고 판단한다', () => {
    const result = UrlInputSchema.safeParse({
      url: 'https://notion.so/My-Page-abc123def456abc123def456abc123de',
    });
    expect(result.success).toBe(true);
  });

  it('www.notion.so URL을 유효하다고 판단한다', () => {
    const result = UrlInputSchema.safeParse({
      url: 'https://www.notion.so/My-Page-abc123def456abc123def456abc123de',
    });
    expect(result.success).toBe(true);
  });

  it('notion.site URL을 유효하다고 판단한다', () => {
    const result = UrlInputSchema.safeParse({
      url: 'https://notion.site/some-published-page',
    });
    expect(result.success).toBe(true);
  });

  it('워크스페이스 서브도메인.notion.site URL을 유효하다고 판단한다', () => {
    const result = UrlInputSchema.safeParse({
      url: 'https://bird-passbook-1b1.notion.site/Suxi-Han-5a644380bb1e49b0a00b523fdad38456',
    });
    expect(result.success).toBe(true);
  });

  it('www.notion.site URL을 유효하다고 판단한다', () => {
    const result = UrlInputSchema.safeParse({
      url: 'https://www.notion.site/some-published-page',
    });
    expect(result.success).toBe(true);
  });

  it('다른 도메인 URL은 "Notion 공개 페이지 URL만 지원합니다." 에러를 반환한다', () => {
    const result = UrlInputSchema.safeParse({
      url: 'https://google.com/page',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe(
        'Notion 공개 페이지 URL만 지원합니다.',
      );
    }
  });

  it('github.com 같은 URL도 거부한다', () => {
    const result = UrlInputSchema.safeParse({
      url: 'https://github.com/some-repo',
    });
    expect(result.success).toBe(false);
  });

  it('http:// 스킴의 notion.so URL도 거부한다 (https 전용)', () => {
    const result = UrlInputSchema.safeParse({
      url: 'http://notion.so/page',
    });
    expect(result.success).toBe(false);
  });

  it('URL 형식이 아닌 문자열은 "유효한 URL을 입력해 주세요." 에러를 반환한다', () => {
    const result = UrlInputSchema.safeParse({ url: 'not-a-url' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('유효한 URL을 입력해 주세요.');
    }
  });

  it('빈 문자열은 유효성 검사를 실패한다', () => {
    const result = UrlInputSchema.safeParse({ url: '' });
    expect(result.success).toBe(false);
  });

  it('notion.so가 포함된 서브도메인이 아닌 도메인은 거부한다', () => {
    // notion.so가 path에 있는 경우 (도메인이 아님)
    const result = UrlInputSchema.safeParse({
      url: 'https://evil.com/notion.so/page',
    });
    expect(result.success).toBe(false);
  });
});

// extractPageId: URL에서 32자 hex pageId 추출
describe('extractPageId', () => {
  it('slug-<32hex> 형식에서 pageId를 추출한다', () => {
    const url =
      'https://notion.so/My-Page-Title-abc123def456abc123def456abc123de';
    expect(extractPageId(url)).toBe('abc123def456abc123def456abc123de');
  });

  it('<32hex> 형식(slug 없음)에서 pageId를 추출한다', () => {
    const url = 'https://notion.so/abc123def456abc123def456abc123de';
    expect(extractPageId(url)).toBe('abc123def456abc123def456abc123de');
  });

  it('대시가 포함된 UUID 형식에서 pageId를 추출한다', () => {
    // UUID 형식: 8-4-4-4-12 = 32자
    const url =
      'https://www.notion.so/My-Page-abc123de-f456-abc1-23de-f456abc123de';
    expect(extractPageId(url)).toBe('abc123def456abc123def456abc123de');
  });

  it('32자 미만의 hex는 null을 반환한다', () => {
    const url = 'https://notion.so/short-abc123';
    expect(extractPageId(url)).toBeNull();
  });

  it('경로가 없는 URL은 null을 반환한다', () => {
    expect(extractPageId('https://notion.so/')).toBeNull();
  });

  it('잘못된 도메인 URL도 파싱을 시도하지만 hex가 없으면 null을 반환한다', () => {
    // extractPageId는 도메인 검증을 하지 않음 — UrlInputSchema가 처리
    expect(extractPageId('https://google.com/no-hex-here')).toBeNull();
  });

  it('URL 형식이 아닌 문자열은 null을 반환한다', () => {
    expect(extractPageId('not-a-url')).toBeNull();
  });

  it('빈 문자열은 null을 반환한다', () => {
    expect(extractPageId('')).toBeNull();
  });

  it('notion.site URL에서도 pageId를 추출한다', () => {
    const url =
      'https://notion.site/My-Portfolio-abc123def456abc123def456abc123de';
    expect(extractPageId(url)).toBe('abc123def456abc123def456abc123de');
  });
});

// NotionBlockSchema 유효성 검사
describe('NotionBlockSchema', () => {
  it('유효한 text 블록을 파싱한다', () => {
    const result = NotionBlockSchema.safeParse({
      id: 'block-001',
      type: 'text',
      properties: { title: [['Hello World']] },
    });
    expect(result.success).toBe(true);
  });

  it('유효한 header 블록을 파싱한다', () => {
    const result = NotionBlockSchema.safeParse({
      id: 'block-002',
      type: 'header',
      properties: { title: [['Main Title']] },
    });
    expect(result.success).toBe(true);
  });

  it('지원하지 않는 블록 타입은 거부한다', () => {
    const result = NotionBlockSchema.safeParse({
      id: 'block-003',
      type: 'database',
    });
    expect(result.success).toBe(false);
  });

  it('properties가 없어도 유효하다 (optional)', () => {
    const result = NotionBlockSchema.safeParse({
      id: 'block-004',
      type: 'divider',
    });
    expect(result.success).toBe(true);
  });

  it('content 배열이 있으면 파싱한다', () => {
    const result = NotionBlockSchema.safeParse({
      id: 'block-005',
      type: 'page',
      content: ['child-block-id-1', 'child-block-id-2'],
    });
    expect(result.success).toBe(true);
  });

  it('id가 없으면 거부한다', () => {
    const result = NotionBlockSchema.safeParse({ type: 'text' });
    expect(result.success).toBe(false);
  });
});

// NotionPageDataSchema 유효성 검사
describe('NotionPageDataSchema', () => {
  it('유효한 페이지 데이터를 파싱한다', () => {
    const result = NotionPageDataSchema.safeParse({
      pageId: 'abc123def456abc123def456abc123de',
      title: '테스트 페이지',
      blocks: [{ id: 'b1', type: 'text' }],
    });
    expect(result.success).toBe(true);
  });

  it('blocks가 빈 배열이어도 유효하다', () => {
    const result = NotionPageDataSchema.safeParse({
      pageId: 'abc123def456abc123def456abc123de',
      title: '빈 페이지',
      blocks: [],
    });
    expect(result.success).toBe(true);
  });

  it('pageId가 없으면 거부한다', () => {
    const result = NotionPageDataSchema.safeParse({
      title: '제목',
      blocks: [],
    });
    expect(result.success).toBe(false);
  });

  it('title이 없으면 거부한다', () => {
    const result = NotionPageDataSchema.safeParse({
      pageId: 'abc123def456abc123def456abc123de',
      blocks: [],
    });
    expect(result.success).toBe(false);
  });
});
