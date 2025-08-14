import { create } from "zustand";

export const useStore = create((set) => ({
  imageSelected: null,
  tableView: false,
  q: "*",
  setQ: (q) => set(() => ({ q: q })),

  q_reference: "*",
  setQReference: (q_reference) => set(() => ({ q_reference: q_reference })),

  source: JSON.parse(localStorage.getItem("dataSources")) || null,
  setTableView: (tableView) => set(() => ({ tableView: tableView })),
  setImageSelected: (imageSelected) =>
    set(() => ({ imageSelected: imageSelected })),
  setSource: (source) => set(() => ({ source: source })),
}));
