<template>
  <div>
    <!-- PRINT-ONLY WORK ORDER TABLE (clean paper layout, hidden on screen) -->
    <div v-if="pickData" class="print-only space-y-4">
      <div class="border-b-2 border-black pb-3 flex items-start justify-between">
        <div>
          <p class="text-xs font-mono uppercase">Hex Titanium &bull; Banguntapan, Bantul, Yogyakarta</p>
          <h1 class="text-lg font-bold">Daftar Ambil Baut: {{ pickData.motorcycle.displayName }}</h1>
          <p class="text-xs">
            Paket: {{ pickData.package ? pickData.package.name : 'Lengkap Satu Motor' }}
          </p>
        </div>
        <div class="text-right text-xs font-mono">
          <p>Total: <strong>{{ pickData.summary.totalQuantity }} pcs</strong> ({{ pickData.summary.distinctBoltSpecsCount }} ukuran)</p>
          <p>Dicetak: {{ new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) }}</p>
        </div>
      </div>

      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-black font-mono uppercase text-[11px]">
            <th class="py-2 pr-2">#</th>
            <th class="py-2 pr-2">Kode Baut</th>
            <th class="py-2 pr-2">Ukuran</th>
            <th class="py-2 pr-2">Kepala &amp; Warna</th>
            <th class="py-2 pr-2 text-center">Jumlah</th>
            <th class="py-2">Posisi Pada Motor</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in pickData.consolidatedTotals"
            :key="item.boltSpecId"
            class="border-b border-zinc-300"
          >
            <td class="py-2 pr-2 font-mono">{{ idx + 1 }}</td>
            <td class="py-2 pr-2 font-mono font-bold">{{ item.code }}</td>
            <td class="py-2 pr-2 font-mono">M{{ Number(item.diameterMm) }} × {{ Number(item.lengthMm) }} mm</td>
            <td class="py-2 pr-2">{{ item.headType }} &bull; {{ item.finish }}</td>
            <td class="py-2 pr-2 text-center font-mono font-bold">{{ item.totalQuantity }} pcs</td>
            <td class="py-2">{{ item.positionsSummary }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SCREEN UI (hidden during print) -->
    <div class="no-print">
      <!-- ========================================================= -->
      <!-- VIEW 1: MOTORCYCLE ROSTER + PERSISTENT INSPECT PANEL       -->
      <!-- ========================================================= -->
      <AppShell v-if="viewMode === 'roster'">
        <template #topbar>
          <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-4">
            <!-- Top Row: Title + Counters + History Link -->
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-2.5 min-w-0">
                <h1 class="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Pilih Motor
                </h1>
                <StatPill :icon="Bike" label="Tersedia" :value="`${motorcycles.length} motor`" />
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <router-link
                  to="/dashboard"
                  class="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
                >
                  <History class="w-4 h-4" aria-hidden="true" />
                  <span>Riwayat</span>
                </router-link>
              </div>
            </div>

            <!-- Search + Brand Faction Filter Chips -->
            <div class="space-y-3">
              <SearchInput
                v-model="rosterSearch"
                placeholder="Cari motor, merek, atau tahun (misal: NMAX, Vario)..."
                aria-label="Cari model sepeda motor"
              />

              <div class="flex items-center gap-2 overflow-x-auto pb-1">
                <FilterChip
                  v-for="chip in brandChips"
                  :key="chip.value"
                  :label="chip.label"
                  :count="chip.count"
                  :active="selectedBrand === chip.value"
                  @click="selectedBrand = chip.value"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- Error Banner -->
        <div
          v-if="rosterError"
          role="alert"
          class="mb-4 bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
        >
          <span>{{ rosterError }}</span>
          <button
            type="button"
            @click="loadRoster"
            class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            Coba Lagi
          </button>
        </div>

        <!-- Split Workspace: Roster Grid (left) + Persistent Inspect Panel (right on desktop) -->
        <div class="flex items-start gap-5">
          <div class="flex-1 min-w-0">
            <!-- Loading Skeletons -->
            <div
              v-if="isLoadingRoster"
              role="status"
              aria-label="Memuat daftar motor"
              class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              <SkeletonCard v-for="n in 8" :key="n" />
            </div>

            <!-- Empty State -->
            <EmptyState
              v-else-if="filteredMotors.length === 0"
              :icon="Bike"
              title="Motor Tidak Ditemukan"
              :description="rosterSearch ? `Tidak ada motor yang cocok dengan &quot;${rosterSearch}&quot;.` : 'Belum ada tipe motor aktif di sistem.'"
              action-label="Tampilkan Semua Motor"
              @action="resetRosterFilters"
            />

            <!-- Character-Style Roster Grid -->
            <div
              v-else
              ref="rosterGridRef"
              @keydown="onRosterKeyDown"
              class="grid gap-3 sm:gap-4"
              :class="inspectedMotor ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'"
            >
              <RosterCard
                v-for="m in filteredMotors"
                :key="m.id"
                :data-motor-id="m.id"
                :motorcycle="m"
                :selected="inspectedMotor?.id === m.id"
                @select="openInspect"
              />
            </div>
          </div>

          <!-- Persistent Inspect Panel (Desktop inline right, Mobile bottom sheet) -->
          <DetailSheet
            :open="Boolean(inspectedMotor)"
            :title="inspectedMotor ? `${inspectedMotor.model} ${inspectedMotor.variant}` : ''"
            :eyebrow="inspectedMotor ? `${inspectedMotor.brand} • ${inspectYearText}` : ''"
            @close="closeInspect"
          >
            <template v-if="inspectedMotor">
              <!-- Hero Photo + Completeness Ring + Live Summary -->
              <div class="flex items-center gap-3.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
                <button
                  type="button"
                  @click="openMotorGallery(inspectedMotor)"
                  :aria-label="`Lihat galeri foto ${inspectedMotor.displayName}`"
                  class="w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-400 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-zinc-500 transition-colors"
                >
                  <img
                    v-if="inspectedMotor.images?.length"
                    :src="inspectedMotor.images[0].url"
                    :alt="inspectedMotor.displayName"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-zinc-400">
                    <Bike class="w-7 h-7" aria-hidden="true" />
                  </div>
                </button>

                <div class="min-w-0 flex-1 space-y-2">
                  <ProgressRing
                    :value="inspectCompleteness.percent"
                    :size="48"
                    :stroke-width="5"
                    :tone="inspectCompleteness.status === 'complete' ? 'emerald' : 'amber'"
                    :label="`Kelengkapan ${inspectCompleteness.label}`"
                    :sublabel="`${inspectBoltCount} baut • ${inspectSpecCount} ukuran`"
                  />
                </div>
              </div>

              <!-- Inspect Tabs -->
              <SegmentedControl
                v-model="inspectTab"
                :options="[
                  { value: 'summary', label: 'Ringkasan' },
                  { value: 'slots', label: 'Titik', count: inspectRequirements.length },
                  { value: 'packages', label: 'Paket', count: inspectPackages.length },
                ]"
              />

              <!-- Inspect Loading -->
              <div v-if="isLoadingInspect" class="py-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                Memuat detail ukuran baut motor...
              </div>

              <!-- Inspect Tab 1: Ringkasan -->
              <div v-else-if="inspectTab === 'summary'" class="space-y-4">
                <div class="grid grid-cols-3 gap-2">
                  <div class="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700 text-center">
                    <span class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 block">Total Baut</span>
                    <strong class="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100">{{ inspectBoltCount }}</strong>
                  </div>
                  <div class="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700 text-center">
                    <span class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 block">Ukuran</span>
                    <strong class="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100">{{ inspectSpecCount }}</strong>
                  </div>
                  <div class="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700 text-center">
                    <span class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 block">Estimasi</span>
                    <strong class="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100">5–10m</strong>
                  </div>
                </div>

                <!-- Quick Package Picker -->
                <div class="space-y-2">
                  <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Pilih Paket Pengambilan
                  </p>
                  <div class="space-y-2">
                    <PresetCard
                      :pkg="null"
                      title="Lengkap Satu Motor"
                      :subtitle="`${inspectRequirements.length} titik pasang`"
                      :badge-text="`${fullBikeBoltCount} pcs`"
                      :active="!selectedPackageId"
                      @select="selectedPackageId = ''"
                    />
                    <PresetCard
                      v-for="pkg in inspectPackages"
                      :key="pkg.id"
                      :pkg="pkg"
                      :active="selectedPackageId === pkg.id"
                      @select="selectedPackageId = pkg.id"
                    />
                  </div>
                </div>

                <!-- Preview Top Slots -->
                <div v-if="inspectRequirements.length > 0 && !selectedPackageId" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Titik Pasang ({{ inspectRequirements.length }})
                    </p>
                    <button
                      v-if="inspectRequirements.length > 4"
                      type="button"
                      @click="inspectTab = 'slots'"
                      class="min-h-[36px] px-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 underline cursor-pointer"
                    >
                      Lihat Semua &rarr;
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SlotCard
                      v-for="req in inspectRequirements.slice(0, 4)"
                      :key="req.id"
                      :slot-data="req"
                      @select="openBoltSpecSheet(req.boltSpec, req.quantity, req.boltPosition?.name)"
                    />
                  </div>
                </div>
              </div>

              <!-- Inspect Tab 2: Titik Pasang -->
              <div v-else-if="inspectTab === 'slots'" class="space-y-2">
                <EmptyState
                  v-if="inspectRequirements.length === 0"
                  :icon="Wrench"
                  title="Belum Ada Titik Baut"
                  description="Admin belum menambahkan titik pemasangan untuk motor ini."
                />
                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <SlotCard
                    v-for="req in inspectRequirements"
                    :key="req.id"
                    :slot-data="req"
                    @select="openBoltSpecSheet(req.boltSpec, req.quantity, req.boltPosition?.name)"
                  />
                </div>
              </div>

              <!-- Inspect Tab 3: Paket -->
              <div v-else-if="inspectTab === 'packages'" class="space-y-2">
                <PresetCard
                  :pkg="null"
                  title="Lengkap Satu Motor"
                  :subtitle="`${inspectRequirements.length} titik pasang`"
                  :badge-text="`${fullBikeBoltCount} pcs`"
                  :active="!selectedPackageId"
                  @select="selectedPackageId = ''"
                />
                <PresetCard
                  v-for="pkg in inspectPackages"
                  :key="pkg.id"
                  :pkg="pkg"
                  :active="selectedPackageId === pkg.id"
                  @select="selectedPackageId = pkg.id"
                />
                <p v-if="inspectPackages.length === 0" class="text-xs text-zinc-600 dark:text-zinc-400 text-center py-3">
                  Motor ini belum memiliki paket bundling khusus; gunakan mode Lengkap Satu Motor.
                </p>
              </div>
            </template>

            <template #footer>
              <button
                type="button"
                @click="openBoltGrid"
                :disabled="isGenerating || isLoadingInspect"
                class="w-full min-h-[52px] px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>{{ isGenerating ? 'Menyiapkan Daftar...' : 'Buka Daftar Ambil Baut' }}</span>
                <ArrowRight class="w-4 h-4" aria-hidden="true" />
              </button>
            </template>
          </DetailSheet>
        </div>
      </AppShell>

      <!-- ========================================================= -->
      <!-- VIEW 2: BOLT INVENTORY GRID (NOT A TABLE!)                 -->
      <!-- ========================================================= -->
      <AppShell v-else>
        <template #topbar>
          <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-4">
            <!-- Top Navigation + Motor Context + Desktop Actions -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div class="flex items-start sm:items-center gap-3 min-w-0">
                <button
                  type="button"
                  @click="backToRoster"
                  class="min-h-[44px] px-3 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <ArrowLeft class="w-4 h-4" aria-hidden="true" />
                  <span>Roster</span>
                </button>

                <div class="min-w-0">
                  <h1 class="text-base sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                    {{ pickData?.motorcycle?.displayName || 'Daftar Baut' }}
                  </h1>
                  <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-mono truncate">
                    {{ pickData?.package ? pickData.package.name : 'Lengkap Satu Motor' }}
                    <span v-if="pickData">
                      &bull; {{ pickData.summary.totalQuantity }} baut &bull; {{ pickData.summary.distinctBoltSpecsCount }} ukuran &bull; 5–10m
                    </span>
                  </p>
                </div>
              </div>

              <!-- Desktop Top Quick Actions -->
              <div v-if="pickData" class="hidden md:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  @click="handlePrint"
                  class="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Printer class="w-4 h-4" aria-hidden="true" />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  @click="startSession"
                  :disabled="isCreatingSession || pickData.consolidatedTotals.length === 0"
                  class="min-h-[44px] px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <span>{{ isCreatingSession ? 'Menyiapkan...' : 'Mulai Checklist' }}</span>
                  <ArrowRight class="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <!-- Controls Row: Segmented Control + Search + Size Chips -->
            <div v-if="pickData" class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <SegmentedControl
                v-model="boltTab"
                :options="[
                  { value: 'consolidated', label: 'Per Rak', count: pickData.consolidatedTotals.length },
                  { value: 'breakdown', label: 'Per Titik', count: pickData.positionBreakdown.length },
                ]"
              />

              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 lg:max-w-md">
                <SearchInput
                  v-model="boltSearch"
                  placeholder="Cari ukuran, kode baut, atau posisi..."
                  aria-label="Cari baut"
                />
              </div>
            </div>

            <!-- Diameter Tier Filter Chips (only when in consolidated view & >1 tier) -->
            <div v-if="pickData && boltTab === 'consolidated' && sizeTierChips.length > 2" class="flex items-center gap-2 overflow-x-auto pb-1">
              <FilterChip
                v-for="chip in sizeTierChips"
                :key="chip.value"
                :label="chip.label"
                :count="chip.count"
                :active="selectedSizeTier === chip.value"
                @click="selectedSizeTier = chip.value"
              />
            </div>
          </div>
        </template>

        <!-- Error Banner -->
        <div
          v-if="boltError"
          role="alert"
          class="mb-4 bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
        >
          <span>{{ boltError }}</span>
          <button
            type="button"
            @click="generatePickList"
            class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            Coba Lagi
          </button>
        </div>

        <!-- Completeness Warning Banner -->
        <div
          v-if="!isGenerating && pickData?.summary?.hasWarnings"
          class="mb-4 bg-amber-50 border border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30 p-4 rounded-2xl flex items-start gap-3 text-sm"
        >
          <AlertTriangle class="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 class="font-bold text-amber-900 dark:text-amber-200">Catatan Kelengkapan Data:</h2>
            <ul class="text-xs text-amber-800 dark:text-amber-300 mt-1 list-disc list-inside space-y-0.5">
              <li v-for="(w, idx) in pickData.summary.warnings" :key="idx">{{ w }}</li>
            </ul>
          </div>
        </div>

        <!-- Loading Skeletons -->
        <div
          v-if="isGenerating"
          role="status"
          aria-label="Memuat daftar ukuran baut"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <SkeletonCard v-for="n in 8" :key="n" />
        </div>

        <!-- TAB 1: CONSOLIDATED BOLT INVENTORY GRID -->
        <template v-else-if="pickData && boltTab === 'consolidated'">
          <EmptyState
            v-if="filteredConsolidated.length === 0"
            :icon="Nut"
            title="Tidak Ada Ukuran Baut"
            :description="boltSearch || selectedSizeTier !== 'ALL' ? 'Coba hapus pencarian atau pilih semua ukuran.' : 'Belum ada data baut untuk pilihan ini.'"
            action-label="Reset Filter Baut"
            @action="resetBoltFilters"
          />

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <ItemCard
              v-for="item in filteredConsolidated"
              :key="item.boltSpecId"
              :item="item"
              :selected="inspectedBolt?.boltSpecId === item.boltSpecId"
              @select="openBoltDetail(item)"
            />
          </div>
        </template>

        <!-- TAB 2: POSITION BREAKDOWN CARDS -->
        <template v-else-if="pickData && boltTab === 'breakdown'">
          <EmptyState
            v-if="filteredBreakdown.length === 0"
            :icon="Wrench"
            title="Tidak Ada Titik Pasang"
            description="Tidak ada titik pasang yang cocok dengan pencarian Anda."
            action-label="Reset Pencarian"
            @action="boltSearch = ''"
          />

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              v-for="(row, idx) in filteredBreakdown"
              :key="idx"
              type="button"
              @click="openBoltSpecSheet(row.boltSpec, row.quantity, `${row.positionName} (${formatSideLabel(row.side)})`)"
              class="p-4 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 text-left flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] shadow-sm"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center justify-center">
                  <img
                    v-if="row.boltSpec?.images?.length"
                    :src="row.boltSpec.images[0].url"
                    :alt="row.boltSpec.code"
                    class="w-full h-full object-cover"
                  />
                  <Wrench v-else class="w-5 h-5 text-zinc-400" aria-hidden="true" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {{ row.positionName }}
                  </p>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                    {{ formatSideLabel(row.side) }} &bull; {{ row.category }}
                  </p>
                  <p class="text-xs font-mono text-zinc-700 dark:text-zinc-300 mt-0.5 truncate">
                    {{ row.boltSpec?.code }} (M{{ Number(row.boltSpec?.diameterMm) }}×{{ Number(row.boltSpec?.lengthMm) }})
                  </p>
                </div>
              </div>

              <span class="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 font-mono text-base font-bold shrink-0">
                {{ row.quantity }}
              </span>
            </button>
          </div>
        </template>

        <!-- Sticky Bottom Action Bar -->
        <template v-if="pickData" #bottombar>
          <ActionBar>
            <template #summary>
              <strong class="text-zinc-900 dark:text-zinc-100">{{ animatedSpecTotal }} ukuran</strong>
              <span aria-hidden="true"> &bull; </span>
              <strong class="text-zinc-900 dark:text-zinc-100">{{ animatedBoltTotal }} pcs</strong>
            </template>

            <button
              type="button"
              @click="handlePrint"
              class="min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer class="w-4 h-4" aria-hidden="true" />
              <span>Cetak</span>
            </button>

            <button
              type="button"
              @click="startSession"
              :disabled="isCreatingSession || pickData.consolidatedTotals.length === 0"
              class="flex-1 sm:flex-initial min-h-[48px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              <span>{{ isCreatingSession ? 'Menyiapkan Checklist...' : 'Mulai Checklist' }}</span>
              <ArrowRight class="w-4 h-4" aria-hidden="true" />
            </button>
          </ActionBar>
        </template>
      </AppShell>
    </div>

    <!-- BOLT DETAIL SHEET (tapping any ItemCard / SlotCard opens art + specs + positions) -->
    <DetailSheet
      :open="Boolean(inspectedBolt)"
      :is-modal="true"
      :title="inspectedBolt ? inspectedBolt.code : ''"
      :eyebrow="inspectedBolt ? `M${Number(inspectedBolt.diameterMm)} × ${Number(inspectedBolt.lengthMm)} mm • ${inspectedBolt.headType || 'Baut Titanium'}` : ''"
      @close="inspectedBolt = null"
    >
      <template v-if="inspectedBolt">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <!-- Large Art / Photo -->
          <div class="aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center relative">
            <img
              v-if="inspectedBolt.images?.length"
              :src="inspectedBolt.images[0].url"
              :alt="inspectedBolt.code"
              class="w-full h-full object-cover"
            />
            <div v-else class="flex flex-col items-center justify-center text-zinc-400 p-4">
              <Nut class="w-12 h-12 mb-2" aria-hidden="true" />
              <span class="font-mono text-sm">Belum ada foto</span>
            </div>

            <span
              class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border"
              :class="getDiameterTier(inspectedBolt.diameterMm).badge"
            >
              {{ getDiameterTier(inspectedBolt.diameterMm).label }}
            </span>
          </div>

          <!-- Specs & Quantity Numbers -->
          <div class="space-y-3">
            <div class="p-3.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-between">
              <span class="text-xs font-mono uppercase">Jumlah Ambil</span>
              <span class="text-2xl font-mono font-bold">{{ inspectedBolt.totalQuantity }} pcs</span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
                <span class="text-zinc-600 dark:text-zinc-400 block">Diameter</span>
                <strong class="font-mono text-sm text-zinc-900 dark:text-zinc-100">M{{ Number(inspectedBolt.diameterMm) }}</strong>
              </div>
              <div class="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
                <span class="text-zinc-600 dark:text-zinc-400 block">Panjang</span>
                <strong class="font-mono text-sm text-zinc-900 dark:text-zinc-100">{{ Number(inspectedBolt.lengthMm) }} mm</strong>
              </div>
              <div class="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
                <span class="text-zinc-600 dark:text-zinc-400 block">Kepala</span>
                <strong class="text-sm text-zinc-900 dark:text-zinc-100">{{ inspectedBolt.headType || '-' }}</strong>
              </div>
              <div class="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
                <span class="text-zinc-600 dark:text-zinc-400 block">Warna / Bahan</span>
                <strong class="text-sm text-zinc-900 dark:text-zinc-100">{{ inspectedBolt.finish || inspectedBolt.material || '-' }}</strong>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700 text-xs">
              <span class="font-mono uppercase text-zinc-600 dark:text-zinc-400 block mb-1">Dipakai di Posisi</span>
              <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                {{ inspectedBolt.positionsSummary || 'Seluruh motor' }}
              </p>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-between gap-2.5">
          <button
            v-if="auth.isAdmin && inspectedBolt"
            type="button"
            @click="openBoltGalleryFromDetail"
            class="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Kelola Foto
          </button>
          <button
            type="button"
            @click="inspectedBolt = null"
            class="flex-1 min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </template>
    </DetailSheet>

    <!-- PHOTO GALLERY MODAL (for managing/viewing multiple photos) -->
    <PhotoGalleryModal
      v-if="galleryModal.isOpen"
      :is-open="galleryModal.isOpen"
      :category-title="galleryModal.categoryTitle"
      :item-title="galleryModal.itemTitle"
      :item-subtitle="galleryModal.itemSubtitle"
      :images="galleryModal.images"
      :can-manage="auth.isAdmin"
      :upload-endpoint="galleryModal.uploadEndpoint"
      :delete-endpoint-base="galleryModal.deleteEndpointBase"
      :primary-endpoint-base="galleryModal.primaryEndpointBase"
      :auth-headers="auth.authHeaders"
      @close="galleryModal.isOpen = false"
      @updated="onGalleryUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  Bike,
  History,
  Wrench,
  Nut,
  Printer,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { useCountUp } from '../composables/useCountUp';
