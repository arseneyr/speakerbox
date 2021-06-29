import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, "/src/lib"),
    },
  },
  build: {
    rollupOptions: {
      treeshake: {
        preset: 'smallest',
        moduleSideEffects: module => !module.includes('browser-fs-access')
      }
    }
  }
});
