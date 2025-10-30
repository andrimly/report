const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia-wow-spageti-2025'; // Ganti di production!

// ===== MIDDLEWARE OTENTIKASI =====
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak ada.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId; // Tambahkan user ID ke request
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token tidak valid.' });
    }
};

// ===== AUTH ROUTES =====

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
    const { nama, ktp, telepon, email, password, alamat, norek, bank } = req.body;
    
    // Validasi input
    if (!email || !password || !nama || !ktp) {
        return res.status(400).json({ message: 'Data wajib tidak lengkap' });
    }

    try {
        // Cek duplikat email
        const [existing] = await req.db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email sudah terdaftar' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Simpan ke DB
        await req.db.query(
            'INSERT INTO users (nama, ktp, telepon, email, password, alamat, norek, bank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nama, ktp, telepon, email, hashedPassword, alamat, norek, bank]
        );

        res.status(201).json({ message: 'Registrasi berhasil' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ 
            message: 'Server error saat registrasi',
            error: err.message // Menambahkan detail error untuk debugging
        });
    }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan password wajib diisi' });
    }

    try {
        const [users] = await req.db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        // Buat JWT Token
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        // Hapus password dari data user sebelum dikirim
        delete user.password;

        res.json({ token, user });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            message: 'Server error saat login',
            error: err.message // Menambahkan detail error untuk debugging
        });
    }
});

// GET /api/auth/me (Cek token valid)
router.get('/auth/me', authMiddleware, async (req, res) => {
    try {
        const [users] = await req.db.query('SELECT * FROM users WHERE id = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }
        const user = users[0];
        delete user.password;
        res.json({ user });
    } catch (err) {
        res.status(500).json({ 
            message: 'Server error',
            error: err.message // Menambahkan detail error untuk debugging
        });
    }
});

// ===== ABSENSI ROUTES =====

// POST /api/absen
router.post('/absen', authMiddleware, async (req, res) => {
    const { area, toko, koordinat, foto, jenis_absen } = req.body;
    const userId = req.userId;

    if (!area || !toko || !koordinat || !foto || !jenis_absen) {
        return res.status(400).json({ message: 'Data absen tidak lengkap' });
    }

    try {
        // Simpan foto (base64) sebagai LONGTEXT
        await req.db.query(
            'INSERT INTO absensi (user_id, area, toko, koordinat, foto, jenis_absen, tanggal) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [userId, area, toko, koordinat, foto, jenis_absen]
        );
        res.status(201).json({ message: 'Absen berhasil dicatat' });
    } catch (err) {
        console.error('Absen error:', err);
        res.status(500).json({ 
            message: 'Server error saat menyimpan absen',
            error: err.message // Menambahkan detail error untuk debugging
        });
    }
});

// GET /api/absen (Riwayat absen user)
router.get('/absen', authMiddleware, async (req, res) => {
    try {
        const [riwayat] = await req.db.query(
            'SELECT * FROM absensi WHERE user_id = ? ORDER BY tanggal DESC',
            [req.userId]
        );
        res.json(riwayat);
    } catch (err) {
        console.error('Get Absen error:', err);
        res.status(500).json({ 
            message: 'Server error',
            error: err.message // Menambahkan detail error untuk debugging
        });
    }
});

// ===== LAPORAN ROUTES =====

// POST /api/laporan/penjualan
router.post('/laporan/penjualan', authMiddleware, async (req, res) => {
    const { area, toko, bolognese, carbonara, aglio_olio } = req.body;
    const userId = req.userId;

    try {
        await req.db.query(
            'INSERT INTO laporan_penjualan (user_id, area, toko, bolognese, carbonara, aglio_olio, tanggal) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [userId, area, toko, bolognese, carbonara, aglio_olio]
        );
        res.status(201).json({ message: 'Laporan penjualan berhasil disimpan' });
    } catch (err) {
        console.error('Laporan Jual error:', err);
        res.status(500).json({ 
            message: 'Server error',
            error: err.message // Menambahkan detail error untuk debugging
        });
    }
});

// GET /api/laporan/penjualan
router.get('/laporan/penjualan', authMiddleware, async (req, res) => {
    try {
        const [laporan] = await req.db.query(
            'SELECT * FROM laporan_penjualan WHERE user_id = ? ORDER BY tanggal DESC',
            [req.userId]
        );
        res.json(laporan);
    } catch (err) {
        console.error('Get Laporan Jual error:', err);
        res.status(500).json({ 
            message: 'Server error',
            error: err.message // Menambahkan detail error untuk debugging
        });
    }
});

// POST /api/laporan/issue
router.post('/laporan/issue', authMiddleware, async (req, res) => {
    const { area, toko, deskripsi } = req.body;
    const userId = req.userId;

    try {
        await req.db.query(
            'INSERT INTO laporan_issue (user_id, area, toko, deskripsi, tanggal) VALUES (?, ?, ?, ?, NOW())',
            [userId, area, toko, deskripsi]
        );
        res.status(201).json({ message: 'Laporan kendala berhasil disimpan' });
    } catch (err) {
        console.error('Laporan Issue error:', err);
        res.status(500).json({ 
            message: 'Server error',
            error: err.message // Menambahkan detail error untuk debugging
        });
    }
});

module.exports = router;

