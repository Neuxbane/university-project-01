const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET } = require('../config');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Constant dummy hash to mitigate timing attack user enumeration
const DUMMY_HASH = '$2a$10$e8Za3L8W6a.V8WnOquz5kOz6U5a7LqHqLqLqLqLqLqLqLqLqLqLq.';

// Brute-force protection: in-memory tracking of failed attempts per client IP / username
const loginAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

const getAttemptKey = (req, username) => {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const cleanUser = String(username || '').trim().toLowerCase();
  return `${ip}:${cleanUser}`;
};

const checkRateLimit = (key) => {
  const record = loginAttempts.get(key);
  if (!record) return { blocked: false };

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { blocked: true, remainingSeconds };
  }

  // Clear expired window
  if (now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(key);
    return { blocked: false };
  }

  return { blocked: false };
};

const recordFailedAttempt = (key) => {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, firstAttemptAt: now };

  if (now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    record.count = 1;
    record.firstAttemptAt = now;
    delete record.lockedUntil;
  } else {
    record.count += 1;
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  loginAttempts.set(key, record);
};

const recordSuccess = (key) => {
  loginAttempts.delete(key);
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const key = getAttemptKey(req, username);
    const { blocked, remainingSeconds } = checkRateLimit(key);
    if (blocked) {
      return res.status(429).json({
        error: `Terlalu banyak percobaan masuk yang gagal. Akses dibatasi sementara demi keamanan. Coba lagi dalam ${remainingSeconds} detik.`,
      });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { roleRel: { select: { displayName: true, permissions: { select: { permission: { select: { code: true } } } } } } },
    });

    let isValid = false;
    if (user && user.isActive) {
      isValid = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Dummy compare to avoid timing leak revealing user existence
      await bcrypt.compare(password, DUMMY_HASH);
    }

    if (!isValid) {
      recordFailedAttempt(key);
      await logAudit({
        userId: user ? user.id : null,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        entityId: user ? user.id : null,
        detail: `Percobaan masuk gagal untuk identitas "${username}".`,
      });
      // Uniform generic error message to prevent user enumeration
      return res.status(401).json({ error: 'Kredensial tidak valid.' });
    }

    recordSuccess(key);

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entity: 'USER',
      entityId: user.id,
      detail: `Pengguna ${user.username} berhasil masuk.`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        roleName: user.roleRel?.displayName || user.role,
        permissionCodes: user.role === 'ADMIN' ? ['*'] : (user.roleRel?.permissions.map((rp) => rp.permission.code) || []),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat login.' });
  }
});

// GET /api/auth/me
// GET /api/auth/me — the client refreshes the menu/feature list with this, so role changes apply without re-login
router.get('/me', requireAuth, async (req, res) => {
  const { id, username, name, role, permissionCodes, roleRel } = req.user;
  res.json({ user: { id, username, name, role, roleName: roleRel?.displayName || role, permissionCodes } });
});

module.exports = router;