import {
  formatSideLabel,
  getDiameterTier,
  getCompletenessMeta,
} from '../utils/boltTokens';
import PhotoGalleryModal from '../components/PhotoGalleryModal.vue';
import AppShell from '../components/ui/AppShell.vue';
import RosterCard from '../components/ui/RosterCard.vue';
import ItemCard from '../components/ui/ItemCard.vue';
import SlotCard from '../components/ui/SlotCard.vue';
import PresetCard from '../components/ui/PresetCard.vue';
import StatPill from '../components/ui/StatPill.vue';
import ProgressRing from '../components/ui/ProgressRing.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import DetailSheet from '../components/ui/DetailSheet.vue';
import ActionBar from '../components/ui/ActionBar.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import FilterChip from '../components/ui/FilterChip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const toast = useToast();

// View mode: 'roster' (pick motor + inspect) | 'bolts' (bolt inventory grid)
const viewMode = ref('roster');

// Roster state
const motorcycles = ref([]);
const allPackages = ref([]);
const rosterSearch = ref('');
const selectedBrand = ref('Semua');
const isLoadingRoster = ref(false);
const rosterError = ref('');
const rosterGridRef = ref(null);

// Inspect state
const inspectedMotor = ref(null);
const inspectedDetail = ref(null);
const isLoadingInspect = ref(false);
const inspectTab = ref('summary');
const selectedPackageId = ref('');

