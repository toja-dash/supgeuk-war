import { create } from 'zustand';

interface FilterState {
  type: string;
  defense: string;
  sfi_inst_min: number;
  sfi_frgn_min: number;
  setType: (t: string) => void;
  setDefense: (d: string) => void;
  setSfiInstMin: (v: number) => void;
  setSfiFrgnMin: (v: number) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  type: 'ALL',
  defense: 'ALL',
  sfi_inst_min: -30.0,
  sfi_frgn_min: -30.0,
  setType: (t) => set({ type: t }),
  setDefense: (d) => set({ defense: d }),
  setSfiInstMin: (v) => set({ sfi_inst_min: v }),
  setSfiFrgnMin: (v) => set({ sfi_frgn_min: v }),
}));
