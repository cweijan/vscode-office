const { build } = require("esbuild")
const { copy } = require("esbuild-plugin-copy")
const isProd = process.argv.indexOf('--mode=production') >= 0;

build({
    entryPoints: ['./src/extension.ts'],
    bundle: true,
    outfile: "out/extension.js",
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    // logLevel: 'error',
    metafile: true,
    // sourceRoot: __dirname+"/src",
    minify: isProd,
    watch: !isProd,
    sourcemap: !isProd,
    plugins: [
        // 复制生成pdf的静态文件
        copy({
            resolveFrom: 'out',
            assets: {
                from: ['./public/**/*'],
                to: ['./'],
                keepStructure: true
            },
        }),
        {
            name: 'build notice',
            setup(build) {
                build.onStart(() => {
                    console.log('build start')
                })
                build.onEnd(() => {
                    console.log('build success')
                })
            }
        },
    ],
})