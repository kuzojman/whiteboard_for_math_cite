const path = require('path');


module.exports = 
{
    entry: './index.js',
    output: 
    {
        path: path.resolve(__dirname, 'public'),
        filename: 'script_with_bundle_experiment.js',
    },
};

  