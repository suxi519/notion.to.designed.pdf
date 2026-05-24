import { describe, it, expect, beforeEach } from 'vitest';
import { useConversionStore } from './conversion-store';
import type { NotionPageData } from '@/lib/schemas/notion';

const mockPageData: NotionPageData = {
  pageId: 'abc123def456abc123def456abc123de',
  title: '테스트 페이지',
  blocks: [
    {
      id: 'block-001',
      type: 'text',
      properties: { title: [['Hello World']] },
    },
  ],
};

describe('useConversionStore', () => {
  beforeEach(() => {
    useConversionStore.getState().reset();
  });

  // AC6: 초기 상태는 idle이어야 한다
  it('초기 상태가 idle이다', () => {
    const state = useConversionStore.getState();
    expect(state.status).toBe('idle');
    expect(state.inputUrl).toBe('');
    expect(state.pageId).toBeNull();
    expect(state.pageData).toBeNull();
    expect(state.errorMessage).toBeNull();
  });

  it('setInputUrl이 inputUrl을 업데이트한다', () => {
    const { setInputUrl } = useConversionStore.getState();
    setInputUrl('https://notion.so/test-page');
    expect(useConversionStore.getState().inputUrl).toBe(
      'https://notion.so/test-page',
    );
  });

  // AC6: loading 상태 전이 검증
  it('setPageId를 호출하면 status가 loading이 되고 pageId가 설정된다', () => {
    const { setPageId } = useConversionStore.getState();
    setPageId('abc123def456abc123def456abc123de');
    const state = useConversionStore.getState();
    expect(state.status).toBe('loading');
    expect(state.pageId).toBe('abc123def456abc123def456abc123de');
  });

  it('setLoading을 호출하면 status가 loading이 된다', () => {
    const { setLoading } = useConversionStore.getState();
    setLoading();
    expect(useConversionStore.getState().status).toBe('loading');
  });

  // AC1, AC5: success 상태 전이 검증
  it('setSuccess를 호출하면 status가 success가 되고 pageData가 설정된다', () => {
    const { setLoading, setSuccess } = useConversionStore.getState();
    setLoading();
    setSuccess(mockPageData);
    const state = useConversionStore.getState();
    expect(state.status).toBe('success');
    expect(state.pageData).toEqual(mockPageData);
    expect(state.errorMessage).toBeNull();
  });

  // AC4: error 상태 전이 검증
  it('setError를 호출하면 status가 error가 되고 errorMessage가 설정된다', () => {
    const { setLoading, setError } = useConversionStore.getState();
    setLoading();
    setError('페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.');
    const state = useConversionStore.getState();
    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
    );
    expect(state.pageId).toBeNull();
  });

  // AC5: reset 동작 검증
  it('reset을 호출하면 초기 상태로 돌아간다', () => {
    const { setPageId, setSuccess, reset } = useConversionStore.getState();
    setPageId('abc123def456abc123def456abc123de');
    setSuccess(mockPageData);
    reset();
    const state = useConversionStore.getState();
    expect(state.status).toBe('idle');
    expect(state.inputUrl).toBe('');
    expect(state.pageId).toBeNull();
    expect(state.pageData).toBeNull();
    expect(state.errorMessage).toBeNull();
  });

  it('idle → loading → success → idle(reset) 전체 흐름이 올바르다', () => {
    const store = useConversionStore.getState();

    // idle
    expect(store.status).toBe('idle');

    // loading
    store.setPageId('abc123def456abc123def456abc123de');
    expect(useConversionStore.getState().status).toBe('loading');

    // success
    useConversionStore.getState().setSuccess(mockPageData);
    expect(useConversionStore.getState().status).toBe('success');

    // idle via reset
    useConversionStore.getState().reset();
    expect(useConversionStore.getState().status).toBe('idle');
  });

  it('idle → loading → error → idle(reset) 전체 흐름이 올바르다', () => {
    const store = useConversionStore.getState();

    store.setPageId('abc123def456abc123def456abc123de');
    expect(useConversionStore.getState().status).toBe('loading');

    useConversionStore
      .getState()
      .setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    expect(useConversionStore.getState().status).toBe('error');
    expect(useConversionStore.getState().errorMessage).toBe(
      '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    );

    useConversionStore.getState().reset();
    expect(useConversionStore.getState().status).toBe('idle');
  });

  it('setError 호출 시 pageId가 null로 초기화된다', () => {
    const { setPageId, setError } = useConversionStore.getState();
    setPageId('abc123def456abc123def456abc123de');
    expect(useConversionStore.getState().pageId).not.toBeNull();
    setError('에러 발생');
    expect(useConversionStore.getState().pageId).toBeNull();
  });

  it('setSuccess 호출 시 errorMessage가 null로 초기화된다', () => {
    const { setError, setLoading, setSuccess } =
      useConversionStore.getState();
    setLoading();
    setError('이전 에러');
    expect(useConversionStore.getState().errorMessage).toBe('이전 에러');
    setLoading();
    setSuccess(mockPageData);
    expect(useConversionStore.getState().errorMessage).toBeNull();
  });
});
