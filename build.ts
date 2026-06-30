import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, context } from 'esbuild'
import { copy } from 'esbuild-plugin-copy'

const __dirname = dirname(fileURLToPath(import.meta.url))

const isProd = process.argv.indexOf('--mode=production') >= 0;
const devExtensionTarget = process.env.OFFICE_EXTENSION_TARGET;

// Production always builds both; dev builds one target at a time.
const buildDesktop = isProd || devExtensionTarget !== 'web';
const buildWeb = isProd || devExtensionTarget === 'web';

const dependencies = ['vscode-html-to-docx', 'highlight.js', 'pdf-lib', 'cheerio', 'katex', 'mustache', 'puppeteer-core']
const nodeBuiltinStubs = ['fs', 'child_process', 'os', 'crypto', 'stream', 'https', 'http', 'net', 'tls', 'zlib', 'events', 'util', 'buffer', 'module', 'url', 'assert', 'string_decoder']

function createDesktopAssetCopyPlugins(shouldWatch: boolean) {
    return [
        copy({
            resolveFrom: 'out',
            watch: shouldWatch,
            assets: [
                {
                    from: ['./template/**/*'],
                    to: ['./'],
                },
                {
                    from: ['./node_modules/node-unrar-js/dist/js/unrar.wasm'],
                    to: ['./'],
                },
                {
                    from: ['./node_modules/7z-wasm/7zz.wasm'],
                    to: ['./'],
                },
            ],
        }),
    ];
}

function createNodeShimPlugin() {
    const shimDir = resolve(__dirname, 'src/shims');
    const packageStubs = {
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

async function runBuild(shouldWatch, options) {
    if (shouldWatch) {
        const ctx = await context(options);
        await ctx.watch();
        return ctx;
    }
    return build(options);
}

function buildDesktopExtension() {
    const shouldWatch = !isProd && devExtensionTarget !== 'web';
    return runBuild(shouldWatch, {
        entryPoints: ['./src/extension.ts'],
        bundle: true,
        outfile: "out/extension.js",
        external: ['vscode', ...dependencies],
        format: 'cjs',
        platform: 'node',
        minify: isProd,
        sourcemap: !isProd,
        logOverride: {
            'duplicate-object-key': "silent",
            'suspicious-boolean-not': "silent",
        },
        plugins: [
            ...createDesktopAssetCopyPlugins(shouldWatch),
            createBuildNoticePlugin(),
        ],
    })
}

function buildWebExtension() {
    const shouldWatch = !isProd && devExtensionTarget === 'web';
    return runBuild(shouldWatch, {
        entryPoints: ['./src/extension.web.ts'],
        bundle: true,
        outfile: "out/extension.web.js",
        external: ['vscode', ...dependencies],
        format: 'cjs',
        platform: 'browser',
        target: ['es2021'],
        minify: isProd,
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
            createBuildNoticePlugin(),
        ],
    })
}

async function createLib() {
    if (!buildDesktop) {
        return;
    }
    const points = dependencies.reduce((point, dependency) => {
        const pkgPath = resolve(`./node_modules/${dependency}/package.json`);
        const main = JSON.parse(readFileSync(pkgPath, 'utf-8')).main ?? "index.js";
        const mainAbsPath = resolve(`./node_modules/${dependency}`, main);
        if (existsSync(mainAbsPath)) {
            point[dependency] = mainAbsPath;
        }
        return point;
    }, {})
    await build({
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

(async () => {
    try {
        if (buildDesktop) {
            await createLib();
            await buildDesktopExtension();
        }
        if (buildWeb) {
            await buildWebExtension();
        }
    } catch {
        process.exit(1);
    }
})();
