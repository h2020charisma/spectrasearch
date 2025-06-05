import { create } from "zustand";

export const useStore = create((set) => ({
  imageSelected: null,
  tableView: false,
  setTableView: (tableView) => set(() => ({ tableView: tableView })),
  setImageSelected: (imageSelected) =>
    set(() => ({ imageSelected: imageSelected })),
}));
