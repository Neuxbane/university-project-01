<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Administrasi</span>
        </div>
        <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Kelola Sistem &amp; Pemeliharaan
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Kelola akun staf, hak akses, impor data masal (CSV), dan cadangan data toko
        </p>
      </div>

      <!-- Segmented Navigation Tabs -->
      <div class="grid grid-cols-2 sm:inline-flex w-full lg:w-auto p-1 bg-zinc-100 dark:bg-[#18181c] rounded-xl border border-zinc-300 dark:border-zinc-700 gap-1 shrink-0">
        <button
          @click="activeTab = 'users'"
          type="button"
          class="min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap"
          :class="[activeTab === 'users' ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100']"
        >
          Pengguna &amp; Akses
        </button>
        <button
          @click="activeTab = 'import'"
          type="button"
          class="min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap"
          :class="[activeTab === 'import' ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100']"
        >
          Impor Data (CSV)
        </button>
        <button
          @click="activeTab = 'backup'"
          type="button"
          class="min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap"
          :class="[activeTab === 'backup' ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100']"
        >
          Cadangan &amp; Pulihkan
        </button>
        <button
          @click="activeTab = 'audit'"
          type="button"
          class="min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap"
          :class="[activeTab === 'audit' ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100']"
        >
          Catatan Aktivitas
        </button>
      </div>
    </div>

    <!-- Inline Global Action Feedback -->
    <div
      v-if="adminErrorMsg"
      role="alert"
      class="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-sm flex items-center justify-between gap-3"
    >
      <span>{{ adminErrorMsg }}</span>
      <button
        @click="adminErrorMsg = ''"
        type="button"
        aria-label="Tutup pesan kesalahan"
        class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 cursor-pointer"
      >
        ✕
      </button>
    </div>

    <!-- TAB 1: USER MANAGEMENT & DYNAMIC RBAC -->
    <div v-if="activeTab === 'users'" class="space-y-6">
      <!-- Sub-Tab Switcher: Accounts vs Roles & Access -->
      <div class="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <button
          @click="userSubTab = 'accounts'"
          type="button"
          class="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer"
          :class="[userSubTab === 'accounts' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800']"
        >
          Daftar Pengguna ({{ users.length }})
        </button>
        <button
          @click="userSubTab = 'roles'"
          type="button"
          class="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
          :class="[userSubTab === 'roles' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800']"
        >
          <span>Kelola Peran &amp; Hak Akses</span>
          <span
            class="text-xs font-mono px-1.5 py-0.5 rounded"
            :class="[userSubTab === 'roles' ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200']"
          >
            {{ roles.length }}
          </span>
        </button>
      </div>

      <!-- SUB-TAB 1: ACCOUNTS LIST -->
      <div v-if="userSubTab === 'accounts'" class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Daftar Akun Pengguna Gerai
            </h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Kelola akun staf, teknisi bengkel, dan pemilik gerai Hex Titanium
            </p>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label for="admin-user-search" class="sr-only">Cari pengguna</label>
            <input
              id="admin-user-search"
              v-model="userSearch"
              type="text"
              placeholder="Cari username atau nama..."
              class="min-h-[44px] px-3.5 py-2 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
            />
            <button
              @click="openAddUserModal"
              type="button"
              class="min-h-[44px] px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <span aria-hidden="true">+</span>
              <span>Tambah Pengguna</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4 font-medium">Pengguna</th>
                <th class="py-3 px-4 font-medium">Peran Akses</th>
                <th class="py-3 px-4 font-medium">Status</th>
                <th class="py-3 px-4 font-medium text-center">Sesi Ambil Baut</th>
                <th class="py-3 px-4 font-medium">Tanggal Dibuat</th>
                <th class="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-200">
              <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-bold text-xs uppercase text-zinc-800 dark:text-zinc-200 shrink-0">
                      {{ u.username.slice(0, 2) }}
                    </div>
                    <div>
                      <p class="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{{ u.username }}</p>
                      <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ u.name }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <span
                    class="px-2 py-0.5 rounded font-mono text-[11px] font-semibold border whitespace-nowrap"
                    :class="[
                      u.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' :
                      u.role === 'TECHNICIAN' ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20' :
                      'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    ]"
                  >
                    {{ u.roleRel?.displayName || u.role }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <span
                    class="px-2 py-0.5 text-[11px] font-mono font-semibold rounded border"
                    :class="[u.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                      : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20']"
                  >
                    {{ u.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  <span class="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded text-xs border border-zinc-300 dark:border-zinc-700">
                    {{ u._count?.pickSessions || 0 }} sesi
                  </span>
                </td>
                <td class="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
                  {{ formatDateTime(u.createdAt) }}
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="inline-flex items-center justify-end gap-2">
                    <button
                      @click="openEditUserModal(u)"
                      type="button"
                      class="min-h-[44px] px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium cursor-pointer"
                    >
                      Ubah
                    </button>
                    <button
                      v-if="u.id !== auth.user?.id"
                      @click="toggleUserStatus(u)"
                      type="button"
                      class="min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
                      :class="[u.isActive ? 'text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10' : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10']"
                    >
                      {{ u.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                    </button>
                    <button
                      v-if="u.id !== auth.user?.id"
                      @click="deleteUser(u)"
                      type="button"
                      class="min-h-[44px] px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg font-semibold cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SUB-TAB 2: DYNAMIC ROLES & ACCESS CONTROL -->
      <div v-if="userSubTab === 'roles'" class="space-y-5">
        <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm p-5 sm:p-6 transition-colors">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
                <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Pengaturan Akses</span>
              </div>
              <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Daftar Peran &amp; Izin Akses
              </h2>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Buat peran baru dan atur menu atau fitur yang boleh diakses tiap peran
              </p>
            </div>

            <button
              @click="openCreateRoleModal"
              type="button"
              class="min-h-[44px] px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <span aria-hidden="true">+</span>
              <span>Buat Peran Baru</span>
            </button>
          </div>

          <!-- Roles Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="r in roles"
              :key="r.id"
              class="p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c]/70 flex flex-col justify-between space-y-3"
            >
              <div>
                <div class="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {{ r.displayName }}
                    </h3>
                    <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400">{{ r.name }}</span>
                  </div>
                  <span
                    class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border"
                    :class="[r.isSystem
                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                      : 'bg-zinc-200 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700']"
                  >
                    {{ r.isSystem ? 'Bawaan' : 'Kustom' }}
                  </span>
                </div>

                <p class="text-xs text-zinc-600 dark:text-zinc-400 min-h-[32px] line-clamp-2">
                  {{ r.description || 'Tidak ada keterangan peran.' }}
                </p>

                <!-- Permissions Count & Pills -->
                <div class="pt-2.5 border-t border-zinc-200 dark:border-zinc-800">
                  <div class="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-1.5">
                    <span>Izin Akses Aktif</span>
                    <span class="text-zinc-900 dark:text-zinc-100 font-bold">
                      {{ r.permissions.length }} / {{ allPermissions.length }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    <span
                      v-for="p in r.permissions"
                      :key="p.id"
                      class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                    >
                      {{ p.name }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span class="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                  {{ r.userCount }} pengguna
                </span>

                <div class="flex items-center gap-2">
                  <button
                    @click="openEditRoleModal(r)"
                    type="button"
                    class="min-h-[44px] px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-lg font-medium cursor-pointer"
                  >
                    Ubah Izin
                  </button>
                  <button
                    v-if="!r.isSystem"
                    @click="deleteRole(r)"
                    type="button"
                    class="min-h-[44px] px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg font-semibold cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: CSV IMPORT -->
    <div v-if="activeTab === 'import'" class="grid grid-cols-1 md:grid-cols-12 gap-5">
      <div class="md:col-span-6 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors">
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
          Unggah File CSV Kebutuhan Baut
        </h2>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Masukkan data ukuran baut untuk beberapa tipe motor sekaligus. Sistem memeriksa seluruh baris sebelum disimpan.
        </p>

        <div class="space-y-4">
          <div class="border-2 border-dashed border-zinc-400 dark:border-zinc-700 rounded-xl p-5 text-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
            <input
              type="file"
              ref="fileInput"
              accept=".csv"
              @change="onFileSelected"
              class="sr-only"
              id="csvFileInput"
            />
            <label for="csvFileInput" class="cursor-pointer block min-h-[56px] flex flex-col items-center justify-center">
              <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100 underline underline-offset-2 block">
                {{ selectedFile ? selectedFile.name : 'Pilih Berkas CSV dari Komputer' }}
              </span>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-1">Format .csv (Maksimal 10MB)</p>
            </label>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              @click="downloadTemplate"
              type="button"
              class="min-h-[44px] px-3 py-2 text-xs sm:text-sm text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white underline font-mono rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Unduh Contoh File CSV
            </button>

            <button
              @click="uploadCsv"
              :disabled="!selectedFile || isUploading"
              type="button"
              class="min-h-[44px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40"
            >
              <span v-if="isUploading">Memproses...</span>
              <span v-else>Proses Impor CSV</span>
            </button>
          </div>

          <div
            v-if="importMessage"
            role="status"
            class="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 text-sm rounded-xl font-medium"
          >
            {{ importMessage }}
          </div>

          <div
            v-if="importErrors.length > 0"
            role="alert"
            class="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-sm rounded-xl space-y-1.5"
          >
            <p class="font-bold">Impor dibatalkan karena ada baris yang belum sesuai:</p>
            <ul class="list-disc list-inside text-xs space-y-1">
              <li v-for="(err, idx) in importErrors" :key="idx">{{ err }}</li>
            </ul>
            <p class="text-xs pt-1 text-rose-700 dark:text-rose-400">
              Perbaiki baris di atas pada file CSV Anda, lalu pilih dan unggah ulang.
            </p>
          </div>
        </div>
      </div>

      <div class="md:col-span-6 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors">
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Format Kolom CSV yang Diperlukan
        </h2>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
          Baris pertama file CSV wajib memakai nama kolom persis seperti di bawah ini:
        </p>

        <div class="space-y-2 text-xs font-mono">
          <div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
            <span class="text-zinc-900 dark:text-zinc-100 font-bold">brand</span>
            <span class="text-zinc-600 dark:text-zinc-400 ml-2">Merek (Honda, Yamaha, Suzuki, Kawasaki)</span>
          </div>
          <div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
            <span class="text-zinc-900 dark:text-zinc-100 font-bold">model, variant</span>
            <span class="text-zinc-600 dark:text-zinc-400 ml-2">Nama model (misal: NMAX) &amp; varian (155 Connected)</span>
          </div>
          <div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
            <span class="text-zinc-900 dark:text-zinc-100 font-bold">year_start, year_end</span>
            <span class="text-zinc-600 dark:text-zinc-400 ml-2">Tahun rilis (misal: 2020 &amp; 2024)</span>
          </div>
          <div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
            <span class="text-zinc-900 dark:text-zinc-100 font-bold">position</span>
            <span class="text-zinc-600 dark:text-zinc-400 ml-2">Nama titik pasang (misal: Cover Crankcase Kiri / CVT)</span>
          </div>
          <div class="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
            <span class="text-zinc-900 dark:text-zinc-100 font-bold">bolt_code, quantity</span>
            <span class="text-zinc-600 dark:text-zinc-400 ml-2">Kode baut (HEX-M6-25-FL) &amp; jumlah pcs</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: BACKUP & RESTORE -->
    <div v-if="activeTab === 'backup'" class="grid grid-cols-1 md:grid-cols-12 gap-5">
      <div class="md:col-span-6 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors">
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
          Buat Cadangan Data Toko
        </h2>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Simpan seluruh data ukuran baut, tipe motor, akun, dan paket ke file cadangan untuk disalin ke flashdisk toko setiap sore.
        </p>

        <button
          @click="downloadBackup"
          type="button"
          class="min-h-[44px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          <span>Unduh Berkas Cadangan (.json)</span>
        </button>
      </div>

      <div class="md:col-span-6 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors space-y-4">
        <div>
          <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Pulihkan Data dari Cadangan
          </h2>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Kembalikan isi data dari file cadangan (.json). Perhatian: tindakan ini menggantikan seluruh data yang ada saat ini.
          </p>
        </div>

        <div>
          <label for="restore-file-input" class="sr-only">Pilih file cadangan JSON</label>
          <input
            id="restore-file-input"
            type="file"
            accept=".json"
            @change="onRestoreFileSelected"
            class="block w-full min-h-[44px] text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 file:mr-3 file:min-h-[40px] file:py-2 file:px-3.5 file:rounded-xl file:border file:border-zinc-400 dark:file:border-zinc-600 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-900 dark:file:text-zinc-100 cursor-pointer"
          />
        </div>

        <div v-if="restoreJsonData" class="space-y-3 pt-2">
          <label for="restore-confirm-input" class="block text-sm text-amber-800 dark:text-amber-300 font-medium">
            Ketik <span class="font-mono font-bold">RESTORE_HEXTITANIUM</span> untuk mengonfirmasi pemulihan:
          </label>
          <input
            id="restore-confirm-input"
            v-model="restoreConfirmText"
            type="text"
            placeholder="Ketik RESTORE_HEXTITANIUM..."
            class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-100"
          />
          <button
            @click="executeRestore"
            :disabled="restoreConfirmText !== 'RESTORE_HEXTITANIUM' || isRestoring"
            type="button"
            class="min-h-[44px] px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40"
          >
            <span v-if="isRestoring">Memulihkan Data...</span>
            <span v-else>Pulihkan Data Sekarang</span>
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 4: AUDIT LOG -->
    <div v-if="activeTab === 'audit'" class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
      <div class="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Catatan Aktivitas Sistem
          </h2>
          <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Merekam setiap penambahan, perubahan, login pengguna, dan impor/cadangan data
          </p>
        </div>
        <button
          @click="loadAuditLogs"
          type="button"
          class="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white underline font-mono rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          Muat Ulang
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] uppercase">
              <th class="py-3 px-4 font-medium">Waktu</th>
              <th class="py-3 px-4 font-medium">Pengguna</th>
              <th class="py-3 px-4 font-medium">Aktivitas</th>
              <th class="py-3 px-4 font-medium">Bagian</th>
              <th class="py-3 px-4 font-medium">Keterangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-200">
            <tr v-for="log in auditLogs" :key="log.id" class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
              <td class="py-2.5 px-4 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap text-xs">
                {{ formatDateTime(log.timestamp) }}
              </td>
              <td class="py-2.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                {{ log.user ? log.user.name : 'Sistem' }}
              </td>
              <td class="py-2.5 px-4">
                <span class="px-2 py-0.5 rounded font-mono text-[11px] font-semibold border whitespace-nowrap"
                  :class="[
                    log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                    log.action === 'UPDATE' ? 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700' :
                    log.action === 'DELETE' ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' :
                    'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  ]"
                >
                  {{ actionLabel(log.action) }}
                </span>
              </td>
              <td class="py-2.5 px-4 font-mono text-zinc-600 dark:text-zinc-400 text-xs">
                {{ log.entity }}
              </td>
              <td class="py-2.5 px-4 text-zinc-700 dark:text-zinc-300">
                {{ log.detail || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL 1: TAMBAH PENGGUNA BARU -->
    <div
      v-if="isAddUserModalOpen"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      @click.self="isAddUserModalOpen = false"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-modal-title"
        class="bg-white dark:bg-[#121215] rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-zinc-300 dark:border-zinc-700"
      >
        <div class="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <h2 id="add-user-modal-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100">Tambah Pengguna Baru</h2>
          <button
            @click="isAddUserModalOpen = false"
            type="button"
            aria-label="Tutup form tambah pengguna"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitCreateUser" class="p-5 space-y-3.5 text-sm">
          <div v-if="userModalError" role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs font-medium">
            {{ userModalError }}
          </div>

          <div>
            <label for="new-user-username" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Username (ID Masuk)</label>
            <input
              id="new-user-username"
              v-model="newUserForm.username"
              type="text"
              required
              placeholder="Contoh: staf_budi"
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
            />
          </div>

          <div>
            <label for="new-user-name" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Nama Lengkap</label>
            <input
              id="new-user-name"
              v-model="newUserForm.name"
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label for="new-user-role" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Peran Akses</label>
            <select
              id="new-user-role"
              v-model="newUserForm.roleId"
              required
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
            >
              <option v-for="r in roles" :key="r.id" :value="r.id">
                {{ r.displayName }} ({{ r.name }})
              </option>
            </select>
          </div>

          <div>
            <label for="new-user-password" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Kata Sandi (Minimal 6 Karakter)</label>
            <input
              id="new-user-password"
              v-model="newUserForm.password"
              type="password"
              required
              minlength="6"
              placeholder="Minimal 6 karakter"
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              @click="isAddUserModalOpen = false"
              type="button"
              class="min-h-[44px] px-4 py-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmittingUser"
              class="min-h-[44px] px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
            >
              <span v-if="isSubmittingUser">Menyimpan...</span>
              <span v-else>Simpan Pengguna</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: EDIT PENGGUNA -->
    <div
      v-if="selectedUserForEdit"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      @click.self="selectedUserForEdit = null"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-modal-title"
        class="bg-white dark:bg-[#121215] rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-zinc-300 dark:border-zinc-700"
      >
        <div class="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div>
            <h2 id="edit-user-modal-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100">Ubah Data Pengguna</h2>
            <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400">@{{ selectedUserForEdit.username }}</p>
          </div>
          <button
            @click="selectedUserForEdit = null"
            type="button"
            aria-label="Tutup form ubah pengguna"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitEditUser" class="p-5 space-y-3.5 text-sm">
          <div v-if="userModalError" role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs font-medium">
            {{ userModalError }}
          </div>

          <div>
            <label for="edit-user-name" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Nama Lengkap</label>
            <input
              id="edit-user-name"
              v-model="editUserForm.name"
              type="text"
              required
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label for="edit-user-role" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Peran Akses</label>
            <select
              id="edit-user-role"
              v-model="editUserForm.roleId"
              required
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
            >
              <option v-for="r in roles" :key="r.id" :value="r.id">
                {{ r.displayName }} ({{ r.name }})
              </option>
            </select>
          </div>

          <div>
            <label for="edit-user-password" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Ganti Kata Sandi (Kosongkan bila tetap)</label>
            <input
              id="edit-user-password"
              v-model="editUserForm.password"
              type="password"
              minlength="6"
              placeholder="Isi kata sandi baru jika ingin mengganti"
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              @click="selectedUserForEdit = null"
              type="button"
              class="min-h-[44px] px-4 py-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmittingUser"
              class="min-h-[44px] px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
            >
              <span v-if="isSubmittingUser">Menyimpan...</span>
              <span v-else>Perbarui Data</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 3: BUAT / UBAH ROLE & HAK AKSES -->
    <div
      v-if="isRoleModalOpen"
      class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      @click.self="isRoleModalOpen = false"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
        class="bg-white dark:bg-[#121215] rounded-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-zinc-300 dark:border-zinc-700 overflow-hidden"
      >
        <div class="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div>
            <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Pengaturan Peran &amp; Hak Akses</span>
            <h2 id="role-modal-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {{ editingRoleId ? `Ubah Hak Akses: ${roleForm.name}` : 'Buat Peran Baru & Atur Hak Akses' }}
            </h2>
          </div>
          <button
            @click="isRoleModalOpen = false"
            type="button"
            aria-label="Tutup pengaturan peran"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitSaveRole" class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-sm">
          <div v-if="roleModalError" role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs font-medium">
            {{ roleModalError }}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="role-code" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Kode Peran (Huruf Besar)</label>
              <input
                id="role-code"
                v-model="roleForm.name"
                :disabled="Boolean(editingRoleId)"
                type="text"
                required
                placeholder="Contoh: KEPALA_GUDANG"
                class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono disabled:opacity-50"
              />
            </div>

            <div>
              <label for="role-display-name" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Nama Tampilan Peran</label>
              <input
                id="role-display-name"
                v-model="roleForm.displayName"
                type="text"
                required
                placeholder="Contoh: Kepala Gudang"
                class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label for="role-desc" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Keterangan Tugas</label>
            <input
              id="role-desc"
              v-model="roleForm.description"
              type="text"
              placeholder="Jelaskan tugas peran ini di gerai Hex Titanium..."
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <!-- Permissions Granular Checkboxes -->
          <div class="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Daftar Hak Akses Fitur
                </span>
                <p class="text-xs text-zinc-600 dark:text-zinc-400">
                  {{ roleForm.permissionCodes.length }} dari {{ allPermissions.length }} izin dipilih
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="selectAllPermissions"
                  type="button"
                  class="min-h-[40px] px-3 py-1.5 text-xs font-mono rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                >
                  Pilih Semua
                </button>
                <button
                  @click="deselectAllPermissions"
                  type="button"
                  class="min-h-[40px] px-3 py-1.5 text-xs font-mono rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            <!-- Grouped Permissions -->
            <div class="space-y-3">
              <div
                v-for="(perms, category) in groupedPermissions"
                :key="category"
                class="p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c]/50 space-y-2"
              >
                <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block font-bold">
                  {{ category }}
                </span>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    v-for="p in perms"
                    :key="p.code"
                    class="min-h-[44px] flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer select-none transition-colors border"
                    :class="[
                      roleForm.permissionCodes.includes(p.code)
                        ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10 text-zinc-900 dark:text-zinc-100'
                        : 'border-transparent text-zinc-700 dark:text-zinc-300'
                    ]"
                  >
                    <input
                      type="checkbox"
                      :value="p.code"
                      v-model="roleForm.permissionCodes"
                      class="mt-1 w-4 h-4 rounded text-zinc-900 cursor-pointer shrink-0"
                    />
                    <div class="min-w-0">
                      <p class="text-xs font-semibold leading-tight">{{ p.name }}</p>
                      <p class="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">{{ p.description }}</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              @click="isRoleModalOpen = false"
              type="button"
              class="min-h-[44px] px-4 py-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmittingRole"
              class="min-h-[44px] px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
            >
              <span v-if="isSubmittingRole">Menyimpan Peran...</span>
              <span v-else>{{ editingRoleId ? 'Simpan Perubahan Izin' : 'Buat Peran Baru' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { formatDateTime } from '../utils/date';

const auth = useAuthStore();
const activeTab = ref('users');
const userSubTab = ref('accounts');
const adminErrorMsg = ref('');
const userModalError = ref('');
const roleModalError = ref('');
const fileInput = ref(null);

const actionLabels = {
  CREATE: 'Tambah',
  UPDATE: 'Ubah',
  DELETE: 'Hapus',
  LOGIN: 'Masuk',
  IMPORT: 'Impor',
  RESTORE: 'Pulihkan',
};
const actionLabel = (action) => actionLabels[action] || action;

// User Management state
const users = ref([]);
const userSearch = ref('');
const isAddUserModalOpen = ref(false);
const selectedUserForEdit = ref(null);
const isSubmittingUser = ref(false);

const newUserForm = ref({
  username: '',
  password: '',
  name: '',
  roleId: null,
});

const editUserForm = ref({
  name: '',
  roleId: null,
  password: '',
});

// Dynamic Roles & Permissions state
const roles = ref([]);
const allPermissions = ref([]);
const isRoleModalOpen = ref(false);
const editingRoleId = ref(null);
const isSubmittingRole = ref(false);

const roleForm = ref({
  name: '',
  displayName: '',
  description: '',
  permissionCodes: [],
});

const groupedPermissions = computed(() => {
  const map = {};
  for (const p of allPermissions.value) {
    if (!map[p.category]) map[p.category] = [];
    map[p.category].push(p);
  }
  return map;
});

const filteredUsers = computed(() => {
  if (!userSearch.value.trim()) return users.value;
  const q = userSearch.value.toLowerCase();
  return users.value.filter((u) =>
    u.username.toLowerCase().includes(q) ||
    u.name.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q) ||
    u.roleRel?.displayName?.toLowerCase().includes(q)
  );
});

const loadUsers = async () => {
  try {
    const res = await auth.apiFetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      users.value = Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error('Failed to load users:', err);
    adminErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server untuk memuat daftar pengguna.'
      : err.message;
  }
};

const loadRolesAndPermissions = async () => {
  try {
    const [resRoles, resPerms] = await Promise.all([
      auth.apiFetch('/api/roles'),
      auth.apiFetch('/api/roles/permissions'),
    ]);

    if (resRoles.ok) {
      const rolesData = await resRoles.json();
      roles.value = Array.isArray(rolesData) ? rolesData : [];
    }
    if (resPerms.ok) {
      const permsData = await resPerms.json();
      allPermissions.value = Array.isArray(permsData) ? permsData : [];
    }
  } catch (err) {
    console.error('Failed to load roles and permissions:', err);
  }
};

const openAddUserModal = () => {
  userModalError.value = '';
  const defaultRole = roles.value.find((r) => r.name === 'STAFF') || roles.value[0];
  newUserForm.value = {
    username: '',
    password: '',
    name: '',
    roleId: defaultRole ? defaultRole.id : null,
  };
  isAddUserModalOpen.value = true;
};

const submitCreateUser = async () => {
  if (isSubmittingUser.value) return;
  userModalError.value = '';
  isSubmittingUser.value = true;
  try {
    const res = await auth.apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserForm.value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat pengguna.');

    isAddUserModalOpen.value = false;
    await loadUsers();
    await loadRolesAndPermissions();
    await loadAuditLogs();
  } catch (err) {
    userModalError.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus. Coba simpan lagi.'
      : err.message;
  } finally {
    isSubmittingUser.value = false;
  }
};

const openEditUserModal = (u) => {
  userModalError.value = '';
  selectedUserForEdit.value = u;
  editUserForm.value = {
    name: u.name,
    roleId: u.roleId || (roles.value.find((r) => r.name === u.role)?.id || null),
    password: '',
  };
};

const submitEditUser = async () => {
  if (!selectedUserForEdit.value || isSubmittingUser.value) return;
  userModalError.value = '';
  isSubmittingUser.value = true;
  try {
    const body = {
      name: editUserForm.value.name,
      roleId: editUserForm.value.roleId,
    };
    if (editUserForm.value.password.trim()) {
      body.password = editUserForm.value.password.trim();
    }

    const res = await auth.apiFetch(`/api/users/${selectedUserForEdit.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah data pengguna.');

    selectedUserForEdit.value = null;
    await loadUsers();
    await loadRolesAndPermissions();
    await loadAuditLogs();
  } catch (err) {
    userModalError.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus. Coba perbarui lagi.'
      : err.message;
  } finally {
    isSubmittingUser.value = false;
  }
};

const toggleUserStatus = async (u) => {
  const actionText = u.isActive ? 'menonaktifkan' : 'mengaktifkan';
  if (!confirm(`Apakah Anda yakin ingin ${actionText} akun @${u.username}?`)) return;

  adminErrorMsg.value = '';
  try {
    const res = await auth.apiFetch(`/api/users/${u.id}/status`, {
      method: 'PATCH',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah status.');

    u.isActive = data.isActive;
    await loadAuditLogs();
  } catch (err) {
    adminErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat mengubah status akun.'
      : err.message;
  }
};

const deleteUser = async (u) => {
  if (!confirm(`Hapus akun @${u.username}? Bila pengguna memiliki riwayat sesi pengambilan baut, akun akan dinonaktifkan demi keutuhan data.`)) return;

  adminErrorMsg.value = '';
  try {
    const res = await auth.apiFetch(`/api/users/${u.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus pengguna.');

    if (data.message) alert(data.message);
    await loadUsers();
    await loadRolesAndPermissions();
    await loadAuditLogs();
  } catch (err) {
    adminErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat menghapus akun.'
      : err.message;
  }
};

// Role & Permission Management handlers
const openCreateRoleModal = () => {
  roleModalError.value = '';
  editingRoleId.value = null;
  roleForm.value = {
    name: '',
    displayName: '',
    description: '',
    permissionCodes: ['PICKLIST_GENERATE', 'SESSION_CHECKLIST'],
  };
  isRoleModalOpen.value = true;
};

const openEditRoleModal = (role) => {
  roleModalError.value = '';
  editingRoleId.value = role.id;
  roleForm.value = {
    name: role.name,
    displayName: role.displayName,
    description: role.description || '',
    permissionCodes: [...(role.permissionCodes || [])],
  };
  isRoleModalOpen.value = true;
};

const selectAllPermissions = () => {
  roleForm.value.permissionCodes = allPermissions.value.map((p) => p.code);
};

const deselectAllPermissions = () => {
  roleForm.value.permissionCodes = [];
};

const submitSaveRole = async () => {
  if (isSubmittingRole.value) return;
  roleModalError.value = '';
  isSubmittingRole.value = true;
  try {
    let res;
    if (editingRoleId.value) {
      res = await auth.apiFetch(`/api/roles/${editingRoleId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: roleForm.value.displayName,
          description: roleForm.value.description,
          permissionCodes: roleForm.value.permissionCodes,
        }),
      });
    } else {
      res = await auth.apiFetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleForm.value.name,
          displayName: roleForm.value.displayName,
          description: roleForm.value.description,
          permissionCodes: roleForm.value.permissionCodes,
        }),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan peran.');

    isRoleModalOpen.value = false;
    await loadRolesAndPermissions();
    await loadUsers();
    await loadAuditLogs();
  } catch (err) {
    roleModalError.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat menyimpan peran.'
      : err.message;
  } finally {
    isSubmittingRole.value = false;
  }
};

const deleteRole = async (role) => {
  if (!confirm(`Hapus peran kustom "${role.displayName}" (${role.name})?`)) return;

  adminErrorMsg.value = '';
  try {
    const res = await auth.apiFetch(`/api/roles/${role.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus peran.');

    if (data.message) alert(data.message);
    await loadRolesAndPermissions();
    await loadAuditLogs();
  } catch (err) {
    adminErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat menghapus peran.'
      : err.message;
  }
};

// Existing Import / Backup / Audit state
const selectedFile = ref(null);
const isUploading = ref(false);
const importMessage = ref('');
const importErrors = ref([]);

const restoreJsonData = ref(null);
const restoreConfirmText = ref('');
const isRestoring = ref(false);

const auditLogs = ref([]);

const onFileSelected = (e) => {
  selectedFile.value = e.target.files[0] || null;
  importMessage.value = '';
  importErrors.value = [];
};

const uploadCsv = async () => {
  if (!selectedFile.value) return;
  isUploading.value = true;
  importMessage.value = '';
  importErrors.value = [];

  const formData = new FormData();
  formData.append('file', selectedFile.value);

  try {
    const res = await auth.apiFetch('/api/import/requirements', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.errors) {
        importErrors.value = data.errors;
      }
      throw new Error(data.error || 'Gagal memproses impor CSV.');
    }

    importMessage.value = data.message;
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = '';
    await loadAuditLogs();
  } catch (err) {
    if (importErrors.value.length === 0) {
      importErrors.value = [
        err.message === 'Failed to fetch'
          ? 'Sambungan ke server terputus saat mengunggah CSV. Coba lagi.'
          : err.message,
      ];
    }
  } finally {
    isUploading.value = false;
  }
};

const downloadTemplate = () => {
  const csvContent = "brand,model,variant,year_start,year_end,position,bolt_code,quantity,side,is_optional,notes\n" +
    "Honda,Vario,160 CBS/ABS,2022,2026,Cover Crankcase Kiri / CVT,HEX-M6-25-FL,8,LEFT,false,Bak CVT luar\n" +
    "Yamaha,NMAX,155 Connected,2020,2024,Kaliper Cakram Depan,HEX-M8-30-FL,2,FRONT,false,Baut bracket kaliper\n";
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_spesifikasi_baut_hextitanium.csv');
  link.click();
};

const downloadBackup = async () => {
  adminErrorMsg.value = '';
  try {
    const res = await auth.apiFetch('/api/admin/backup');
    if (!res.ok) throw new Error('Gagal mengunduh berkas cadangan.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hextitanium_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  } catch (err) {
    adminErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat mengunduh cadangan.'
      : err.message;
  }
};

const onRestoreFileSelected = (e) => {
  adminErrorMsg.value = '';
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      restoreJsonData.value = JSON.parse(event.target.result);
    } catch (err) {
      adminErrorMsg.value = 'File cadangan tidak valid (bukan format JSON yang benar).';
    }
  };
  reader.readAsText(file);
};

const executeRestore = async () => {
  if (!restoreJsonData.value || restoreConfirmText.value !== 'RESTORE_HEXTITANIUM') return;
  adminErrorMsg.value = '';
  isRestoring.value = true;
  try {
    const res = await auth.apiFetch('/api/admin/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backupData: restoreJsonData.value,
        confirmation: restoreConfirmText.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    alert(data.message);
    restoreJsonData.value = null;
    restoreConfirmText.value = '';
    await loadUsers();
    await loadRolesAndPermissions();
    await loadAuditLogs();
  } catch (err) {
    adminErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat memulihkan data.'
      : err.message;
  } finally {
    isRestoring.value = false;
  }
};

const loadAuditLogs = async () => {
  try {
    const res = await auth.apiFetch('/api/audit-logs');
    if (res.ok) {
      const data = await res.json();
      auditLogs.value = Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error(err);
  }
};

const onKeyDown = (e) => {
  if (e.key === 'Escape') {
    if (isRoleModalOpen.value) isRoleModalOpen.value = false;
    else if (selectedUserForEdit.value) selectedUserForEdit.value = null;
    else if (isAddUserModalOpen.value) isAddUserModalOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  if (auth.isAdmin) {
    loadUsers();
    loadRolesAndPermissions();
    loadAuditLogs();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>
