# 🎵 Spotify Clone - Web Nghe Nhạc Cá Nhân Hiện Đại

Ứng dụng web nghe nhạc cá nhân phong cách Spotify được xây dựng với **Next.js 16 (App Router)**, **Tailwind CSS v4**, **TypeScript** và triển khai tự động lên **Vercel** thông qua **GitHub CI/CD**.

🔗 **Trang Trực Tuyến (Production):** [https://spotify-music-personal.vercel.app](https://spotify-music-personal.vercel.app)  
📦 **Kho Mã Nguồn GitHub:** [https://github.com/ngxziet/spotify-music-personal](https://github.com/ngxziet/spotify-music-personal)

---

## ✨ Tính Năng Nổi Bật

### 1. 🎧 Giao Diện Chuẩn Spotify (UI/UX)
- Giao diện Dark Theme đặc trưng (`#121212`, `#1ed760`, `#282828`).
- **Desktop:** Sidebar điều hướng bên trái, danh sách playlist cuộn mượt mà, trình phát nhạc cố định dưới đáy (Sticky Player).
- **Mobile & Tablet:** Thanh điều hướng dưới đáy (Bottom Navigation), thanh mini-player nổi thông minh.
- **Fullscreen Now Playing:** Chế độ phát toàn màn hình với ảnh bìa chất lượng cao, sóng âm visualizer, thanh trượt thời gian và điều khiển đầy đủ.
- **Lời bài hát (Lyrics Karaoke):** Hiển thị lời bài hát đồng bộ theo nhịp thời gian thực.
- **Hẹn giờ tắt nhạc (Sleep Timer):** Tự động dừng nhạc sau 15p, 30p, 45p, 60p.

### 2. 🔍 Tìm Kiếm Nhạc Trực Tuyến & Tuyển Chọn
- Tìm kiếm nhanh hàng triệu bài hát và nghệ sĩ toàn cầu thông qua **iTunes Search API**.
- Tích hợp kho nhạc tuyển chọn sẵn có (Chill Lofi, Acoustic, Pop, EDM, Piano, Focus).
- Lọc theo thể loại: V-Pop, Pop, Lofi, EDM, Piano, Acoustic, Rock.

### 3. 💾 Tải Nhạc Về Máy & Nghe Ngoại Tuyến (Offline)
- **Tải MP3 trực tiếp:** Nút tải một chạm cho phép lưu trực tiếp file nhạc về máy tính hoặc điện thoại.
- **Offline Cache (IndexedDB):** Lưu trữ bài hát vào bộ đệm trình duyệt, cho phép mở app và nghe nhạc ngay cả khi mất mạng / không có Wifi / 4G.
- Quản lý kho nhạc offline tại mục **"Nhạc Đã Tải Về"**.

### 4. 📂 Tải Lên Nhạc Cá Nhân (Local MP3 Upload)
- Kéo thả hoặc chọn file nhạc từ máy tính / điện thoại (`.mp3`, `.wav`, `.aac`, `.flac`).
- Tự động nhận diện tên bài hát và nghệ sĩ.
- Lưu trữ vĩnh viễn trên trình duyệt của bạn mà không lo bị xóa.

### 5. 👤 Tài Khoản & Quản Lý Thư Viện Cá Nhân
- **Bài hát đã thích (Liked Songs ❤️):** Tự động gom các bản nhạc yêu thích vào playlist riêng với hiệu ứng tim và pháo hoa rực rỡ.
- **Tạo Playlist & Album riêng:** Đặt tên, thêm mô tả, chọn ảnh bìa tuyển chọn, thêm/bớt bài hát tùy ý.
- **Hồ sơ cá nhân:** Đổi tên, avatar, bio, chuyển đổi giữa nhiều tài khoản.
- **Sao lưu & Khôi phục dữ liệu (JSON Backup/Restore):** Xuất toàn bộ playlist và bài hát đã thích thành file JSON để chuyển đổi giữa các thiết bị dễ dàng.

### 6. 📱 PWA & Đa Nền Tảng (Cross-Platform)
- Cấu hình Progressive Web App (`manifest.json`).
- Thích ứng hoàn hảo trên mọi kích thước màn hình: Điện thoại (iOS / Android), Tablet (iPad / Galaxy Tab), Máy tính (Windows / macOS / Linux).
- Có thể thêm vào màn hình chính (Add to Home Screen) để mở như ứng dụng native.

---

## 🛠️ Công Nghệ Sử Dụng

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI & Styling:** Tailwind CSS v4, Lucide React Icons, Canvas Confetti
- **Audio Engine:** HTML5 Audio API + MediaSession API (hỗ trợ điều khiển từ màn hình khóa, bàn phím)
- **Storage:** LocalStorage + IndexedDB (Local-First Architecture)
- **CI/CD & Hosting:** GitHub + Vercel

---

## 🚀 Hướng Dẫn Cài Đặt Local

```bash
# 1. Clone repository từ GitHub
git clone https://github.com/ngxziet/spotify-music-personal.git
cd spotify-music-personal

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Chạy môi trường phát triển (Development)
npm run dev

# 4. Truy cập trên trình duyệt
# Mở http://localhost:3000
```

---

## 🔄 Tự Động Deploy Với Git (CI/CD)

Mỗi khi bạn commit và push code lên nhánh `master` của GitHub:
```bash
git add .
git commit -m "update new features"
git push origin master
```
Vercel sẽ tự động phát hiện, kích hoạt quy trình build và cập nhật phiên bản mới nhất lên production trong vòng chưa đầy 30 giây!
