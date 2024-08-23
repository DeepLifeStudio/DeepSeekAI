const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
  entry: "./src/content/content.js",
  output: {
    filename: "content.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "./src/manifest.json", to: "manifest.json" },
        { from: "./src/icons", to: "icons" },
        { from: "./src/style.css", to: "style.css" },
        { from: "./src/popup", to: "popup" },
        { from: "./src/background.js", to: "background.js" },
      ],
    }),
  ],
  resolve: {
    extensions: [".js"],
  },
  mode: "production",
};
