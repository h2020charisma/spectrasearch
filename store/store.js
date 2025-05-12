import { create } from "zustand";

export const useImageStore = create((set) => ({
  imageSelected: null,
  setImageSelected: (imageSelected) =>
    set(() => ({ imageSelected: imageSelected })),
  //   updateFirstName: (firstName) => set(() => ({ firstName: firstName })),
}));