// Bolt grid state
const pickData = ref(null);
const isGenerating = ref(false);
const boltError = ref('');
const boltTab = ref('consolidated');
const boltSearch = ref('');
const selectedSizeTier = ref('ALL');
const isCreatingSession = ref(false);
const inspectedBolt = ref(null);

// Gallery modal state
const galleryModal = ref({
  isOpen: false,
  categoryTitle: '',
  itemTitle: '',
  itemSubtitle: '',
  images: [],
  uploadEndpoint: '',
  deleteEndpointBase: '',
  primaryEndpointBase: '',
});

const animatedBoltTotal = useCountUp(() => pickData.value?.summary?.totalQuantity || 0, 400);
const animatedSpecTotal = useCountUp(() => pickData.value?.summary?.distinctBoltSpecsCount || 0, 400);

// Brand faction chips with counts
const brandChips = computed(() => {
  const list = motorcycles.value;
  const countOf = (b) => list.filter((m) => (m.brand || '').toLowerCase() === b.toLowerCase()).length;
  const known = ['honda', 'yamaha', 'suzuki', 'kawasaki'];
  const others = list.filter((m) => !known.includes((m.brand || '').toLowerCase())).length;

  const chips = [
    { value: 'Semua', label: 'Semua', count: list.length },
    { value: 'Honda', label: 'Honda', count: countOf('honda') },
    { value: 'Yamaha', label: 'Yamaha', count: countOf('yamaha') },
    { value: 'Suzuki', label: 'Suzuki', count: countOf('suzuki') },
    { value: 'Kawasaki', label: 'Kawasaki', count: countOf('kawasaki') },
  ].filter((c) => c.value === 'Semua' || c.count > 0);

  if (others > 0) {
    chips.push({ value: 'Lainnya', label: 'Lainnya', count: others });
  }
  return chips;
});

