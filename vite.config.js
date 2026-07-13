import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
});
