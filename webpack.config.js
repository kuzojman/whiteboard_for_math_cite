const path = require('path');

module.exports = {
  entry: './public/frontend.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
