import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Points straight at the package source so the example always reflects the latest code,
// without needing a build/link step in between.
export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  plugins: [react()],
  resolve: {
    alias: {
      "react-floating-dock": new URL("../src/index.ts", import.meta.url).pathname,
    },
  },
});
