# 🖥️ Frontend Development Plan & Flow: BTN WhatsApp Broadcaster

## 1. Flow Menu (Navigasi)

Aplikasi akan memiliki struktur navigasi yang sederhana dan fokus pada fungsionalitas utama:

1.  **Dashboard (Home) `/`**
    *   **Status Koneksi WhatsApp:** Menampilkan status koneksi saat ini (Connected / Disconnected) dan menampilkan QR Code jika belum terkoneksi (melalui Socket.io).
    *   **Statistik Singkat:** Jumlah total debitur, pesan terkirim hari ini, pesan pending, dan pesan gagal.
2.  **Data Debitur & Upload `/debitur`**
    *   **Upload Area:** Form/Dropzone untuk mengunggah file Excel/CSV berisi data debitur.
    *   **Tabel Debitur:** Menampilkan daftar data debitur (Nama, No WA, Agunan, Tagihan, dll) beserta status broadcast terbarunya.
    *   **Aksi Broadcast:** Tombol utama "Mulai Broadcast" untuk memicu engine pengiriman pesan antrean (mengirim trigger ke server via Socket/API).
3.  **Riwayat Broadcast (Logs) `/logs`**
    *   **Tabel Log:** Menampilkan riwayat terperinci dari setiap pesan yang dikirim, status (PENDING, SENT, FAILED), waktu pengiriman, dan alasan error jika gagal.

## 2. Kebutuhan Frontend (Requirements)

*   **Framework & Routing:** Next.js 14+ dengan App Router.
*   **Styling & UI Components:** 
    *   Tailwind CSS untuk styling utilities.
    *   Shadcn UI untuk komponen siap pakai (Button, Table, Card, Dialog/Modal, Input, Toast/Alert).
*   **State Management & Real-time Server Tracking:**
    *   React `useState` / `useContext` untuk state global sederhana (status koneksi WA).
    *   `socket.io-client` untuk menerima event real-time dari server (`qr`, `ready`, `disconnected`, `message_sent`, `message_failed`).
*   **File Parsing:**
    *   `xlsx` atau `papaparse` dijalankan di sisi client atau via Server Action untuk membaca dan memvalidasi file Excel/CSV sebelum dikirim ke database.
*   **Icons & Feedback:**
    *   Lucide React (bawaan Shadcn UI) untuk ikonografi.
    *   Sonner / Toast untuk notifikasi interaksi (upload berhasil/gagal, broadcast dimulai, dll).

## 3. Todo List (Step-by-Step Implementation)

Berikut adalah urutan pengerjaan untuk frontend:

- [ ] **Step 1: Inisialisasi Proyek & UI Library**
  - [ ] Setup Next.js App Router (Jalankan `create-next-app`).
  - [ ] Install Tailwind CSS & konfigurasi awal.
  - [ ] Install Shadcn UI CLI dan inisialisasi komponen dasar (Button, Card, Table, Input).

- [ ] **Step 2: Setup Layout & Navigation**
  - [ ] Buat komponen Sidebar/Navbar untuk navigasi antar halaman utama (Dashboard, Data Debitur, Logs).
  - [ ] Buat kerangka halaman (_Page skeleton_) untuk rute `/`, `/debitur`, dan `/logs`.

- [ ] **Step 3: Implementasi Socket.io Client**
  - [ ] Install package `socket.io-client`.
  - [ ] Buat custom hook `useSocketContext` untuk mengelola koneksi ke Node.js custom server.
  - [ ] Pastikan koneksi Socket.io persisten dan tidak re-render berkali-kali di seluruh halaman aplikasi.

- [ ] **Step 4: Halaman Dashboard (WhatsApp Connection State)**
  - [ ] Buat UI Card untuk menampilkan status "WhatsApp Connection".
  - [ ] Implementasi listen event `qr` dari Socket, lalu render gambar QR Code menggunakan library `qrcode.react`.
  - [ ] Implementasi listen event `ready` dan `disconnected` untuk mengubah text status UI (Terkoneksi/Terputus).

- [ ] **Step 5: Fitur Upload & Parsing Data (Halaman `/debitur`)**
  - [ ] Buat komponen Dropzone/File Input yang ramah pengguna.
  - [ ] Install library bantu (seperti `papaparse` / `xlsx`) untuk ekstrak data CSV/Excel dari sisi client-side.
  - [ ] Buat validasi format data sebelum disubmit (terutama mematikan spasi dan prefix menjadi format WA 628xxx).
  - [ ] Buat fungsi untuk mengirim data hasil parsing tersanitasi ke server backend.

- [ ] **Step 6: Tabel Data Debitur & Status Real-time (Halaman `/debitur`)**
  - [ ] Buat UI Tabel menggunakan Shadcn Table untuk menampilkan data sheet debitur.
  - [ ] Buat logic fetch data dari Server Actions/API (fetch list `debiturs`).
  - [ ] Tambahkan kolom visual menampilkan status Broadcast terkini (`PENDING`, `SENT`, `FAILED`).

- [ ] **Step 7: Tombol "Mulai Broadcast" & Progress Feedback**
  - [ ] Tambahkan tombol aksi "Mulai Broadcast" di halaman `/debitur`.
  - [ ] Saat diklik, tampilkan konfirmasi (Dialog), lalu kirim trigger `start_broadcast` ke server.
  - [ ] Listen event `broadcast_update` dari Socket untuk memperbarui persentase progress/tabel status secara real-time.

- [ ] **Step 8: Halaman Riwayat Broadcast `/logs`**
  - [ ] Buat UI Tabel detail menilik semua laporan pengiriman dari tabel `broadcast_logs`.
  - [ ] Tambahkan fungsionalitas filter (SENT/FAILED) atau pencarian berbasis nama.

- [ ] **Step 9: Review & Polish**
  - [ ] Tambahkan loading state (Skeleton atau Spinner) di area vital.
  - [ ] Tambahkan _error handling_ komprehensif (Toast notifications jika HTTP request gagal).
  - [ ] Periksa dan rapikan UI agar standar terlihat bersih (Clean Admin UI).
