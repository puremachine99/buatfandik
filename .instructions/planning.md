# 🚀 Project Planning: BTN WhatsApp Broadcaster

## 1. Project Overview

Membangun aplikasi web internal untuk Bank BTN yang berfungsi mengirimkan pesan tagihan KPR (WhatsApp Broadcast) secara bulk dan personal kepada debitur. Sistem harus realtime, mendukung upload data massal, dan mencegah pemblokiran nomor WhatsApp pengirim.

## 2. Tech Stack

- **Framework:** Full Next.js (App Router).
- **Architecture:** Custom Node.js Server (Express) + Next.js (Dibutuhkan untuk menjaga _long-running process_ dari `whatsapp-web.js` agar tidak mati oleh _timeout_ serverless Next.js).
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **WhatsApp Engine:** `whatsapp-web.js` (Puppeteer-based).
- **Real-time Comms:** Socket.io (Untuk sinkronisasi QR Code dan status pengiriman ke frontend).
- **UI/Styling:** Tailwind CSS + Shadcn UI.
- **Data Parsing:** `xlsx` atau `papaparse` (Untuk membaca file Excel/CSV dari user).

## 3. Database Schema (Drizzle ORM)

Terdapat dua tabel utama:

1.  `debiturs`
    - `id`: uuid (Primary Key)
    - `no_debitur`: varchar (Unique)
    - `nama`: varchar
    - `agunan`: text (Alamat/Keterangan)
    - `so_pokok`: numeric
    - `tgk`: numeric (Jumlah tagihan)
    - `no_whatsapp`: varchar (Wajib diformat menjadi format 628xxx / format standar WA)
    - `created_at`: timestamp

2.  `broadcast_logs`
    - `id`: uuid (Primary Key)
    - `debitur_id`: uuid (Foreign Key ke `debiturs.id`)
    - `status`: enum ('PENDING', 'SENT', 'FAILED')
    - `pesan`: text (Menyimpan _compiled message_ yang dikirim)
    - `error_reason`: text (Nullable, jika gagal)
    - `created_at`: timestamp
    - `sent_at`: timestamp (Nullable)

## 4. Message Template

Template pesan yang harus di-inject secara dinamis:
"Selamat pagi bapak/ibu {nama}
Alamat {agunan}.
saya carissa dari bank BTN, konfirmasi mengenai tunggakan angsuran KPR nya sebesar Rp.{tgk} kami tunggu pembayaran nya hari ini, Agar tidak ada petugas lapangan yang ke rumah dan ada penempelan stiker, jika sudah melakukan pembayaran mohon untuk bukti tf bisa dikirimkan di wa ini terimakasih."

## 5. Development Phases & AI Instructions

### Phase 1: Custom Server Setup & Next.js Integration

- **AI Task:** Setup `server.js` (Express) di _root directory_. Integrasikan Next.js handler ke dalam Express. Set up HTTP Server dan pasang `Socket.io` di atasnya.
- **Rule:** Jangan gunakan standard `next dev` atau API Routes (`/api/...`) untuk _logic_ WhatsApp. Semua _logic_ WA dan _Socket emission_ harus berjalan di dalam `server.js`.

### Phase 2: Database & Drizzle Setup

- **AI Task:** Inisialisasi koneksi PostgreSQL dan buat skema Drizzle sesuai definisi di atas. Buat _migration script_.
- **Rule:** Gunakan `drizzle-kit` untuk mengelola _schema_ dan _migrations_.

### Phase 3: WhatsApp Engine & Socket Integration

- **AI Task:** Buat modul `WhatsappService` di dalam _custom server_.
  - Gunakan `LocalAuth` untuk menyimpan sesi agar tidak perlu _scan_ QR berulang kali setelah server _restart_.
  - _Listen_ ke event `qr` dari `whatsapp-web.js`, lalu _emit_ menggunakan Socket.io ke _client_.
  - _Listen_ ke event `ready` dan `disconnected`, lalu sinkronkan _state_ ke _client_.

### Phase 4: Frontend Dashboard & Data Upload

- **AI Task:** Buat halaman Dashboard menggunakan Next.js App Router.
  - Buat komponen untuk menampilkan QR Code dari Socket.io.
  - Buat fitur _Upload_ Excel/CSV. Ekstrak datanya, validasi (terutama nomor WA), dan simpan ke database menggunakan Server Actions atau API Route standar (hanya untuk _upload_, bukan WA).
  - Tampilkan tabel daftar debitur dan status `broadcast_logs` secara real-time.

### Phase 5: The Broadcast Engine (Crucial)

- **AI Task:** Buat _logic_ pengiriman berantai (_queue_).
  - Saat user klik "Mulai Broadcast", _client_ mengirim _trigger_ ke server via Socket.io/API.
  - Server mengambil data debitur dengan status 'PENDING'.
  - **ANTI-BAN RULE:** Implementasikan _random delay_ antara 10 hingga 25 detik per pengiriman pesan. Gunakan `setTimeout` atau utilitas _sleep_ di dalam _loop_.
  - Setiap kali satu pesan terkirim atau gagal, _update_ tabel `broadcast_logs` dan _emit_ status terbaru ke _client_ via Socket.io.
