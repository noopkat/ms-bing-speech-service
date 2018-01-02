const path = require('path');
const MinifyPlugin = require('babel-minify-webpack-plugin');

module.exports = {
  entry: {
    fetchAndSendFile: './fetchAndSendFile/main.js',
    formUploadAndSendFile: './formUploadAndSendFile/main.js'
  },
  output: {
    path: path.resolve(__dirname),
    filename: '[name]/dist/bundle.js'
  },
 // devtool: 'inline-source-map',
  plugins: [
    new MinifyPlugin()
  ],
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
    ]
  }
};
