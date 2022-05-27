import path from 'path';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { Configuration, IgnorePlugin } from 'webpack';
const isProd = process.argv.indexOf('--mode=production') >= 0;

export default {
    target: 'node',
    entry: {
        main: './src/extension.ts'
    },
    output: {
        path: path.resolve(__dirname, './out'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '[absoluteResourcePath]',
    },
    externals: {
        vscode: 'commonjs vscode',
    },
    resolve: {
        extensions: ['.js', '.css', '.ts', '.mjs'],
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    plugins: [
        new IgnorePlugin({ resourceRegExp: /^(utf-8-validate|encoding|bufferutil|_http_client)$/ }),
        new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
        new CopyWebpackPlugin({
            patterns: [{ from: 'public', to: './' }]
        }),
    ],
    ignoreWarnings: [/critical dependency:/i, /applicationinsights-native-metrics/],
    module: {
        rules: [
            { test: /\.mjs$/, type: "javascript/auto", },
            { test: /\.ts$/, exclude: /node_modules/, use: ['ts-loader'] },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
            { test: /\.(woff2?|eot|ttf|otf|woff)(\?.*)?$/, loader: 'url-loader', options: { limit: 80000 } }
        ]
    },
    optimization: {
        minimize: isProd
    },
    watch: !isProd,
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'source-map',
} as Configuration;