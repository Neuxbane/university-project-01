<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white dark:bg-[#121215] rounded-2xl p-5 sm:p-6 border border-zinc-300 dark:border-zinc-800 shadow-sm transition-colors">
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
        <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Panduan Kerja
        </span>
      </div>
      <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Panduan Operasional Sistem Baut Hex Titanium
      </h1>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
        Standar Prosedur Operasional (SOP) bagi staf gerai dan pemilik dalam menggunakan daftar ukuran baut dan checklist pengambilan.
      </p>
    </div>

    <!-- Quick Navigation Index -->
    <nav aria-label="Daftar Isi Panduan" class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 shadow-sm transition-colors">
      <h2 class="text-xs font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-2">Daftar Isi Panduan:</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 text-sm font-medium">
        <a href="#sop-layanan" class="min-h-[44px] px-2.5 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors">
          <span aria-hidden="true">&bull;</span> <span>1. Alur Layanan Gerai</span>
        </a>
        <a href="#sop-picklist" class="min-h-[44px] px-2.5 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors">
          <span aria-hidden="true">&bull;</span> <span>2. Daftar Ambil Baut</span>
        </a>
        <a href="#sop-checklist" class="min-h-[44px] px-2.5 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors">
          <span aria-hidden="true">&bull;</span> <span>3. Prosedur Checklist</span>
        </a>
        <a href="#sop-missing-data" class="min-h-[44px] px-2.5 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors">
          <span aria-hidden="true">&bull;</span> <span>4. Motor Belum Terdata</span>
        </a>
        <a href="#sop-backup" class="min-h-[44px] px-2.5 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors">
          <span aria-hidden="true">&bull;</span> <span>5. Cadangan &amp; Pulihkan</span>
        </a>
        <a href="#sop-evaluasi" class="min-h-[44px] px-2.5 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors">
          <span aria-hidden="true">&bull;</span> <span>6. Target &amp; Evaluasi</span>
        </a>
      </div>
    </nav>

    <!-- Section 1 -->
    <section id="sop-layanan" class="scroll-mt-20 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors space-y-3">
      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
        1. Standar Operasional Layanan Gerai (SOP)
      </h2>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Sebelum sistem ini dibuat, staf harus melepas dan mengukur baut satu per satu menggunakan jangka sorong (skitmat) yang memakan waktu hingga ±2 jam per motor lengkap. Alur kerja baru dirancang sebagai berikut:
      </p>

      <ol class="list-decimal list-inside space-y-2 text-sm text-zinc-800 dark:text-zinc-200 font-medium">
        <li><strong>Sapa Pelanggan:</strong> Tanyakan tipe motor, tahun pembuatan, dan kebutuhan variasi (satuan, paket mesin, pengereman, atau lengkap satu motor).</li>
        <li><strong>Buka Sistem di Komputer / Ponsel:</strong> Akses menu <em>Ambil Baut</em> pada browser kasir atau ponsel staf via Wi-Fi gerai.</li>
        <li><strong>Pilih Tipe Motor:</strong> Pilih motor dari daftar (tersedia 20 tipe motor terpopuler seperti NMAX, Vario 160, Aerox, PCX, Beat, ZX-25R).</li>
        <li><strong>Tampilkan Daftar Baut:</strong> Sistem langsung menampilkan jumlah dan kode ukuran baut tanpa perlu mengukur fisik motor.</li>
        <li><strong>Catat Transaksi:</strong> Catat pembayaran di aplikasi kasir <em>Kelola</em> (sistem ini khusus untuk spesifikasi dan penyiapan baut).</li>
      </ol>
    </section>

    <!-- Section 2 -->
    <section id="sop-picklist" class="scroll-mt-20 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors space-y-3">
      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
        2. Penggunaan Fitur Daftar Ambil Baut
      </h2>
      <div class="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p>Sistem menyediakan dua tampilan pengelompokan yang saling melengkapi:</p>
        <ul class="list-disc list-inside space-y-1.5 pl-2 text-zinc-800 dark:text-zinc-200">
          <li>
            <strong>Ringkasan Rak:</strong> Menghitung total baut per ukuran di seluruh titik motor. Contoh: Jika baut M6×25 digunakan 6 pcs di CVT dan 5 pcs di bak mesin kanan, sistem langsung menampilkan total 11 pcs agar staf cukup mengambilnya 1 kali dari rak penyimpanan.
          </li>
          <li>
            <strong>Titik Pasang:</strong> Memberikan panduan posisi (Kiri, Kanan, Depan, Belakang) untuk teknisi saat memasang baut ke motor pelanggan.
          </li>
        </ul>
      </div>
    </section>

    <!-- Section 3 -->
    <section id="sop-checklist" class="scroll-mt-20 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors space-y-3">
      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
        3. Prosedur Pengambilan &amp; Checklist Staf
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-1">
        <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
          <p class="font-bold text-zinc-900 dark:text-zinc-100 mb-1">1. Buka Sesi</p>
          <p class="text-zinc-600 dark:text-zinc-400 text-xs">Ketuk "Mulai Checklist" pada halaman Ambil Baut.</p>
        </div>
        <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
          <p class="font-bold text-zinc-900 dark:text-zinc-100 mb-1">2. Ambil &amp; Centang</p>
          <p class="text-zinc-600 dark:text-zinc-400 text-xs">Ambil baut dari rak sesuai jumlah, lalu ketuk baris untuk menandai centang.</p>
        </div>
        <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
          <p class="font-bold text-zinc-900 dark:text-zinc-100 mb-1">3. Selesai</p>
          <p class="text-zinc-600 dark:text-zinc-400 text-xs">Saat 100% lengkap, sistem memberi tanda "Selesai Lengkap" siap diserahkan.</p>
        </div>
      </div>
    </section>

    <!-- Section 4 -->
    <section id="sop-missing-data" class="scroll-mt-20 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors space-y-3">
      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
        4. Penanganan Motor Belum Terdata
      </h2>
      <div class="p-4 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 space-y-2">
        <p class="font-bold text-zinc-900 dark:text-zinc-100">Bila pelanggan datang membawa motor yang belum terdata dalam sistem:</p>
        <ol class="list-decimal list-inside space-y-1 text-xs">
          <li>Ukur baut bagian yang diminta menggunakan jangka sorong.</li>
          <li>Catat ukuran (Diameter × Panjang, tipe kepala, jumlah, dan posisi).</li>
          <li>Admin memasukkan data tersebut ke menu <em>Tipe Motor &rarr; Matriks Baut</em>.</li>
          <li>Data tersimpan permanen sehingga pelanggan berikutnya tidak perlu diukur manual lagi.</li>
        </ol>
      </div>
    </section>

    <!-- Section 5 -->
    <section id="sop-backup" class="scroll-mt-20 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors space-y-3">
      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
        5. Prosedur Cadangan &amp; Pulihkan Data Offline
      </h2>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Karena sistem berjalan di komputer lokal gerai (tanpa server luar/internet), pencadangan rutin ke flashdisk toko sangat penting:
      </p>
      <ul class="list-disc list-inside space-y-1.5 text-sm text-zinc-800 dark:text-zinc-200">
        <li><strong>Rutin Setiap Sore:</strong> Masuk sebagai Admin &rarr; menu <em>Kelola Sistem &rarr; Cadangan &amp; Pulihkan</em> &rarr; ketuk <strong>Unduh Berkas Cadangan (.json)</strong>.</li>
        <li><strong>Simpan ke Flashdisk USB:</strong> Salin file cadangan ke flashdisk gerai Hex Titanium.</li>
        <li><strong>Pemulihan:</strong> Buka menu Pulihkan Data, pilih file cadangan, ketik <code>RESTORE_HEXTITANIUM</code>, lalu konfirmasi.</li>
      </ul>
    </section>

    <!-- Section 6 -->
    <section id="sop-evaluasi" class="scroll-mt-20 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors space-y-3">
      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
        6. Target Keberhasilan Layanan
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
          <p class="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Target Waktu Layanan:</p>
          <p class="text-zinc-600 dark:text-zinc-400 text-xs">Sebelumnya: ±120 menit per motor lengkap. Target dengan sistem: berkurang minimal 50% (&lt;60 menit, penyiapan baut hanya 5–10 menit).</p>
        </div>
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
          <p class="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Kemandirian Staf Toko:</p>
          <p class="text-zinc-600 dark:text-zinc-400 text-xs">Minimal 2 karyawan gerai mampu melayani pelanggan dan menyiapkan baut secara mandiri tanpa bantuan pemilik.</p>
        </div>
      </div>
    </section>
  </div>
</template>
