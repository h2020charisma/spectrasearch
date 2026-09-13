import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/search/",
  resolve: {
    // Linked viewer packages can ship their own node_modules/react;
    // dedupe forces a single React instance so embedded component hooks work.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["@ideaconsult/qubounds-viewer", "@ideaconsult/jtoxkit-react"],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        authProbe: resolve(import.meta.dirname, "auth-probe.html"),
      },
    },
  },
});