const filteredMotors = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase();
  const known = ['honda', 'yamaha', 'suzuki', 'kawasaki'];
  return motorcycles.value.filter((m) => {
    if (m.isActive === false) return false;
    const brandLower = (m.brand || '').toLowerCase();
    const matchBrand =
      selectedBrand.value === 'Semua' ||
      (selectedBrand.value === 'Lainnya'
        ? !known.includes(brandLower)
        : brandLower === selectedBrand.value.toLowerCase());
    if (!matchBrand) return false;
    if (!q) return true;
    return (
      (m.displayName || '').toLowerCase().includes(q) ||
      (m.brand || '').toLowerCase().includes(q) ||
      (m.model || '').toLowerCase().includes(q) ||
      (m.variant || '').toLowerCase().includes(q) ||
      String(m.yearStart || '').includes(q)
    );
  });
});

// Inspect computed data (updates live when package changes)
const inspectYearText = computed(() => {
  const m = inspectedMotor.value;
  if (!m?.yearStart) return '';
  return m.yearEnd ? `${m.yearStart}–${m.yearEnd}` : `${m.yearStart}`;
});

const inspectRequirements = computed(() => {
  return Array.isArray(inspectedDetail.value?.requirements) ? inspectedDetail.value.requirements : [];
});

const inspectPackages = computed(() => {
  if (Array.isArray(inspectedDetail.value?.packages)) {
    return inspectedDetail.value.packages;
  }
  if (!inspectedMotor.value) return [];
  return allPackages.value.filter((p) => p.motorcycleTypeId === inspectedMotor.value.id);
});

