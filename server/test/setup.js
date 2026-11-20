const fs = require('fs');
const os = require('os');
const path = require('path');

// Must run before app/config/dotenv. Requiring a test file must never use server/.env.
const testUrl = process.env.TEST_DATABASE_URL;
let databaseName = '';
try { databaseName = new URL(testUrl).pathname.slice(1); } catch {}
if (!testUrl || !/^hextitanium_test(?:_[a-z0-9_]+)?$/.test(databaseName)) {
  throw new Error('Tes diblokir: TEST_DATABASE_URL wajib menunjuk database hextitanium_test*. Gunakan npm run test:docker dari root proyek.');
}
process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = 'test';
// Never accept an upload path supplied by a live environment.
process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hextitanium-test-uploads-'));
fs.cpSync(path.join(__dirname, '../uploads'), process.env.UPLOADS_DIR, { recursive: true });

function cleanupUploads() {
  const target = fs.realpathSync(process.env.UPLOADS_DIR);
  const tempRoot = fs.realpathSync(os.tmpdir());
  if (path.dirname(target) !== tempRoot || !path.basename(target).startsWith('hextitanium-test-uploads-')) {
    throw new Error('Folder tes tidak aman untuk dibersihkan.');
  }
  fs.rmSync(target, { recursive: true, force: true });
}

module.exports = { uploadsDir: process.env.UPLOADS_DIR, cleanupUploads };
