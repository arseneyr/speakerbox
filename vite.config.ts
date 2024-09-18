import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths(), react(), svgr()],
  server: {
    // port forwarding doesn't work with WSL and IPV6
    host: "0.0.0.0",
  },
  resolve: {
    alias: {
      "@reduxjs/toolkit":
        "/workspaces/speakerbox/node_modules/@reduxjs/toolkit/src/index.ts",
    },
  },
});
