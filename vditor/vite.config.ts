import { cpSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import pkg from "./package.json";

const resourceMarkdownDir = resolve(__dirname, "../resource/markdown");
const localLuteDir = resolve(__dirname, "../test/output/lute");
const resourceLuteDir = resolve(resourceMarkdownDir, "dist/js/lute");

function copyLocalLuteOverride() {
  if (!existsSync(localLuteDir)) {
    return;
  }
  mkdirSync(resourceLuteDir, { recursive: true });
  cpSync(localLuteDir, resourceLuteDir, { recursive: true });
}

function copyBuildToResource(): Plugin {
  return {
    name: "copy-build-to-resource",
    closeBundle() {
      cpSync(
        resolve(__dirname, "dist"),
        resolve(resourceMarkdownDir, "dist"),
        { recursive: true },
      );
      copyLocalLuteOverride();
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    define: {
      VDITOR_VERSION: JSON.stringify(pkg.version),
    },
    server: {
      port: 3135,
      host: "127.0.0.1",
      fs: {
        allow: [resolve(__dirname, "..")],
      },
    },
    build: {
      outDir: "dist",
      minify: mode === "production",
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
          { src: "src/css", dest: ".", rename: { stripBase: 1 } },
          { src: "src/js", dest: ".", rename: { stripBase: 1 } },
        ],
      }),
      copyBuildToResource(),
    ],
  };
});
