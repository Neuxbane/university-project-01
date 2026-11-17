const express = require('express');
const prisma = require('../db');
const { requireAuth, requirePermission, isSuperAdmin } = require('../middleware/auth');
const { normalizePermissionCodes, sortByCatalog } = require('../utils/permissions');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// GET /api/roles/permissions (List all system permissions)
router.get('/permissions', requireAuth, requirePermission('USERS_MANAGE', 'ROLES_MANAGE'), async (req, res) => {
  try {
    // catalog order (menu first, then operasional, kelola data, kelola sistem) plus what each code requires
    const permissions = await prisma.permission.findMany();
    res.json(sortByCatalog(permissions));
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Gagal mengambil data permissions.' });
  }
});

// GET /api/roles (List all roles with their assigned permissions)
router.get('/', requireAuth, requirePermission('USERS_MANAGE', 'ROLES_MANAGE'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    const mapped = roles.map((r) => ({
      id: r.id,
      name: r.name,
      displayName: r.displayName,
      description: r.description,
      isSystem: r.isSystem,
      createdAt: r.createdAt,
      userCount: r._count.users,
      permissions: sortByCatalog(r.permissions.map((rp) => rp.permission)),
      permissionCodes: r.permissions.map((rp) => rp.permission.code),
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar peran (roles).' });
  }
});

// GET /api/roles/:id
router.get('/:id', requireAuth, requirePermission('USERS_MANAGE', 'ROLES_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role tidak ditemukan.' });
    }

    res.json({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: sortByCatalog(role.permissions.map((rp) => rp.permission)),
      permissionCodes: role.permissions.map((rp) => rp.permission.code),
    });
  } catch (error) {
    console.error('Error fetching role detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail role.' });
  }
});

// POST /api/roles (Admin only - Create custom dynamic role)
router.post('/', requireAuth, requirePermission('ROLES_MANAGE'), async (req, res) => {
  try {
    const { name, displayName, description, permissionCodes = [] } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({ error: 'Kode role dan Nama tampilan wajib diisi.' });
    }

    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    const existing = await prisma.role.findUnique({ where: { name: cleanName } });
    if (existing) {
      return res.status(400).json({ error: `Role dengan kode "${cleanName}" sudah terdaftar.` });
    }

    // Create role
    const newRole = await prisma.role.create({
      data: {
        name: cleanName,
        displayName: displayName.trim(),
        description: description ? description.trim() : null,
        isSystem: false,
      },
    });

    // Assign permissions (a "kelola" feature brings its menu along)
    const codes = normalizePermissionCodes(permissionCodes);
    if (codes.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: codes } },
      });

      if (perms.length > 0) {
        await prisma.rolePermission.createMany({
          data: perms.map((p) => ({
            roleId: newRole.id,
            permissionId: p.id,
          })),
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'ROLE',
      entityId: newRole.id,
      detail: `Membuat role kustom baru: ${newRole.name} (${newRole.displayName}) dengan ${codes.length} izin akses.`,
    });

    // Return created role with permissions
    const result = await prisma.role.findUnique({
      where: { id: newRole.id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    res.status(201).json({
      id: result.id,
      name: result.name,
      displayName: result.displayName,
      description: result.description,
      isSystem: result.isSystem,
      userCount: result._count.users,
      permissions: sortByCatalog(result.permissions.map((rp) => rp.permission)),
      permissionCodes: result.permissions.map((rp) => rp.permission.code),
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Gagal membuat role baru.' });
  }
});

// PUT /api/roles/:id (Admin only - Update role details and its permissions)
router.put('/:id', requireAuth, requirePermission('ROLES_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { displayName, description, permissionCodes } = req.body;

    const targetRole = await prisma.role.findUnique({ where: { id } });
    if (!targetRole) {
      return res.status(404).json({ error: 'Role tidak ditemukan.' });
    }
    // the super admin role always has every feature; only the super admin may rename it
    if (targetRole.name === 'ADMIN' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Hanya super admin yang dapat mengubah peran super admin.' });
    }

    const updateData = {};
    if (displayName) updateData.displayName = displayName.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;

    await prisma.role.update({
      where: { id },
      data: updateData,
    });

    // If permissionCodes array is provided, sync the permissions
    if (Array.isArray(permissionCodes) && targetRole.name !== 'ADMIN') {
      // Find matching permissions (a "kelola" feature brings its menu along)
      const perms = await prisma.permission.findMany({
        where: { code: { in: normalizePermissionCodes(permissionCodes) } },
      });

      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        prisma.rolePermission.createMany({
          data: perms.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        }),
      ]);
    }

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'ROLE',
      entityId: id,
      detail: `Memperbarui role: ${targetRole.name} (Izin akses diperbarui)`,
    });

    const updated = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      description: updated.description,
      isSystem: updated.isSystem,
      userCount: updated._count.users,
      permissions: sortByCatalog(updated.permissions.map((rp) => rp.permission)),
      permissionCodes: updated.permissions.map((rp) => rp.permission.code),
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Gagal memperbarui role.' });
  }
});

// DELETE /api/roles/:id (Admin only - Delete custom role)
router.delete('/:id', requireAuth, requirePermission('ROLES_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const targetRole = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!targetRole) {
      return res.status(404).json({ error: 'Role tidak ditemukan.' });
    }

    if (targetRole.isSystem) {
      return res.status(400).json({ error: 'Role sistem bawaan (ADMIN) tidak dapat dihapus.' });
    }

    if (targetRole._count.users > 0) {
      return res.status(400).json({
        error: `Role tidak dapat dihapus karena masih digunakan oleh ${targetRole._count.users} pengguna. Silakan pindahkan pengguna ke role lain terlebih dahulu.`,
      });
    }

    await prisma.role.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'ROLE',
      entityId: id,
      detail: `Menghapus role kustom: ${targetRole.name}`,
    });

    res.json({ message: `Role "${targetRole.displayName}" berhasil dihapus.` });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Gagal menghapus role.' });
  }
});

module.exports = router;

