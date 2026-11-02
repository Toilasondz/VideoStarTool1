const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo Database SQLite
const dbFile = path.join(__dirname, 'licenses.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error("[-] Lỗi mở database:", err.message);
    } else {
        console.log("[+] Đã kết nối cơ sở dữ liệu SQLite.");
        db.run(`CREATE TABLE IF NOT EXISTS licenses (
            key TEXT PRIMARY KEY,
            note TEXT,
            device_id TEXT,
            package_name TEXT DEFAULT 'VIP',
            created_at INTEGER,
            expires_at INTEGER,
            is_active INTEGER DEFAULT 1
        )`);
    }
});

// ==========================================
// 1. API CHO GIAO DIỆN QUẢN TRỊ (ADMIN WEB)
// ==========================================

// Lấy danh sách tất cả các Key
app.get('/admin/api/keys', (req, res) => {
    db.all(`SELECT * FROM licenses ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Tạo Key mới
app.post('/admin/api/keys/create', (req, res) => {
    const { note, durationDays, packageName, customKey } = req.body;
    
    // Tạo mã ngẫu nhiên hoặc dùng key tùy chỉnh
    let key = customKey && customKey.trim().length > 0 
        ? customKey.trim() 
        : "VIP-" + crypto.randomBytes(4).toString('hex').toUpperCase();

    const days = parseInt(durationDays) || 30;
    const createdAt = Date.now();
    const expiresAt = createdAt + (days * 24 * 60 * 60 * 1000);

    db.run(
        `INSERT INTO licenses (key, note, package_name, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
        [key, note || 'Khách hàng', packageName || 'VIP', createdAt, expiresAt],
        function(err) {
            if (err) {
                return res.status(400).json({ success: false, message: "Key đã tồn tại hoặc lỗi tạo key!" });
            }
            res.json({ success: true, key, expiresAt });
        }
    );
});

// Reset Device ID của Key (cho phép đổi máy khác)
app.post('/admin/api/keys/reset-device', (req, res) => {
    const { key } = req.body;
    db.run(`UPDATE licenses SET device_id = NULL WHERE key = ?`, [key], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// Khóa hoặc Mở khóa Key
app.post('/admin/api/keys/toggle-status', (req, res) => {
    const { key, isActive } = req.body;
    db.run(`UPDATE licenses SET is_active = ? WHERE key = ?`, [isActive ? 1 : 0, key], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// Xóa vĩnh viễn Key
app.post('/admin/api/keys/delete', (req, res) => {
    const { key } = req.body;
    db.run(`DELETE FROM licenses WHERE key = ?`, [key], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});


// ==========================================
// 2. API DÀNH RIÊNG CHO IPHONE / TWEAK (DYLIB)
// ==========================================

// Endpoint: Xác thực Key từ iPhone
app.post('/api/verify', (req, res) => {
    const { key, deviceID } = req.body;

    if (!key || !deviceID) {
        return res.status(400).json({ authorized: false, message: "Thiếu mã Key hoặc Device ID!" });
    }

    db.get(`SELECT * FROM licenses WHERE key = ?`, [key], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ authorized: false, message: "Key không hợp lệ hoặc không tồn tại trên hệ thống!" });
        }

        // Kiểm tra xem Key có đang bị Admin khóa không
        if (!row.is_active) {
            return res.status(403).json({ authorized: false, message: "Key này đã bị tạm khóa bởi quản trị viên!" });
        }

        // Kiểm tra thời hạn
        if (Date.now() > row.expires_at) {
            return res.status(403).json({ authorized: false, message: "Key đã hết hạn sử dụng!" });
        }

        // Kiểm tra thiết bị:
        // Nếu chưa gắn thiết bị nào -> Tự động khóa chặt vào iPhone này
        if (!row.device_id) {
            db.run(`UPDATE licenses SET device_id = ? WHERE key = ?`, [deviceID, key]);
        } else if (row.device_id !== deviceID) {
            return res.status(403).json({ 
                authorized: false, 
                message: "Key đã được kích hoạt trên một thiết bị iPhone khác!" 
            });
        }

        // Xác thực thành công!
        const remainingDays = Math.ceil((row.expires_at - Date.now()) / (1000 * 60 * 60 * 24));
        res.json({
            authorized: true,
            message: `Xác thực thành công! Gói: ${row.package_name}`,
            packageName: row.package_name,
            expiresAt: row.expires_at,
            remainingDays: remainingDays
        });
    });
});

// Endpoint: Đăng xuất / Gỡ Key trên máy
app.post('/api/sign-out', (req, res) => {
    const { key, deviceID } = req.body;
    db.run(`UPDATE licenses SET device_id = NULL WHERE key = ? AND device_id = ?`, [key, deviceID], function(err) {
        if (err || this.changes === 0) {
            return res.status(400).json({ success: false, message: "Không thể gỡ thiết bị!" });
        }
        res.json({ success: true, message: "Đã gỡ liên kết thành công!" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`[+] Hệ thống Quản Lý License Key đang chạy tại:`);
    console.log(`    👉 Dashboard Web: http://localhost:${PORT}`);
    console.log(`    👉 API Xác thực:   http://localhost:${PORT}/api/verify`);
    console.log(`=======================================================`);
});
