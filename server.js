const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes'); // Pastikan file routes.js ada

// --- Variabel Lingkungan & Konfigurasi DB ---
console.log('--- Mencoba koneksi hardcoded ---');

/*
// --- Validasi Environment Variables (Kita matikan sementara) ---
console.log('PORT:', process.env.PORT);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***DITERIMA***' : '!!! KOSONG !!!');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***DITERIMA***' : '!!! KOSONG !!!');
console.log('-----------------------------------');

// Validasi environment variables
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error('!!! KESALAHAN FATAL: Variabel environment database (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) tidak diatur.');
    console.error('Pastikan Anda telah mengatur ini di cPanel > Setup Node.js > Environment Variables DAN me-RESTART aplikasi.');
}
*/

const PORT = process.env.PORT || 3000;

// --- KONFIGURASI HARDCODED ---
// Menggunakan kredensial Anda langsung
const dbConfig = {
    host: 'localhost',
    user: 'u1733869_report',
    password: '@ndri78Mly',
    database: 'u1733869_report',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Buat pool koneksi database
const pool = mysql.createPool(dbConfig);
const db = pool.promise(); // Gunakan promise wrapper

// --- Tes Koneksi Saat Start (PENTING) ---
(async () => {
    try {
        const connection = await db.getConnection();
        console.log('*** KONEKSI DATABASE BERHASIL (HARDCODED) ***');
        connection.release();
    } catch (err) {
        console.error('!!! KESALAHAN FATAL SAAT KONEKSI DB (HARDCODED) !!!');
        console.error(err.message);
    }
})();


const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Untuk parsing body JSON, tambah limit untuk base64 foto
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware untuk inject DB pool ke request
app.use((req, res, next) => {
    req.db = db;
    next();
});

// --- API ROUTES ---
// Gunakan rute dari file routes.js
app.use('/api', apiRoutes); // Semua rute API akan diawali /api

// --- STATIC FILE SERVING ---
// Melayani file frontend dari folder 'public'
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// --- FALLBACK ROUTE ---
// Mengarahkan semua rute non-API ke index.html (untuk PWA/SPA)
app.get('*', (req, res) => {
    if (req.url.startsWith('/api/')) {
        return res.status(404).json({ message: 'Endpoint tidak ditemukan' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

