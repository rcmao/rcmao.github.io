import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project sites serve from a sub-folder; `./` yields relative URLs in the build.
  base: "./",
});
