import { create } from 'zustand';
import { getSummary, generateSummary } from '../api';

interface SummaryState {
  summary: any;
  loading: boolean;
  setSummary: (summary: any) => void;
  setLoading: (loading: boolean) => void;
  refreshSummary: (user_id: number) => Promise<void>;
}

export const useSummaryStore = create<SummaryState>((set) => ({
  summary: null,
  loading: true,
  setSummary: (summary) => set({ summary }),
  setLoading: (loading) => set({ loading }),
  refreshSummary: async (user_id: number) => {
    set({ loading: true });
    const period_start = new Date().toISOString().slice(0, 10);
    await generateSummary({ user_id, period_type: 'weekly', period_start });
    const data = await getSummary({ user_id, period_type: 'weekly', period_start });
    set({ summary: data, loading: false });
  },
})); 