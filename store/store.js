import { create } from "zustand";

export const useStore = create((set) => ({
  imageSelected: null,
  tableView: false,
  source: JSON.parse(localStorage.getItem("mockSources")) || null,
  setTableView: (tableView) => set(() => ({ tableView: tableView })),
  setImageSelected: (imageSelected) =>
    set(() => ({ imageSelected: imageSelected })),
  setSource: (source) => set(() => ({ source: source })),
}));
