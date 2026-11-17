const path = require('path');

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'));

// Resolve public upload URLs inside the configured storage root, including in tests.
function uploadPath(url) {
  if (!url?.startsWith('/uploads/')) throw new Error('URL unggahan tidak valid.');
  const target = path.resolve(UPLOADS_DIR, url.slice('/uploads/'.length));
  const relative = path.relative(UPLOADS_DIR, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Lokasi unggahan tidak valid.');
  }
  return target;
}

module.exports = { UPLOADS_DIR, uploadPath };