const fullBikeBoltCount = computed(() => {
  return inspectRequirements.value.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
});

const activeInspectPackage = computed(() => {
  if (!selectedPackageId.value) return null;
  return inspectPackages.value.find((p) => p.id === selectedPackageId.value) || null;
});

const inspectBoltCount = computed(() => {
  if (activeInspectPackage.value) {
    return (activeInspectPackage.value.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  }
  return fullBikeBoltCount.value;
});

const inspectSpecCount = computed(() => {
  if (activeInspectPackage.value) {
    return new Set((activeInspectPackage.value.items || []).map((i) => i.boltSpecId)).size;
  }
  return new Set(inspectRequirements.value.map((r) => r.boltSpecId)).size;
});

const inspectCompleteness = computed(() => {
  const count = inspectedDetail.value
    ? inspectRequirements.value.length
    : inspectedMotor.value?._count?.requirements || 0;
  return getCompletenessMeta(count);
});

// Bolt grid filtering
const sizeTierChips = computed(() => {
  const items = pickData.value?.consolidatedTotals || [];
  const counts = { ALL: items.length, M6: 0, M8: 0, M10: 0, M12: 0 };
  for (const item of items) {
    const key = getDiameterTier(item.diameterMm).key;
    if (counts[key] !== undefined) counts[key]++;
    else counts.M6++;
  }
  const chips = [{ value: 'ALL', label: 'Semua Ukuran', count: counts.ALL }];
  if (counts.M6) chips.push({ value: 'M6', label: 'M5 / M6', count: counts.M6 });
  if (counts.M8) chips.push({ value: 'M8', label: 'M8', count: counts.M8 });
  if (counts.M10) chips.push({ value: 'M10', label: 'M10', count: counts.M10 });
  if (counts.M12) chips.push({ value: 'M12', label: 'M12+', count: counts.M12 });
  return chips;
});

const filteredConsolidated = computed(() => {
  const items = pickData.value?.consolidatedTotals || [];
  const q = boltSearch.value.trim().toLowerCase();
  return items.filter((item) => {
    if (selectedSizeTier.value !== 'ALL') {
      const tierKey = getDiameterTier(item.diameterMm).key;
      const normalized = tierKey === 'M5' ? 'M6' : tierKey;
      if (normalized !== selectedSizeTier.value) return false;
    }
    if (!q) return true;
    return (
      (item.code || '').toLowerCase().includes(q) ||
      (item.headType || '').toLowerCase().includes(q) ||
      (item.finish || '').toLowerCase().includes(q) ||
      (item.positionsSummary || '').toLowerCase().includes(q) ||
      `m${Number(item.diameterMm)}`.includes(q)
    );
  });
});

const filteredBreakdown = computed(() => {
  const rows = pickData.value?.positionBreakdown || [];
  const q = boltSearch.value.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    (row.positionName || '').toLowerCase().includes(q) ||
    (row.category || '').toLowerCase().includes(q) ||
    (row.boltSpec?.code || '').toLowerCase().includes(q) ||
    formatSideLabel(row.side).toLowerCase().includes(q)
  );
});

