var ETOPO1_NCOL = 21601;
var ETOPO1_NROW = 10801;
var ETOPO1_CELL_DEG = 1 / 60;
var ETOPO1_NODATA = -32768;

function etopo1RowCol(lat, lon) {
  var row = Math.round((90 - lat) / ETOPO1_CELL_DEG);
  var col = Math.round((lon + 180) / ETOPO1_CELL_DEG);
  if (row < 0) { row = 0; } else if (row > ETOPO1_NROW - 1) { row = ETOPO1_NROW - 1; }
  if (col < 0) { col = 0; } else if (col > ETOPO1_NCOL - 1) { col = ETOPO1_NCOL - 1; }
  return { row: row, col: col };
}

function etopo1ByteOffset(lat, lon) {
  var rc = etopo1RowCol(lat, lon);
  return (rc.row * ETOPO1_NCOL + rc.col) * 2;
}

function etopo1Elev(lat, lon, grid) {
  var dv = grid instanceof DataView ? grid : new DataView(grid instanceof ArrayBuffer ? grid : grid.buffer, grid.byteOffset || 0, grid.byteLength);
  var off = etopo1ByteOffset(lat, lon);
  if (off + 2 > dv.byteLength) { return null; }
  var v = dv.getInt16(off, true);
  return v === ETOPO1_NODATA ? null : v;
}

function etopo1Load(url, onLoad, onError) {
  fetch(url).then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.arrayBuffer(); }).then(onLoad).catch(onError || function () {});
}

function etopo1ReadFile(path) {
  var b = require('fs').readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
