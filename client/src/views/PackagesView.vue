<template>
  <div class="space-y-5">
    <!-- Header -->
    <section class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Paket Baut</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Daftar Paket Baut Titanium
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          {{ auth.isAdmin
            ? 'Kelola formula paket siap pakai (Mesin, Pengereman, Bodi, Full Bike) per tipe motor.'
            : 'Pilih paket siap pakai per motor, cek rincian bautnya, lalu langsung mulai checklist.' }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          v-if="auth.isAdmin"
          type="button"
          @click="toggleCreateEditor"
          class="min-h-[44px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
        >
          <Plus v-if="!isEditorOpen || editingPackageId" class="w-4 h-4" aria-hidden="true" />
          <X v-else class="w-4 h-4" aria-hidden="true" />
          <span>{{ isEditorOpen && !editingPackageId ? 'Tutup Form' : 'Tambah Paket' }}</span>
        </button>

        <router-link
          to="/pick-list"
          class="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm transition-all inline-flex items-center justify-center gap-2"
        >
          <Play class="w-4 h-4" aria-hidden="true" />
          <span>Buka Ambil Baut</span>
        </router-link>
      </div>
    </section>

    <!-- Inline Create / Edit Package Panel (No Data Modal) -->
    <section
      v-if="auth.isAdmin && isEditorOpen"
      ref="editorSectionRef"
      aria-label="Formulir paket baut"
      class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm space-y-5"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span class="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {{ editingPackageId ? 'Mode Ubah Paket' : 'Paket Baru' }}
          </span>
          <h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {{ editingPackageId ? `Ubah Paket: ${editorForm.name || ''}` : 'Buat Paket Baut Baru' }}
          </h2>
        </div>

        <button
          type="button"
          @click="closeEditor"
          class="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
        >
          Batal
        </button>
      </div>

      <div
        v-if="editorError"
        role="alert"
        class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-xs sm:text-sm font-medium text-rose-800 dark:text-rose-300"
      >
        {{ editorError }}
      </div>

      <form @submit.prevent="submitPackage" class="space-y-5">
        <!-- Core Metadata -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div class="md:col-span-5">
            <label for="pkg-motor-select" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Tipe Motor <span class="text-rose-600">*</span>
            </label>
            <select
              id="pkg-motor-select"
              v-model="editorForm.motorcycleTypeId"
              required
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="" disabled>-- Pilih Tipe Motor --</option>
              <option
                v-for="m in selectableMotorcycles"
                :key="m.id"
                :value="String(m.id)"
              >
                {{ m.displayName }}{{ m.isActive === false ? ' (Nonaktif)' : '' }}
              </option>
            </select>
          </div>

          <div class="md:col-span-4">
            <label for="pkg-name-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Nama Paket <span class="text-rose-600">*</span>
            </label>
            <input
              id="pkg-name-input"
              v-model="editorForm.name"
              type="text"
              required
              placeholder="Misal: Paket Area Mesin & CVT Vario 160"
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div class="md:col-span-3">
            <label for="pkg-type-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Jenis Paket <span class="text-rose-600">*</span>
            </label>
            <input
              id="pkg-type-input"
              v-model="editorForm.packageType"
              type="text"
              required
              list="package-type-suggestions"
              placeholder="Mesin / Pengereman / Full Bike"
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
            />
            <datalist id="package-type-suggestions">
              <option v-for="preset in packageTypePresets" :key="preset" :value="preset" />
            </datalist>
          </div>

          <!-- 1-tap Package Type Presets -->
          <div class="md:col-span-12 flex flex-wrap items-center gap-1.5">
            <span class="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mr-1">Pilihan Cepat Jenis:</span>
            <button
              v-for="preset in packageTypePresets"
              :key="preset"
              type="button"
              @click="editorForm.packageType = preset"
              class="min-h-[36px] px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
              :class="getPackageTypeMeta(editorForm.packageType).label === preset
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'"
            >
              {{ preset }}
            </button>
          </div>

          <div class="md:col-span-9">
            <label for="pkg-desc-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Deskripsi Paket (Opsional)
            </label>
            <input
              id="pkg-desc-input"
              v-model="editorForm.description"
              type="text"
              placeholder="Misal: Set baut titanium untuk cover CVT, crankcase kanan, dan radiator."
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div class="md:col-span-3">
            <label for="pkg-status-select" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Status Paket
            </label>
            <select
              id="pkg-status-select"
              v-model="editorForm.status"
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="ACTIVE">Aktif (Tampil di Staf)</option>
              <option value="INACTIVE">Nonaktif (Arsip)</option>
            </select>
          </div>
        </div>

        <!-- Bolt Items Builder -->
        <div class="rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#18181c]/70 p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Rincian Baut dalam Paket
              </h3>
              <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {{ editorForm.items.length }} baris item &bull; {{ editorTotalPcs }} pcs total
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                v-if="editorForm.motorcycleTypeId"
                type="button"
                @click="importFromMotorMatrix"
                :disabled="isImportingMatrix"
                class="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-white hover:bg-zinc-100 dark:bg-[#121215] dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download class="w-3.5 h-3.5" aria-hidden="true" />
                <span>{{ isImportingMatrix ? 'Mengambil Matriks...' : 'Isi dari Matriks Motor' }}</span>
              </button>

              <button
                type="button"
                @click="addItemRow"
                class="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Item Baut</span>
              </button>
            </div>
          </div>

          <div class="space-y-2.5">
            <div
              v-for="(item, idx) in editorForm.items"
              :key="idx"
              class="p-3 rounded-xl bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end"
            >
              <div class="md:col-span-5">
                <BoltSpecPicker
                  v-model="item.boltSpecId"
                  :specs="boltSpecs"
                  :input-id="`pkg-item-spec-${idx}`"
                  :label="`Baut #${idx + 1}`"
                  :allow-clear="false"
                />
              </div>

              <div class="md:col-span-2">
                <label :for="`pkg-item-qty-${idx}`" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Jumlah (pcs)
                </label>
                <input
                  :id="`pkg-item-qty-${idx}`"
                  v-model.number="item.quantity"
                  type="number"
                  min="1"
                  max="999"
                  required
                  class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div class="md:col-span-4">
                <label :for="`pkg-item-note-${idx}`" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Catatan Area (Opsional)
                </label>
                <input
                  :id="`pkg-item-note-${idx}`"
                  v-model="item.emblemNote"
                  type="text"
                  placeholder="Misal: CVT (6) + Kanan (5)"
                  class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div class="md:col-span-1 flex justify-end">
                <button
                  type="button"
                  @click="removeItemRow(idx)"
                  :disabled="editorForm.items.length <= 1"
                  :aria-label="`Hapus item baut ke-${idx + 1}`"
                  class="min-w-[44px] min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 class="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            @click="closeEditor"
            class="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isSubmittingPackage"
            class="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check class="w-4 h-4" aria-hidden="true" />
            <span>{{ isSubmittingPackage ? 'Menyimpan...' : (editingPackageId ? 'Simpan Perubahan' : 'Simpan Paket') }}</span>
          </button>
        </div>
      </form>
    </section>

    <!-- Error -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button
        @click="loadInitialData"
        type="button"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Muat Ulang
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" role="status" aria-live="polite">
      <SkeletonCard v-for="n in 6" :key="n" />
      <span class="sr-only">Memuat daftar paket baut...</span>
    </div>

    <template v-else>
      <!-- Search, Motorcycle Filter, Type FilterChips, & Status FilterChips -->
      <div class="space-y-3">
        <div class="flex flex-col md:flex-row gap-3">
          <div class="flex-1">
            <SearchInput
              v-model="searchQuery"
              placeholder="Cari nama paket, motor, atau kode baut..."
              aria-label="Cari paket baut"
            />
          </div>

          <div class="w-full md:w-72">
            <label for="pkg-filter-motor" class="sr-only">Filter berdasarkan tipe motor</label>
            <select
              id="pkg-filter-motor"
              v-model="selectedMotorId"
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-white dark:bg-[#121215] border border-zinc-500 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 shadow-sm"
            >
              <option value="all">Semua Tipe Motor ({{ packages.length }})</option>
              <option
                v-for="mOpt in packageMotorOptions"
                :key="mOpt.id"
                :value="String(mOpt.id)"
              >
                {{ mOpt.displayName }} ({{ mOpt.count }})
              </option>
            </select>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2.5">
          <!-- Normalized Package Type Filter Chips -->
          <div v-if="packages.length > 0" class="flex flex-wrap items-center gap-2">
            <FilterChip
              v-for="chip in typeChips"
              :key="chip.value"
              :label="chip.label"
              :count="chip.count"
              :active="selectedType === chip.value"
              @click="selectedType = chip.value"
            />
          </div>

          <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
            Menampilkan {{ filteredPackages.length }} dari {{ baseVisiblePackages.length }} paket
          </p>
        </div>

        <!-- Status Filter Chips (Admin view, matching MotorcyclesView pattern) -->
        <div v-if="auth.isAdmin && packages.length > 0" class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="opt in statusFilterOptions"
            :key="opt.value"
            type="button"
            @click="selectedStatus = opt.value"
            class="min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            :class="selectedStatus === opt.value
              ? opt.value === 'INACTIVE'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
              : 'bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            <span>{{ opt.label }}</span>
            <span class="font-mono text-[11px] opacity-80">({{ opt.count }})</span>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-if="filteredPackages.length === 0"
        :icon="PackageOpen"
        title="Belum ada paket yang cocok"
        :description="packages.length === 0 ? 'Belum ada paket baut yang tersedia di gerai.' : 'Coba ubah kata kunci atau filter paket lain.'"
        :action-label="packages.length === 0 ? (auth.isAdmin ? 'Tambah Paket Pertama' : '') : 'Reset Filter'"
        @action="packages.length === 0 && auth.isAdmin ? openCreateEditor() : resetFilters()"
      />

      <!-- Package Cards Grid (Matching RosterCard / ItemCard anatomy & No Data Modal rule) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        <article
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col transition-all duration-150"
          :class="pkg.status === 'INACTIVE' ? 'opacity-80' : 'hover:border-zinc-500 dark:hover:border-zinc-600'"
        >
          <!-- Top Color Accent Strip -->
          <div class="h-1.5 w-full shrink-0" :class="getPackageTypeMeta(pkg.packageType).band" aria-hidden="true"></div>

          <!-- Visual Showcase Banner (Real Titanium Bolt Photos) -->
          <div class="relative h-28 w-full overflow-hidden bg-zinc-950">
            <div
              class="absolute inset-0 flex items-center justify-center gap-2 p-3"
              :class="pkg.status === 'INACTIVE' ? 'grayscale opacity-60' : ''"
            >
              <template v-for="(item, idx) in (pkg.items || []).slice(0, 4)" :key="item.id || idx">
                <div
                  class="relative w-14 h-14 rounded-xl overflow-hidden border border-white/20 bg-zinc-900 shrink-0 flex items-center justify-center"
                  :class="idx > 2 ? 'hidden sm:flex' : ''"
                >
                  <img
                    v-if="item.boltSpec?.images?.length"
                    :src="item.boltSpec.images[0].url"
                    :alt="item.boltSpec.code"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <Nut v-else class="w-6 h-6 text-zinc-400" aria-hidden="true" />
                  <span
                    v-if="item.boltSpec?.diameterMm"
                    class="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[9px] font-mono font-bold text-zinc-200"
                  >
                    M{{ Number(item.boltSpec.diameterMm) }}
                  </span>
                </div>
              </template>
            </div>

            <div class="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" aria-hidden="true"></div>

            <!-- Top-left Type Pill -->
            <span
              class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border backdrop-blur-sm"
              :class="getPackageTypeMeta(pkg.packageType).badge"
            >
              {{ getPackageTypeMeta(pkg.packageType).label }}
            </span>

            <!-- Top-right Status Pill -->
            <span
              v-if="pkg.status === 'INACTIVE'"
              class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600/95 border border-rose-300/40 text-white text-[10px] font-bold inline-flex items-center gap-1 backdrop-blur-sm shadow"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-white shrink-0" aria-hidden="true"></span>
              <span>Nonaktif</span>
            </span>
            <span
              v-else
              class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-zinc-950/90 border border-white/15 text-white text-[10px] font-medium inline-flex items-center gap-1 backdrop-blur-sm"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true"></span>
              <span>Aktif</span>
            </span>

            <!-- Bottom-right Dominant Quantity Badge -->
            <span class="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-white/20 text-white text-xs font-mono font-bold backdrop-blur-sm">
              {{ totalPcs(pkg) }} pcs
            </span>
          </div>

          <!-- Card Content -->
          <div class="p-4 flex-1 flex flex-col gap-3">
            <div>
              <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {{ pkg.name }}
              </h2>
              <div class="flex flex-wrap items-center gap-1.5 mt-1">
                <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  {{ pkg.motorcycleType?.displayName || 'Motor tidak diketahui' }}
                </span>
                <span
                  v-if="pkg.motorcycleType?.isActive === false"
                  class="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/30 text-[10px] font-semibold text-rose-700 dark:text-rose-300"
                >
                  Motor Nonaktif
                </span>
              </div>
            </div>

            <!-- Accurate Non-Redundant Stats -->
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                {{ pkg.items?.length || 0 }} jenis baut
              </span>
              <span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                {{ totalPcs(pkg) }} pcs total
              </span>
              <span
                v-if="(pkg._count?.pickSessions || 0) > 0"
                class="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-[11px] font-mono text-emerald-800 dark:text-emerald-300"
              >
                {{ pkg._count.pickSessions }} sesi pakai
              </span>
            </div>

            <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed" :class="expandedPackageId === pkg.id ? '' : 'line-clamp-2'">
              {{ pkg.description || 'Paket baut siap ambil untuk tipe motor ini.' }}
            </p>

            <!-- Inline Expandable Items List (Zero Data Modal) -->
            <div
              v-if="expandedPackageId === pkg.id"
              class="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 space-y-2"
            >
              <p class="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Daftar Baut di Paket Ini ({{ pkg.items?.length || 0 }})
              </p>
              <div class="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                <div
                  v-for="item in pkg.items"
                  :key="item.id"
                  class="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c]"
                >
                  <div class="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center justify-center">
                    <img
                      v-if="item.boltSpec?.images?.length"
                      :src="item.boltSpec.images[0].url"
                      :alt="item.boltSpec.code"
                      class="w-full h-full object-cover"
                    />
                    <Nut v-else class="w-4 h-4 text-zinc-400" aria-hidden="true" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {{ item.boltSpec?.code }}
                    </p>
                    <p class="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                      M{{ Number(item.boltSpec?.diameterMm) }} &times; {{ Number(item.boltSpec?.lengthMm) }} mm
                      <span v-if="item.emblemNote"> &bull; {{ item.emblemNote }}</span>
                    </p>
                  </div>
                  <span class="px-2 py-0.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-bold shrink-0">
                    {{ item.quantity }} pcs
                  </span>
                </div>
              </div>
            </div>

            <!-- Footer Primary Actions (min 44px touch targets) -->
            <div class="mt-auto pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="toggleExpandPackage(pkg.id)"
                  :aria-expanded="expandedPackageId === pkg.id"
                  class="min-h-[44px] px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ChevronUp v-if="expandedPackageId === pkg.id" class="w-4 h-4" aria-hidden="true" />
                  <ChevronDown v-else class="w-4 h-4" aria-hidden="true" />
                  <span>{{ expandedPackageId === pkg.id ? 'Tutup Rincian' : 'Lihat Isi Paket' }}</span>
                </button>

                <button
                  type="button"
                  @click="pickThisPackage(pkg)"
                  :disabled="pkg.status === 'INACTIVE' || pkg.motorcycleType?.isActive === false"
                  class="min-h-[44px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play class="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{{ pkg.status === 'INACTIVE' ? 'Nonaktif' : 'Pakai Paket' }}</span>
                </button>
              </div>

              <!-- Admin CRUD Actions Row (Separated from primary action & destructive separated) -->
              <div
                v-if="auth.isAdmin"
                class="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="openEditEditor(pkg)"
                    class="min-h-[44px] px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil class="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ubah</span>
                  </button>

                  <button
                    type="button"
                    @click="requestToggleStatus(pkg)"
                    class="min-h-[44px] px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Power class="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{{ pkg.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan' }}</span>
                  </button>
                </div>

                <button
                  type="button"
                  @click="requestDeletePackage(pkg)"
                  class="min-h-[44px] px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </template>

    <!-- Status Toggle Confirmation Dialog -->
    <ConfirmDialog
      :open="Boolean(packageToToggleStatus)"
      :title="packageToToggleStatus?.status === 'ACTIVE' ? 'Nonaktifkan Paket Baut?' : 'Aktifkan Kembali Paket Baut?'"
      :message="packageToToggleStatus?.status === 'ACTIVE'
        ? `Paket '${packageToToggleStatus?.name}' akan disembunyikan dari daftar staf saat membuat pick-list baru. Data historis sesi tetap aman.`
        : `Paket '${packageToToggleStatus?.name}' akan tampil kembali untuk staf gerai.`"
      :confirm-text="packageToToggleStatus?.status === 'ACTIVE' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'"
      :danger="packageToToggleStatus?.status === 'ACTIVE'"
      :loading="isMutatingAction"
      @confirm="confirmToggleStatus"
      @cancel="packageToToggleStatus = null"
    />

    <!-- Delete Package Confirmation Dialog -->
    <ConfirmDialog
      :open="Boolean(packageToDelete)"
      title="Hapus Paket Baut?"
      :message="deleteConfirmMessage"
      confirm-text="Ya, Hapus Permanen"
      :danger="true"
      :loading="isMutatingAction"
      @confirm="confirmDeletePackage"
      @cancel="packageToDelete = null"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Nut,
  PackageOpen,
  Pencil,
  Play,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { getPackageTypeMeta } from '../utils/boltTokens';
import FilterChip from '../components/ui/FilterChip.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';
import BoltSpecPicker from '../components/ui/BoltSpecPicker.vue';

const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const packages = ref([]);
const motorcycles = ref([]);
const boltSpecs = ref([]);

const isLoading = ref(false);
const errorMsg = ref('');

// Filter state
const searchQuery = ref('');
const selectedMotorId = ref('all');
const selectedType = ref('all');
const selectedStatus = ref('ACTIVE');
const expandedPackageId = ref(null);

// Inline Editor CRUD state
const editorSectionRef = ref(null);
const isEditorOpen = ref(false);
const editingPackageId = ref(null);
const isSubmittingPackage = ref(false);
const isImportingMatrix = ref(false);
const editorError = ref('');
const packageTypePresets = ['Full Bike', 'Mesin', 'Pengereman', 'Bodi', 'CVT'];

const editorForm = reactive({
  motorcycleTypeId: '',
  packageType: 'Mesin',
  name: '',
  description: '',
  status: 'ACTIVE',
  items: [{ boltSpecId: '', quantity: 1, emblemNote: '' }],
});

// Confirmation dialog state
const packageToToggleStatus = ref(null);
const packageToDelete = ref(null);
const isMutatingAction = ref(false);

const baseVisiblePackages = computed(() => {
  if (auth.isAdmin) return packages.value;
  return packages.value.filter((p) => p.status !== 'INACTIVE');
});

const packageMotorOptions = computed(() => {
  const map = new Map();
  for (const pkg of baseVisiblePackages.value) {
    if (!pkg.motorcycleType) continue;
    const id = pkg.motorcycleType.id;
    const existing = map.get(id) || {
      id,
      displayName: pkg.motorcycleType.displayName,
      count: 0,
    };
    existing.count += 1;
    map.set(id, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName, 'id'));
});

const selectableMotorcycles = computed(() => {
  const currentId = String(editorForm.motorcycleTypeId || '');
  return motorcycles.value.filter(
    (m) => m.isActive !== false || String(m.id) === currentId
  );
});

const typeChips = computed(() => {
  const map = new Map();
  for (const pkg of baseVisiblePackages.value) {
    if (selectedMotorId.value !== 'all' && String(pkg.motorcycleTypeId) !== selectedMotorId.value) {
      continue;
    }
    const meta = getPackageTypeMeta(pkg.packageType);
    const entry = map.get(meta.key) || { value: meta.key, label: meta.label, count: 0 };
    entry.count += 1;
    map.set(meta.key, entry);
  }

  const totalForScope = selectedMotorId.value === 'all'
    ? baseVisiblePackages.value.length
    : baseVisiblePackages.value.filter((p) => String(p.motorcycleTypeId) === selectedMotorId.value).length;

  return [
    { value: 'all', label: 'Semua', count: totalForScope },
    ...Array.from(map.values()),
  ];
});

const statusFilterOptions = computed(() => {
  const activeCount = packages.value.filter((p) => p.status !== 'INACTIVE').length;
  const inactiveCount = packages.value.length - activeCount;
  return [
    { value: 'all', label: 'Semua Status', count: packages.value.length },
    { value: 'ACTIVE', label: 'Aktif', count: activeCount },
    { value: 'INACTIVE', label: 'Nonaktif', count: inactiveCount },
  ];
});

const filteredPackages = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return baseVisiblePackages.value.filter((pkg) => {
    if (auth.isAdmin && selectedStatus.value !== 'all') {
      const normalizedStatus = pkg.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
      if (normalizedStatus !== selectedStatus.value) return false;
    }

    if (selectedMotorId.value !== 'all' && String(pkg.motorcycleTypeId) !== selectedMotorId.value) {
      return false;
    }

    if (selectedType.value !== 'all') {
      const meta = getPackageTypeMeta(pkg.packageType);
      if (meta.key !== selectedType.value) return false;
    }

    if (!q) return true;
    const matchMain =
      (pkg.name || '').toLowerCase().includes(q) ||
      (pkg.description || '').toLowerCase().includes(q) ||
      (pkg.motorcycleType?.displayName || '').toLowerCase().includes(q) ||
      getPackageTypeMeta(pkg.packageType).label.toLowerCase().includes(q);
    if (matchMain) return true;

    return (pkg.items || []).some(
      (item) =>
        (item.boltSpec?.code || '').toLowerCase().includes(q) ||
        (item.emblemNote || '').toLowerCase().includes(q)
    );
  });
});

const editorTotalPcs = computed(() =>
  editorForm.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0)
);

const deleteConfirmMessage = computed(() => {
  if (!packageToDelete.value) return '';
  const usedCount = packageToDelete.value._count?.pickSessions || 0;
  const base = `Paket "${packageToDelete.value.name}" akan dihapus permanen beserta daftar item di dalamnya.`;
  if (usedCount > 0) {
    return `${base} Paket ini tercatat pada ${usedCount} riwayat sesi (riwayat lama tetap tersimpan, namun tautan paketnya akan dilepas).`;
  }
  return base;
});

const totalPcs = (pkg) => (pkg.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const toggleExpandPackage = (id) => {
  expandedPackageId.value = expandedPackageId.value === id ? null : id;
};

const resetFilters = () => {
  searchQuery.value = '';
  selectedMotorId.value = 'all';
  selectedType.value = 'all';
  selectedStatus.value = auth.isAdmin ? 'all' : 'ACTIVE';
};

const resetEditorForm = () => {
  editingPackageId.value = null;
  editorError.value = '';
  editorForm.motorcycleTypeId = motorcycles.value.find((m) => m.isActive !== false)?.id
    ? String(motorcycles.value.find((m) => m.isActive !== false).id)
    : '';
  editorForm.packageType = 'Mesin';
  editorForm.name = '';
  editorForm.description = '';
  editorForm.status = 'ACTIVE';
  editorForm.items = [{ boltSpecId: boltSpecs.value[0]?.id || '', quantity: 1, emblemNote: '' }];
};

const scrollToEditor = async () => {
  await nextTick();
  editorSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const openCreateEditor = async () => {
  resetEditorForm();
  isEditorOpen.value = true;
  await scrollToEditor();
};

const toggleCreateEditor = async () => {
  if (isEditorOpen.value && !editingPackageId.value) {
    isEditorOpen.value = false;
    return;
  }
  await openCreateEditor();
};

const openEditEditor = async (pkg) => {
  editingPackageId.value = pkg.id;
  editorError.value = '';
  editorForm.motorcycleTypeId = String(pkg.motorcycleTypeId || '');
  editorForm.packageType = getPackageTypeMeta(pkg.packageType).label || pkg.packageType || 'Mesin';
  editorForm.name = pkg.name || '';
  editorForm.description = pkg.description || '';
  editorForm.status = pkg.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  editorForm.items = (pkg.items && pkg.items.length > 0)
    ? pkg.items.map((item) => ({
        boltSpecId: item.boltSpecId,
        quantity: Number(item.quantity) || 1,
        emblemNote: item.emblemNote || '',
      }))
    : [{ boltSpecId: boltSpecs.value[0]?.id || '', quantity: 1, emblemNote: '' }];
  isEditorOpen.value = true;
  await scrollToEditor();
};

const closeEditor = () => {
  isEditorOpen.value = false;
  editingPackageId.value = null;
  editorError.value = '';
};

const addItemRow = () => {
  editorForm.items.push({
    boltSpecId: boltSpecs.value[0]?.id || '',
    quantity: 1,
    emblemNote: '',
  });
};

const removeItemRow = (index) => {
  if (editorForm.items.length <= 1) return;
  editorForm.items.splice(index, 1);
};

const importFromMotorMatrix = async () => {
  if (!editorForm.motorcycleTypeId || isImportingMatrix.value) return;
  isImportingMatrix.value = true;
  editorError.value = '';
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${editorForm.motorcycleTypeId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat matriks baut motor.');

    const reqs = Array.isArray(data.requirements) ? data.requirements : [];
    if (reqs.length === 0) {
      toast.info('Motor ini belum memiliki entri di matriks baut.');
      return;
    }

    // Aggregate requirements by boltSpecId and summarize areas in emblemNote
    const grouped = new Map();
    for (const reqRow of reqs) {
      const specId = reqRow.boltSpecId;
      if (!specId) continue;
      const entry = grouped.get(specId) || {
        boltSpecId: specId,
        quantity: 0,
        notes: [],
      };
      const qty = Number(reqRow.quantity) || 1;
      entry.quantity += qty;
      const posName = reqRow.boltPosition?.name;
      if (posName) entry.notes.push(`${posName} (${qty})`);
      grouped.set(specId, entry);
    }

    editorForm.items = Array.from(grouped.values()).map((entry) => ({
      boltSpecId: entry.boltSpecId,
      quantity: entry.quantity,
      emblemNote: entry.notes.join(', '),
    }));

    if (!editorForm.name.trim() && data.displayName) {
      editorForm.name = `Paket ${getPackageTypeMeta(editorForm.packageType).label} ${data.displayName}`;
    }

    toast.success(`${editorForm.items.length} jenis baut disalin dari matriks motor.`);
  } catch (err) {
    editorError.value = err.message;
  } finally {
    isImportingMatrix.value = false;
  }
};

const submitPackage = async () => {
  if (isSubmittingPackage.value) return;
  editorError.value = '';

  const validItems = editorForm.items.filter((item) => item.boltSpecId && Number(item.quantity) > 0);
  if (validItems.length === 0) {
    editorError.value = 'Tambahkan minimal 1 item baut dengan jumlah minimal 1 pcs.';
    return;
  }

  isSubmittingPackage.value = true;
  try {
    const payload = {
      motorcycleTypeId: Number(editorForm.motorcycleTypeId),
      packageType: editorForm.packageType.trim(),
      name: editorForm.name.trim(),
      description: editorForm.description.trim() || null,
      status: editorForm.status,
      items: validItems.map((item) => ({
        boltSpecId: Number(item.boltSpecId),
        quantity: Number(item.quantity),
        emblemNote: item.emblemNote?.trim() || null,
      })),
    };

    const isEdit = Boolean(editingPackageId.value);
    const url = isEdit ? `/api/packages/${editingPackageId.value}` : '/api/packages';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await auth.apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan paket baut.');

    if (isEdit) {
      const idx = packages.value.findIndex((p) => p.id === data.id);
      if (idx !== -1) packages.value[idx] = data;
      toast.success(`Paket "${data.name}" berhasil diperbarui.`);
    } else {
      packages.value.unshift(data);
      toast.success(`Paket "${data.name}" berhasil ditambahkan.`);
    }

    if (data.status === 'INACTIVE') {
      selectedStatus.value = 'all';
    } else if (selectedStatus.value === 'INACTIVE') {
      selectedStatus.value = 'ACTIVE';
    }

    closeEditor();
  } catch (err) {
    editorError.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat menyimpan paket. Coba lagi.'
      : err.message;
  } finally {
    isSubmittingPackage.value = false;
  }
};

const requestToggleStatus = (pkg) => {
  packageToToggleStatus.value = pkg;
};

const confirmToggleStatus = async () => {
  if (!packageToToggleStatus.value || isMutatingAction.value) return;
  const target = packageToToggleStatus.value;
  isMutatingAction.value = true;
  try {
    const res = await auth.apiFetch(`/api/packages/${target.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah status paket.');

    const idx = packages.value.findIndex((p) => p.id === data.id);
    if (idx !== -1) packages.value[idx] = data;

    toast.success(
      data.status === 'ACTIVE'
        ? `Paket "${data.name}" diaktifkan kembali.`
        : `Paket "${data.name}" dinonaktifkan.`
    );
    packageToToggleStatus.value = null;
  } catch (err) {
    toast.error(err.message);
    packageToToggleStatus.value = null;
  } finally {
    isMutatingAction.value = false;
  }
};

const requestDeletePackage = (pkg) => {
  packageToDelete.value = pkg;
};

const confirmDeletePackage = async () => {
  if (!packageToDelete.value || isMutatingAction.value) return;
  const target = packageToDelete.value;
  isMutatingAction.value = true;
  try {
    const res = await auth.apiFetch(`/api/packages/${target.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus paket baut.');

    packages.value = packages.value.filter((p) => p.id !== target.id);
    if (expandedPackageId.value === target.id) expandedPackageId.value = null;
    if (editingPackageId.value === target.id) closeEditor();

    toast.success(`Paket "${target.name}" berhasil dihapus.`);
    packageToDelete.value = null;
  } catch (err) {
    toast.error(err.message);
    packageToDelete.value = null;
  } finally {
    isMutatingAction.value = false;
  }
};

const loadInitialData = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const requests = [auth.apiFetch('/api/packages')];
    if (auth.isAdmin) {
      requests.push(auth.apiFetch('/api/motorcycles'));
      requests.push(auth.apiFetch('/api/bolt-specs'));
    }

    const [pkgRes, motorRes, specRes] = await Promise.all(requests);
    if (!pkgRes.ok) throw new Error('Gagal memuat daftar paket baut.');

    const pkgData = await pkgRes.json();
    packages.value = Array.isArray(pkgData) ? pkgData : [];

    if (motorRes && motorRes.ok) {
      const mData = await motorRes.json();
      motorcycles.value = Array.isArray(mData) ? mData : [];
    }
    if (specRes && specRes.ok) {
      const sData = await specRes.json();
      boltSpecs.value = Array.isArray(sData) ? sData : [];
    }

    // Default admin status filter shows Active first (or All if none active)
    if (auth.isAdmin && packages.value.some((p) => p.status !== 'INACTIVE')) {
      selectedStatus.value = 'all';
    }
  } catch (err) {
    console.error(err);
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const pickThisPackage = (pkg) => {
  if (pkg.status === 'INACTIVE' || pkg.motorcycleType?.isActive === false) return;
  router.push({
    path: '/pick-list',
    query: {
      motorId: pkg.motorcycleTypeId,
      pkgId: pkg.id,
    },
  });
};

onMounted(loadInitialData);
</script>