const loadRoster = async () => {
  rosterError.value = '';
  isLoadingRoster.value = true;
  try {
    const [resMotors, resPkgs] = await Promise.all([
      auth.apiFetch('/api/motorcycles'),
      auth.apiFetch('/api/packages'),
    ]);
    if (!resMotors.ok || !resPkgs.ok) {
      throw new Error('Gagal memuat daftar motor dari server.');
    }
    const motorsData = await resMotors.json();
    const pkgsData = await resPkgs.json();
    motorcycles.value = Array.isArray(motorsData) ? motorsData : [];
    allPackages.value = Array.isArray(pkgsData) ? pkgsData : [];

    // Handle deep link from PackagesView (/pick-list?motorId=X&pkgId=Y)
    const queryMotorId = route.query.motorId ? parseInt(route.query.motorId, 10) : null;
    const queryPkgId = route.query.pkgId ? parseInt(route.query.pkgId, 10) : null;
    if (queryMotorId) {
      const target = motorcycles.value.find((m) => m.id === queryMotorId);
      if (target) {
        await openInspect(target);
        if (queryPkgId) {
          selectedPackageId.value = queryPkgId;
        }
        await openBoltGrid();
      }
    }
  } catch (err) {
    console.error('Error loading roster:', err);
    rosterError.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Coba Lagi.'
      : err.message;
  } finally {
    isLoadingRoster.value = false;
  }
};

