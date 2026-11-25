const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  entry: "./src/content/content.js",
  output: {
    filename: "content.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
    publicPath: ""
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        },
        exclude: /node_modules/
      },
      {
        // 普通 CSS 导入（注入到页面）
        test: /\.css$/,
        resourceQuery: { not: [/raw/] },
        use: ["style-loader", "css-loader"],
      },
      {
        // CSS 字符串导入（用于 Shadow DOM）
        test: /\.css$/,
        resourceQuery: /raw/,
        type: 'asset/source',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext][query]'
        }
      }
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "./src/manifest.json",
          to: "manifest.json",
          transform(content) {
            return Buffer.from(JSON.stringify(JSON.parse(content), null, 2), 'utf-8')
          }
        },
        {
          from: "./src/icons",
          to: "icons",
          globOptions: {
            ignore: [
              "**/.DS_Store",
              "**/deepseek-official-*",
              "**/original-*/**",
              "**/task-*",
              "**/下载*"
            ]
          }
        },
        { from: "./src/content/styles/style.css", to: "style.css" },
        { from: "./src/popup", to: "popup" },
        { from: "./src/background.js", to: "background.js" },
        { from: "./src/Instructions", to: "Instructions" },
        {
          from: "node_modules/katex/dist/fonts",
          to: "fonts"
        },
        {
          from: "node_modules/flag-icons/flags/4x3/{cn,us,in,es,fr,sa,bd,ru,br,pk,de,jp,kr,it,nl,pl,tr,vn,th,id}.svg",
          to: "flags/[name][ext]"
        }
      ],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,  // 临时开启 console 以调试根号渲染问题
            drop_debugger: true,
            passes: 2,
            pure_getters: true,
            module: true
          },
          mangle: true,
          format: {
            comments: false,
            ascii_only: true
          }
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
  },
  resolve: {
    extensions: [".js"],
  },
  mode: "production",
};
