const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const isProd = process.argv.indexOf('-p') >= 0;

module.exports = {
    target: 'node',
    node: { fs: 'empty' },
    mode: isProd ? 'production' : 'development',
    context: path.resolve(__dirname, './'),
    entry: {
        app: './src/extension.ts'
    },
    output: {
        filename: 'extension.js',
        path: path.resolve(__dirname, './out'),
        libraryTarget: 'commonjs2',
        // config source map sources url
        devtoolModuleFilenameTemplate: '[absoluteResourcePath]',
    },
    module: {
        rules: [
            { test: /\.ts$/, exclude: /node_modules/, use: ['ts-loader'] },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
            { test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/, loader: 'url-loader', options: { limit: 80000 } }
        ]
    },
    externals: {
        vscode: 'commonjs vscode',
    },
    devtool: isProd ? false : 'source-map',
    resolve: {
        extensions: ['.js', '.css','.ts'],
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    stats: {
        warningsFilter: [/critical dependency:/i,/applicationinsights-native-metrics/],
    },
    plugins: [
        new CleanWebpackPlugin({ cleanStaleWebpackAssets: false })
    ],
    watch: !isProd,
    optimization: {
        minimize: isProd
    },
}

