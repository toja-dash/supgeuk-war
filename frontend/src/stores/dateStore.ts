import { create } from 'zustand';

interface DateState {
  currentDate: string | null;
  setDate: (date: string) => void;
}

export const useDateStore = create<DateState>((set) => ({
  currentDate: null,
  setDate: (date) => set({ currentDate: date }),
}));
