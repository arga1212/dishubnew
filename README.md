# Pendataan Jukir
- Metadata disimpan di CSV (`server/data/jukir.csv`)
- File disimpan di folder `server/uploads`
- Nama file menggunakan UUID agar sulit ditebak

## Arsitektur
- Frontend React mengirim data ke `POST /api/submissions`
- Backend Node.js + Express menerima payload base64
- Backend menyimpan file PDF/JPG ke disk dengan UUID acak
- Backend mencatat referensi file ke CSV
- Frontend menyediakan halaman `/data` untuk melihat data dan reprint PDF
- Endpoint upload dilindungi Bearer token (`Authorization: Bearer <token>`)

## Setup

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari `.env.example` lalu sesuaikan jika perlu:

```bash
PORT=8787
CLIENT_ORIGINS=http://localhost:5173
SUBMISSIONS_CSV_PATH=server/data/jukir.csv
VITE_API_BASE_URL=http://localhost:8787
API_AUTH_TOKEN=replace-with-long-random-secret
VITE_API_AUTH_TOKEN=replace-with-long-random-secret
```

3. Jalankan mode development (frontend + backend):

```bash
npm run dev
```

## Endpoint

- `GET /api/health`
- `POST /api/submissions`
- `GET /api/submissions`
- `GET /api/submissions/:id/pdf`

Header wajib untuk `POST /api/submissions`:
- `Authorization: Bearer <API_AUTH_TOKEN>`

Body `POST /api/submissions`:
- `nama`
- `lokasiParkir`
- `alamatParkir`
- `pdfBase64`
- `fotoPetugasBase64`
- `fotoRambuBase64`
- `fotoKTABase64`

## Production di VPS

1. Build frontend:

```bash
npm run build
```

2. Jalankan backend:

```bash
npm run start
```

Catatan:
- Folder `server/uploads` tidak diexpose sebagai static route.
- Gunakan reverse proxy (Nginx/Caddy) + HTTPS untuk keamanan transport data.
- Untuk produksi, gunakan secret token panjang acak (minimal 32 karakter).
