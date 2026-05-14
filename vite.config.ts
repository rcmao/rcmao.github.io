import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoSegment = process.env.GITHUB_REPOSITORY?.split("/")[1]?.toLowerCase();
const isUserSiteRepo = Boolean(repoSegment?.endsWith(".github.io"));

const isCiBuild = process.env.GITHUB_ACTIONS === "true" || process.env.CI === "true";

/** Project Pages need a leading `/repo/` base; `./` breaks when the site URL has no trailing slash. */
const githubPagesBase = isCiBuild && repoSegment && !isUserSiteRepo ? `/${repoSegment}/` : "/";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? githubPagesBase,
  build: {
    /** Large three + GLB scene chunk — avoid noisy default warning only */
    chunkSizeWarningLimit: 1400,
  },
});
