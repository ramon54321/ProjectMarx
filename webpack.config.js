const path = require('path')

module.exports = function() {
  return {
    context: __dirname,
    entry: {
      index: './dist/index.js',
    },
    output: {
      path: path.join(__dirname, 'js'),
      filename: '[name].js',
    },
    devtool: 'source-map'
  }
}