# Avatar Frame Studio

Website tạo avatar sự kiện, gồm:

- `web/`: React/Vite frontend.
- `backend/`: Laravel API, dữ liệu chiến dịch và xác thực quản trị.
- `docs/AAPANEL_DEPLOY.md`: hướng dẫn triển khai production trên aaPanel.

## Chạy local

Terminal 1 — API:

```powershell
cd backend
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
```

Terminal 2 — frontend:

```powershell
cd web
npm install
npm run dev
```

Mở địa chỉ Vite in ra trong terminal. Trang quản trị nằm tại `/admin`. Tài khoản local mặc định là `admin`; thông tin xác thực được cấu hình bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD_HASH` trong `backend/.env`.

## Build production

```bash
cd web
npm ci
VITE_API_BASE_URL=/api npm run build
cp -R dist/. ../backend/public/
```

Trên aaPanel, trỏ website root vào `backend/public`. Xem cấu hình Nginx và các bước Laravel trong `docs/AAPANEL_DEPLOY.md`.

Production sử dụng MySQL. Tạo database và user riêng trong aaPanel, sau đó điền các biến `DB_*` trong `backend/.env` trước khi chạy migration.
