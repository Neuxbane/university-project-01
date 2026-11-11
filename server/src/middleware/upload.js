const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createUploader(subfolder) {
  const uploadDir = path.join(__dirname, '../../uploads', subfolder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      cb(null, `${Date.now()}_${cleanName}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya format file gambar (JPEG, PNG, WebP, GIF) yang diperbolehkan.'));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  });
}

function createModelUploader() {
  const uploadDir = path.join(__dirname, '../../uploads/models');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.glb';
      const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      cb(null, `${Date.now()}_${cleanName}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.glb' || ext === '.gltf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file model 3D (.glb atau .gltf) yang diperbolehkan.'));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  });
}

module.exports = { createUploader, createModelUploader };

