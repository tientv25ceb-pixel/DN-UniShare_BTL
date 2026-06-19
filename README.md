# ĐN-UniShare Web

Nền tảng chia sẻ đồ dùng học tập cho sinh viên Làng Đại học Đà Nẵng.

**Đồ án môn Công nghệ Web** — HTML, CSS, JavaScript thuần + Supabase.

## Tính năng

Giống website gốc (Next.js) + **admin duyệt bài**:

- Dark theme, header floating + bottom tab mobile
- Google OAuth (sinh viên) / Email (admin)
- Khám phá, lọc, yêu thích
- Đăng tin 4 loại (tặng / trao đổi / bán / tìm đồ) — chờ admin duyệt
- Chi tiết: yêu cầu, chat, thanh toán giả lập (bán)
- Tìm đồ quanh đây — tính khoảng cách theo tọa độ người đăng đã ghim (1.5km)
- Chat realtime (Supabase)
- Profile, sửa/xóa tin
- Trang Tác động, Giới thiệu
- Admin duyệt bài

## Xác thực

| Đối tượng | Cách đăng nhập |
|-----------|----------------|
| Sinh viên | Google OAuth — email `@sv1.dut.udn.vn`, `@sv2.dut.udn.vn`, `@due.edu.vn`, `@ued.udn.vn`, `@udn.vn` |
| Admin | Email + mật khẩu tại `auth/admin-login.html` (tài khoản tạo trong Supabase Dashboard) |

Không có trang đăng ký công khai cho sinh viên.

## Cài đặt

### 1. Supabase

1. Tạo project tại [supabase.com](https://supabase.com)
2. Chạy `supabase/schema.sql` trong SQL Editor (DB đã có: chạy thêm `migrate-full-features.sql`, rồi `migrate-remove-found.sql` nếu còn loại tin nhặt được cũ)
3. **Authentication → Providers → Google:** bật và điền Client ID / Secret từ [Google Cloud Console](https://console.cloud.google.com)
4. **Authentication → URL Configuration:** thêm Redirect URL:
   - `http://localhost:3000/auth/callback.html` (dev)
   - `https://your-domain.com/auth/callback.html` (production)
5. **Authentication → Providers → Email:** giữ bật cho admin (tắt "Enable sign ups" nếu muốn chặn đăng ký email công khai)

### 2. Google Cloud Console

1. Tạo OAuth 2.0 Client ID (Web application)
2. Authorized redirect URI: lấy từ Supabase → Auth → Google → Callback URL (dạng `https://xxx.supabase.co/auth/v1/callback`)

### 3. Cấu hình frontend

`js/config.js`:

```javascript
export const SUPABASE_URL = 'https://xxxxx.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...'
export const VIETMAP_API_KEY = ''  // tùy chọn — để trống vẫn chạy bản đồ demo
```

Lấy key miễn phí tại [maps.vietmap.vn](https://maps.vietmap.vn) → đăng ký → copy API key vào `VIETMAP_API_KEY`. Có key sẽ dùng bản đồ Việt Nam chi tiết; không có key dùng bản đồ demo (Carto dark).

### 4. Chạy local

**Phải chạy trong thư mục `dn-unishare-web`** (không phải `my-project`):

```bash
cd dn-unishare-web
npm start
# hoặc: npx serve . -l 3000
```

Mở `http://localhost:3000`

Đăng tin: `http://localhost:3000/app/post/` → chọn Tặng / Trao đổi / Bán / Tìm đồ

### 5. Tạo tài khoản Admin

Trong Supabase Dashboard → **Authentication → Users → Add user** (email + password).

Sau đó chạy SQL gán quyền admin:

```sql
UPDATE public.users SET role = 'admin' WHERE email = 'admin@example.com';
```

Đăng nhập tại `auth/admin-login.html`.

## Luồng nghiệp vụ

1. Sinh viên đăng nhập Google → đăng tin → `status = pending`
2. Admin duyệt → `status = available` → hiển thị công khai
3. Sinh viên khác gửi yêu cầu nhận đồ
4. Chủ tin chấp nhận / từ chối yêu cầu

## Điều hướng

| Desktop (header) | Mobile (bottom tab) |
|------------------|---------------------|
| Khám phá · Quanh đây · Đăng tin · Tin nhắn | Trang chủ · Khám phá · Đăng · Quanh đây · Tài khoản |
| Menu avatar: Cá nhân, Yêu thích, Yêu cầu, Tác động, Giới thiệu, Admin | Sheet Tài khoản: cùng các mục trên |

Trang chủ có hiệu ứng cuộn video (192 frame Cầu Rồng). Tìm đồ quanh bạn tại `app/nearby.html` (không dùng bản đồ — so sánh tọa độ tin đăng).

## Tech stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS (ES Modules) |
| Auth | Supabase Auth — Google OAuth + Email (admin) |
| Backend | Supabase PostgreSQL, Storage, RLS |