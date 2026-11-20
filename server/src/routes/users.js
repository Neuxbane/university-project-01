const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAuth, requirePermission, isSuperAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// GET /api/users/rbac-matrix (Authenticated - dynamically fetched from database)
router.get('/rbac-matrix', requireAuth, requirePermission('USERS_MANAGE', 'ROLES_MANAGE'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { isSystem: 'desc' },
    });

    const matrix = {};
    for (const r of roles) {
      matrix[r.name] = {
        id: r.id,
        name: r.name,
        displayName: r.displayName,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions.map((rp) => ({
          code: rp.permission.code,
          name: rp.permission.name,
          category: rp.permission.category,
          allowed: true,
        })),
      };
    }

    res.json(matrix);
  } catch (error) {
    console.error('Error fetching dynamic RBAC matrix:', error);
    res.status(500).json({ error: 'Gagal mengambil matriks RBAC.' });
  }
});

// GET /api/users (Admin only)
router.get('/', requireAuth, requirePermission('USERS_MANAGE'), async (req, res) => {
  try {
    const { q, role, status } = req.query;

    const where = {};
    if (role) {
      where.role = { equals: role.toUpperCase(), mode: 'insensitive' };
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { username: 'asc' }],
      select: {
        id: true,
        username: true,
        name: true,
        roleId: true,
        role: true,
        roleRel: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            pickSessions: true,
            auditLogs: true,
          },
        },
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar pengguna.' });
  }
});

// POST /api/users (Admin only)
router.post('/', requireAuth, requirePermission('USERS_MANAGE'), async (req, res) => {
  try {
    const { username, password, name, role, roleId } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, dan nama lengkap wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Look up dynamic Role in DB
    let targetRole;
    if (roleId) {
      targetRole = await prisma.role.findUnique({ where: { id: parseInt(roleId, 10) } });
    } else if (role) {
      targetRole = await prisma.role.findUnique({ where: { name: role.trim().toUpperCase() } });
    } else {
      // Default to STAFF or first non-system role
      targetRole = await prisma.role.findFirst({ where: { name: 'STAFF' } }) || await prisma.role.findFirst();
    }

    if (!targetRole) {
      return res.status(400).json({ error: 'Role yang dipilih tidak ditemukan di database.' });
    }
    if (targetRole.name === 'ADMIN' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Hanya super admin yang dapat mengatur akun super admin.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        name: name.trim(),
        roleId: targetRole.id,
        role: targetRole.name,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        roleId: true,
        role: true,
        roleRel: {
          select: { id: true, name: true, displayName: true },
        },
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'USER',
      entityId: newUser.id,
      detail: `Membuat pengguna baru: ${newUser.username} (${targetRole.displayName})`,
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Gagal membuat pengguna baru.' });
  }
});

// PUT /api/users/:id (Admin only)
router.put('/:id', requireAuth, requirePermission('USERS_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, role, roleId, password } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    if (targetUser.role === 'ADMIN' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Hanya super admin yang dapat mengatur akun super admin.' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();

    if (roleId || role) {
      let targetRole;
      if (roleId) {
        targetRole = await prisma.role.findUnique({ where: { id: parseInt(roleId, 10) } });
      } else {
        targetRole = await prisma.role.findUnique({ where: { name: role.trim().toUpperCase() } });
      }

      if (!targetRole) {
        return res.status(400).json({ error: 'Role tidak ditemukan di database.' });
      }
      if (targetRole.name === 'ADMIN' && !isSuperAdmin(req.user)) {
        return res.status(403).json({ error: 'Hanya super admin yang dapat mengatur akun super admin.' });
      }

      // Check if demoting the only active admin
      if (targetUser.role === 'ADMIN' && targetRole.name !== 'ADMIN') {
        const activeAdminsCount = await prisma.user.count({
          where: { role: 'ADMIN', isActive: true },
        });
        if (activeAdminsCount <= 1) {
          return res.status(400).json({ error: 'Tidak dapat mengubah role admin terakhir di sistem.' });
        }
      }

      updateData.roleId = targetRole.id;
      updateData.role = targetRole.name;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password minimal 6 karakter.' });
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        roleId: true,
        role: true,
        roleRel: {
          select: { id: true, name: true, displayName: true },
        },
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'USER',
      entityId: updated.id,
      detail: `Mengubah data pengguna: ${updated.username} (Role: ${updated.role})`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Gagal memperbarui pengguna.' });
  }
});

// PATCH /api/users/:id/status (Admin only)
router.patch('/:id/status', requireAuth, requirePermission('USERS_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Tidak dapat menonaktifkan akun sendiri yang sedang aktif digunakan.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    if (targetUser.role === 'ADMIN' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Hanya super admin yang dapat mengatur akun super admin.' });
    }

    // Check if deactivating the last active admin
    if (targetUser.role === 'ADMIN' && targetUser.isActive) {
      const activeAdminsCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (activeAdminsCount <= 1) {
        return res.status(400).json({ error: 'Tidak dapat menonaktifkan admin terakhir di sistem.' });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !targetUser.isActive },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entity: 'USER',
      entityId: updated.id,
      detail: `${updated.isActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun pengguna: ${updated.username}`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Gagal mengubah status aktif pengguna.' });
  }
});

// DELETE /api/users/:id (Admin only)
router.delete('/:id', requireAuth, requirePermission('USERS_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri yang sedang aktif.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { pickSessions: true, auditLogs: true },
        },
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    if (targetUser.role === 'ADMIN' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Hanya super admin yang dapat mengatur akun super admin.' });
    }

    if (targetUser.role === 'ADMIN') {
      const activeAdminsCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (activeAdminsCount <= 1) {
        return res.status(400).json({ error: 'Tidak dapat menghapus admin terakhir di sistem.' });
      }
    }

    if (targetUser._count.pickSessions > 0) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit({
        userId: req.user.id,
        action: 'DEACTIVATE',
        entity: 'USER',
        entityId: id,
        detail: `Menonaktifkan pengguna ${targetUser.username} karena memiliki riwayat ${targetUser._count.pickSessions} sesi pengambilan.`,
      });

      return res.json({
        message: 'Pengguna dinonaktifkan (bukan dihapus permanen) agar integritas data riwayat sesi pick-list tetap utuh.',
        deactivated: true,
      });
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'USER',
      entityId: id,
      detail: `Menghapus pengguna: ${targetUser.username}`,
    });

    res.json({ message: 'Pengguna berhasil dihapus secara permanen.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Gagal menghapus pengguna.' });
  }
});

module.exports = router;
