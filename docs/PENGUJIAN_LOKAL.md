# Pengujian lokal yang terpisah dari data toko

## Tes API dan database

Dari root proyek, jalankan:

```powershell
npm run test:docker
```

Perintah ini membangun aplikasi dan menjalankan tes pada project Docker
`hextitanium-test`. PostgreSQL tes bernama `hextitanium_test`, memakai penyimpanan
sementara, dan tidak membuka port database ke host. Folder unggahan toko tidak
dipasang ke container tes. Seed hanya dijalankan pada database tes tersebut.

Setelah selesai:

```powershell
npm run test:docker:down
```

Jangan menjalankan seed atau reset pada database toko yang sudah diedit admin.
Jangan memuat file tes dengan `require()` untuk memeriksa sintaks; gunakan
`node --check server/test/api.test.js`.

Tes integrasi menolak berjalan tanpa `TEST_DATABASE_URL` yang menunjuk database
khusus `hextitanium_test` atau `hextitanium_test_*`. Konfigurasi ini diperiksa
sebelum aplikasi dan `.env` dimuat. Unggahan tes disalin ke direktori sementara
tersendiri dan dibersihkan setelah tes. Untuk menjalankan tes di luar Docker,
siapkan database khusus yang sudah diisi seed dan berikan `TEST_DATABASE_URL`
secara eksplisit; jangan arahkan ke `hextitanium_db`.

## Tes frontend dan build

```powershell
npm --prefix client test
npm run build:client
```

Tes frontend memeriksa pembaruan hak akses pada sesi aktif, sesi kedaluwarsa,
respons tertunda setelah logout, serta pembaruan izin ketika API menolak aksi.
Tes API juga memeriksa akses langsung ke endpoint yang menunya ditutup,
perlindungan akun super admin, dan item checklist yang tidak sesuai sesi.

## Pengaturan fitur per peran

Super admin membuka **Kelola Sistem → Fitur per Peran** untuk mengatur izin.
Izin kelola data otomatis menyertakan menu yang dibutuhkannya. Menu dan tombol
akan menyesuaikan ketika pengguna berpindah halaman, kembali ke jendela aplikasi,
atau pada pembaruan berkala sekitar 30 detik. API memeriksa izin terkini pada
setiap permintaan. Pengguna tanpa menu diarahkan ke halaman “Belum ada menu”.

Sinkronisasi katalog izin saat server menyala tidak melakukan seed ulang data
toko. Penyesuaian izin yang sudah disimpan tetap dipertahankan.
