import { create } from 'zustand';
import type { NotionPageData } from '@/lib/schemas/notion';

export type ConversionStatus = 'idle' | 'loading' | 'success' | 'error';

type ConversionStore = {
  status: ConversionStatus;
  inputUrl: string;
  pageId: string | null;
  pageData: NotionPageData | null;
  errorMessage: string | null;
  setInputUrl: (url: string) => void;
  setPageId: (pageId: string) => void;
  setLoading: () => void;
  setSuccess: (pageData: NotionPageData) => void;
  setError: (message: string) => void;
  reset: () => void;
};

export const useConversionStore = create<ConversionStore>((set) => ({
  status: 'idle',
  inputUrl: '',
  pageId: null,
  pageData: null,
  errorMessage: null,

  setInputUrl: (url) => set({ inputUrl: url }),

  setPageId: (pageId) => set({ pageId, status: 'loading' }),

  setLoading: () => set({ status: 'loading' }),

  setSuccess: (pageData) =>
    set({ status: 'success', pageData, errorMessage: null }),

  setError: (message) =>
    set({ status: 'error', errorMessage: message, pageId: null }),

  reset: () =>
    set({
      status: 'idle',
      inputUrl: '',
      pageId: null,
      pageData: null,
      errorMessage: null,
    }),
}));
