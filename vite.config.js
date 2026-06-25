import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/search/",
  resolve: {
    // The linked @adma/qubounds-viewer package ships its own node_modules/react;
    // dedupe forces a single React instance so embedded component hooks work.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["@adma/qubounds-viewer"],
  },
});
