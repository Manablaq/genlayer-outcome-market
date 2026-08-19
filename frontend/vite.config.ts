import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          genlayer: ["genlayer-js", "viem"],
          icons: ["lucide-react"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
