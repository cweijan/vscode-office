const path = require('path');

const rows = parseInt(process.env.ROWS || process.argv[2] || '10000', 10);
const cols = parseInt(process.env.COLS || process.argv[3] || '50', 10);

module.exports = {
    rows,
    cols,
    outputDir: path.join(__dirname, 'output'),
};
