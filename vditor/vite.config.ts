import { cpSync } from "fs";
import { resolve } from "path";
import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import pkg from "./package.json";

const resourceVditorDir = resolve(__dirname, "../resource/vditor");

function copyBuildToResource(): Plugin {
  return {
    name: "copy-build-to-resource",
    closeBundle() {
      cpSync(
        resolve(__dirname, "dist"),
        resolve(resourceVditorDir, "dist"),
        { recursive: true },
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const dest = mode === "development" ? "dist" : ".";

  return {
    define: {
      VDITOR_VERSION: JSON.stringify(pkg.version),
    },
    server: {
      port: 3135,
      host: "127.0.0.1",
    },
    build: {
      outDir: "dist",
      target: "es2015",
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        formats: ["umd"],
        name: "Vditor",
        fileName: () => "index.min.js",
      },
      rolldownOptions: {
        output: {
          exports: "default",
          assetFileNames: "index.css",
        },
      },
    },
    plugins: [
      viteStaticCopy({
        targets: [
          { src: "src/css", dest },
          { src: "src/images", dest },
          { src: "src/js", dest },
          { src: "../node_modules/@vscode/codicons/dist/codicon.css", dest: "codicon" },
          { src: "../node_modules/@vscode/codicons/dist/codicon.ttf", dest: "codicon" },
        ],
      }),
      ...(mode === "production" ? [copyBuildToResource()] : []),
    ],
  };
});
