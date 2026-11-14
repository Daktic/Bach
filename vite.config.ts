import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    solidStart({ middleware: "./src/middleware.ts" }),
    nitro(),
    tailwindcss(),
  ],
  // Dev only. SolidStart's dev-toolbar error viewer imports named exports
  // from two CommonJS packages. Unbundled, the browser can't read them and
  // every dev page logs a SyntaxError; pre-bundling converts them to ESM.
  optimizeDeps: {
    include: ["@solidjs/start > source-map-js", "@solidjs/start > error-stack-parser"],
  },
});
