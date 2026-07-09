import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, "src/embed/main.js"),
      name: "FormyEmbed",
      formats: ["iife"],
      fileName: () => "formy-embed.js",
    },
  },
});
