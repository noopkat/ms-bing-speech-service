const path = require('path');
const webpack = require('webpack');
const MinifyPlugin = require('babel-minify-webpack-plugin');

const importableConfig = {
  entry: './browser.entry.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'MsBingSpeechService.js',
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV', 'BABEL_ENV', 'DEBUG']),
  ],
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  }
};

const importableMinConfig = {
  entry: './browser.entry.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'MsBingSpeechService.min.js',
    libraryTarget: 'umd'
  },
  plugins: [
    new MinifyPlugin(),
    new webpack.EnvironmentPlugin(['NODE_ENV', 'BABEL_ENV', 'DEBUG']),
  ],
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  }
};


const globalConfig = {
  entry: './browser.entry.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'MsBingSpeechService.global.min.js',
    library: 'MsBingSpeechService',
    libraryTarget: 'window'
  },
  plugins: [
    new MinifyPlugin(),
    new webpack.EnvironmentPlugin(['NODE_ENV', 'BABEL_ENV', 'DEBUG']),
  ],
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  }
};

module.exports = [importableConfig, importableMinConfig, globalConfig];
