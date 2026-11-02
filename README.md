# Hướng Dẫn Triển Khai Hệ Thống License Server (Miễn Phí 100%)

Thư mục này chứa toàn bộ hệ thống API và Dashboard quản lý bản quyền License Key cho Tweak iOS.

---

## 🚀 Cách 1: Đưa Lên Mạng Bằng Render.com (Khuyên Dùng - Hoàn Toàn Miễn Phí, Có HTTPS)

Render cung cấp hosting miễn phí vĩnh viễn và cấp sẵn link HTTPS đạt chuẩn Apple iOS.

### Các bước thực hiện:
1. Tạo một tài khoản miễn phí tại: [https://github.com](https://github.com)
2. Tạo một repository mới trên GitHub (ví dụ: `my-ios-license-api`).
3. Tải toàn bộ các file trong thư mục này (`server.js`, `package.json`, và thư mục `public`) lên repository đó.
4. Truy cập [https://render.com](https://render.com) và đăng nhập bằng tài khoản GitHub vừa tạo.
5. Chọn **New +** -> **Web Service**.
6. Chọn repository GitHub bạn vừa upload.
7. Cấu hình các thông số:
   - **Name:** Đặt tên bất kỳ (ví dụ: `my-tweak-api`)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Chọn gói **Free** ($0/tháng).
8. Bấm **Deploy Web Service**.
9. Sau 1 - 2 phút, bạn sẽ nhận được đường link chính thức dạng:
   👉 `https://my-tweak-api.onrender.com`

---

## 💻 Cách 2: Chạy Thử Ngay Trên Máy Tính (Localhost)

Nếu trên máy tính của bạn đã cài đặt sẵn **Node.js**:
1. Mở Terminal / PowerShell tại thư mục này.
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Khởi động server:
   ```bash
   npm start
   ```
4. Mở trình duyệt web truy cập:
   👉 **Dashboard:** `http://localhost:3000`

---

## 📱 Cách Kết Nối Tweak iOS Vào Server Này

Trong file `.dylib` hoặc code tweak của bạn, chỉ cần gọi endpoint:
- **URL Xác Thực:** `POST https://my-tweak-api.onrender.com/api/verify`
- **Body JSON gửi lên:**
```json
{
  "key": "VIP-XXXX-XXXX",
  "deviceID": "D188B67B-XXXX-XXXX-XXXX"
}
```
- **Dữ liệu Server trả về:**
```json
{
  "authorized": true,
  "message": "Xác thực thành công! Gói: VIP",
  "packageName": "VIP",
  "expiresAt": 1793700000000,
  "remainingDays": 30
}
```
