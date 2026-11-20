const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const prisma = require('../db');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        roleId: true,
        isActive: true,
        roleRel: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isSystem: true,
            permissions: {
              select: {
                permission: {
                  select: { code: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Pengguna tidak aktif atau tidak ditemukan.' });
    }

    const permissionCodes = user.role === 'ADMIN'
      ? ['*']
      : (user.roleRel?.permissions.map((rp) => rp.permission.code) || []);

    req.user = {
      ...user,
      permissionCodes,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token tidak valid atau telah kedaluwarsa.' });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak. Wewenang tidak mencukupi.' });
    }
    next();
  };
}

// Any one of the given feature codes is enough. The super admin (role ADMIN) passes everything;
// other roles pass when the feature is ticked for their role in Kelola Sistem.
function requirePermission(...codes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }
    const granted = req.user.permissionCodes || [];
    if (req.user.role === 'ADMIN' || granted.includes('*') || codes.some((c) => granted.includes(c))) {
      return next();
    }
    return res.status(403).json({ error: 'Akses ditolak. Fitur ini belum dibuka untuk peran Anda.' });
  };
}

const isSuperAdmin = (user) => user?.role === 'ADMIN';

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
  isSuperAdmin,
};