const openInspect = async (motor) => {
  inspectedMotor.value = motor;
  inspectedDetail.value = null;
  selectedPackageId.value = '';
  inspectTab.value = 'summary';
  isLoadingInspect.value = true;
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${motor.id}`);
    if (res.ok) {
      inspectedDetail.value = await res.json();
    }
  } catch (err) {
    toast.error(err.message || 'Gagal memuat detail motor.');
  } finally {
    isLoadingInspect.value = false;
  }
};

const closeInspect = () => {
  const prevId = inspectedMotor.value?.id;
  inspectedMotor.value = null;
  inspectedDetail.value = null;
  if (prevId) {
    nextTick(() => {
      const btn = rosterGridRef.value?.querySelector(`[data-motor-id="${prevId}"]`);
      btn?.focus();
    });
  }
};

const openBoltGrid = async () => {
  if (!inspectedMotor.value) return;
  viewMode.value = 'bolts';
  boltTab.value = 'consolidated';
  boltSearch.value = '';
  selectedSizeTier.value = 'ALL';
  await generatePickList();
};

const backToRoster = () => {
  viewMode.value = 'roster';
};

const generatePickList = async () => {
  if (!inspectedMotor.value) return;
  boltError.value = '';
  isGenerating.value = true;
  try {
    const res = await auth.apiFetch('/api/pick-lists/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motorcycleTypeId: inspectedMotor.value.id,
        packageId: selectedPackageId.value || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyiapkan daftar baut.');
    pickData.value = data;
  } catch (err) {
    boltError.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat memuat daftar baut.'
      : err.message;
  } finally {
    isGenerating.value = false;
  }
};

const startSession = async () => {
  if (!pickData.value || isCreatingSession.value) return;
  isCreatingSession.value = true;
  try {
    const res = await auth.apiFetch('/api/pick-lists/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motorcycleTypeId: pickData.value.motorcycle.id,
        packageId: pickData.value.package?.id || null,
        notes: `Pengambilan baut ${pickData.value.motorcycle.displayName}${pickData.value.package ? ` - ${pickData.value.package.name}` : ''}`,
        items: (pickData.value.consolidatedTotals || []).map((item) => ({
          boltSpecId: item.boltSpecId,
          quantity: item.totalQuantity,
          positionSummary: item.positionsSummary,
          checked: false,
        })),
      }),
    });
    const session = await res.json();
    if (!res.ok) throw new Error(session.error || 'Gagal memulai sesi checklist.');
    toast.success('Sesi pengambilan baut dimulai');
    router.push(`/pick-list/${session.id}`);
  } catch (err) {
    toast.error(err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa Wi-Fi lalu coba lagi.'
      : err.message);
  } finally {
    isCreatingSession.value = false;
  }
};

const openBoltDetail = (item) => {
  const spec = item.boltSpec || item;
  inspectedBolt.value = {
    ...spec,
    boltSpecId: item.boltSpecId || spec.id,
    totalQuantity: item.totalQuantity ?? item.quantity ?? 0,
    positionsSummary: item.positionsSummary || '',
    images: item.images || spec.images || [],
  };
};

const openBoltSpecSheet = (boltSpec, qty, posLabel) => {
  if (!boltSpec) return;
  inspectedBolt.value = {
    ...boltSpec,
    boltSpecId: boltSpec.id,
    totalQuantity: qty || 0,
    positionsSummary: posLabel || '',
    images: boltSpec.images || [],
  };
};

const openMotorGallery = (motor) => {
  galleryModal.value = {
    isOpen: true,
    categoryTitle: 'Foto Tipe Sepeda Motor',
    itemTitle: motor.displayName || `${motor.brand} ${motor.model}`,
    itemSubtitle: `${motor.brand} ${motor.model} ${motor.variant || ''}`,
    images: motor.images || [],
    uploadEndpoint: `/api/motorcycles/${motor.id}/images`,
    deleteEndpointBase: `/api/motorcycles/${motor.id}/images`,
    primaryEndpointBase: `/api/motorcycles/${motor.id}/images`,
  };
};

const openBoltGalleryFromDetail = () => {
  if (!inspectedBolt.value) return;
  const specId = inspectedBolt.value.boltSpecId || inspectedBolt.value.id;
  galleryModal.value = {
    isOpen: true,
    categoryTitle: 'Foto Spesifikasi Baut Titanium',
    itemTitle: inspectedBolt.value.code,
    itemSubtitle: `${inspectedBolt.value.headType || ''} M${Number(inspectedBolt.value.diameterMm)} × ${Number(inspectedBolt.value.lengthMm)}mm`,
    images: inspectedBolt.value.images || [],
    uploadEndpoint: `/api/bolt-specs/${specId}/images`,
    deleteEndpointBase: `/api/bolt-specs/${specId}/images`,
    primaryEndpointBase: `/api/bolt-specs/${specId}/images`,
  };
};

const onGalleryUpdated = (updatedImages) => {
  galleryModal.value.images = updatedImages;
  if (inspectedBolt.value && galleryModal.value.uploadEndpoint.includes('/bolt-specs/')) {
    inspectedBolt.value.images = updatedImages;
  } else if (inspectedMotor.value && galleryModal.value.uploadEndpoint.includes('/motorcycles/')) {
    inspectedMotor.value.images = updatedImages;
  }
};

const resetRosterFilters = () => {
  rosterSearch.value = '';
  selectedBrand.value = 'Semua';
};

const resetBoltFilters = () => {
  boltSearch.value = '';
  selectedSizeTier.value = 'ALL';
};

// Arrow-key navigation across roster cards
const onRosterKeyDown = (e) => {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
  if (!keys.includes(e.key)) return;
  const cards = Array.from(rosterGridRef.value?.querySelectorAll('button[data-motor-id]') || []);
  const currentIdx = cards.indexOf(document.activeElement);
  if (currentIdx === -1) return;

  e.preventDefault();
  const cols = window.innerWidth >= 1024 ? (inspectedMotor.value ? 3 : 4) : window.innerWidth >= 640 ? 3 : 2;
  let nextIdx = currentIdx;
  if (e.key === 'ArrowRight') nextIdx = Math.min(cards.length - 1, currentIdx + 1);
  if (e.key === 'ArrowLeft') nextIdx = Math.max(0, currentIdx - 1);
  if (e.key === 'ArrowDown') nextIdx = Math.min(cards.length - 1, currentIdx + cols);
  if (e.key === 'ArrowUp') nextIdx = Math.max(0, currentIdx - cols);
  cards[nextIdx]?.focus();
};

const handlePrint = () => {
  window.print();
};

onMounted(loadRoster);
</script>
