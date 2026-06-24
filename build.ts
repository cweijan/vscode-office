const { build } = require("esbuild")
const { resolve } = require("path")
const { existsSync } = require("fs")
const { copy } = require("esbuild-plugin-copy")

const isProd = process.argv.indexOf('--mode=production') >= 0;
const extensionTarget = process.env.OFFICE_EXTENSION_TARGET;
const isWebOnly = process.argv.includes('--target=web') || extensionTarget === 'web';
const isDesktopOnly = process.argv.includes('--target=desktop') || extensionTarget === 'desktop';

const dependencies = ['vscode-html-to-docx', 'highlight.js', 'pdf-lib', 'cheerio', 'katex', 'mustache', 'puppeteer-core']
const nodeBuiltinStubs = ['fs', 'child_process', 'os', 'crypto', 'stream', 'https', 'http', 'net', 'tls', 'zlib', 'events', 'util', 'buffer', 'module', 'url', 'assert', 'string_decoder']

function createAssetCopyPlugins() {
    return [
        copy({
            resolveFrom: 'out',
            assets: {
                from: ['./template/**/*'],
                to: ['./'],
                keepStructure: true
            },
        }),
        copy({
            resolveFrom: 'out',
            assets: {
                from: ['./node_modules/node-unrar-js/dist/js/unrar.wasm'],
                to: ['./'],
                keepStructure: true
            },
        }),
        copy({
            resolveFrom: 'out',
            assets: {
                from: ['./node_modules/7z-wasm/7zz.wasm'],
                to: ['./'],
                keepStructure: true
            },
        }),
    ];
}

function createNodeShimPlugin() {
    const shimDir = resolve(__dirname, 'src/shims');
    const packageStubs = {
        '7z-wasm': '7z-wasm.ts',
        'node-unrar-js': 'node-unrar-js.ts',
        'tar': 'tar.ts',
        'puppeteer-core': 'puppeteer-core.ts',
        'chrome-finder': 'chrome-finder.ts',
        'file-type': 'file-type.ts',
    };
    return {
        name: 'node-shim',
        setup(build) {
            build.onResolve({ filter: /^path$/ }, () => ({ path: resolve(shimDir, 'path.ts') }));
            build.onResolve({ filter: /^node:path$/ }, () => ({ path: resolve(shimDir, 'path.ts') }));
            build.onResolve({ filter: /markdown[\\/]markdown-pdf(\.js)?$/ }, () => ({
                path: resolve(shimDir, 'markdown-pdf.ts'),
            }));
            build.onResolve({ filter: /markdown[\\/]html-export\.js$/ }, () => ({
                path: resolve(shimDir, 'markdown-pdf.ts'),
            }));
            for (const [moduleName, stubFile] of Object.entries(packageStubs)) {
                build.onResolve({ filter: new RegExp(`^${moduleName}$`) }, () => ({
                    path: resolve(shimDir, stubFile),
                }));
            }
            for (const moduleName of nodeBuiltinStubs) {
                const stubPath = resolve(shimDir, `${moduleName}.ts`);
                build.onResolve({ filter: new RegExp(`^${moduleName}$`) }, () => ({
                    path: existsSync(stubPath) ? stubPath : resolve(shimDir, 'empty-stub.ts'),
                }));
            }
            build.onResolve({ filter: /^node:/ }, (args) => {
                const bare = args.path.slice(5);
                if (bare === 'fs/promises') {
                    return { path: resolve(shimDir, 'fs.ts') };
                }
                const stubPath = resolve(shimDir, `${bare}.ts`);
                return {
                    path: existsSync(stubPath) ? stubPath : resolve(shimDir, 'empty-stub.ts'),
                };
            });
        },
    };
}

function createBuildNoticePlugin() {
    return {
        name: 'build notice',
        setup(build) {
            build.onStart(() => {
                console.log('build start')
            })
            build.onEnd(() => {
                console.log('build success')
            })
        }
    };
}

function buildDesktopExtension() {
    return build({
        entryPoints: ['./src/extension.ts'],
        bundle: true,
        outfile: "out/extension.js",
        external: ['vscode', ...dependencies],
        format: 'cjs',
        platform: 'node',
        minify: isProd,
        watch: !isProd && !isWebOnly,
        sourcemap: !isProd,
        logOverride: {
            'duplicate-object-key': "silent",
            'suspicious-boolean-not': "silent",
        },
        plugins: [
            ...createAssetCopyPlugins(),
            createBuildNoticePlugin(),
        ],
    })
}

function buildWebExtension() {
    return build({
        entryPoints: ['./src/extension.web.ts'],
        bundle: true,
        outfile: "out/extension.web.js",
        external: ['vscode', ...dependencies],
        format: 'cjs',
        platform: 'browser',
        target: ['es2021'],
        minify: isProd,
        watch: !isProd && !isDesktopOnly,
        sourcemap: !isProd,
        logOverride: {
            'duplicate-object-key': "silent",
            'suspicious-boolean-not': "silent",
        },
        banner: {
            js: 'var global = globalThis; var Buffer = globalThis.Buffer || { from: (value, encoding) => encoding === "binary" ? Uint8Array.from(value, (c) => c.charCodeAt(0)) : new TextEncoder().encode(String(value)) };',
        },
        plugins: [
            createNodeShimPlugin(),
            ...createAssetCopyPlugins(),
            createBuildNoticePlugin(),
        ],
    })
}

function createLib() {
    if (isWebOnly) {
        return;
    }
    const points = dependencies.reduce((point, dependency) => {
        const main = require(`./node_modules/${dependency}/package.json`).main ?? "index.js";
        const mainAbsPath = resolve(`./node_modules/${dependency}`, main);
        if (existsSync(mainAbsPath)) {
            point[dependency] = mainAbsPath;
        }
        return point;
    }, {})
    build({
        entryPoints: points,
        bundle: true,
        outdir: "out/node_modules",
        format: 'cjs',
        platform: 'node',
        minify: true,
        treeShaking: true,
        metafile: true
    })
}

createLib();

const buildWeb = isWebOnly || (isProd && !isDesktopOnly);
const buildDesktop = !isWebOnly;

if (buildDesktop) {
    buildDesktopExtension();
}
if (buildWeb) {
    buildWebExtension();
}