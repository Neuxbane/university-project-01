<template>
  <AppShell>
    <!-- Topbar -->
    <template #topbar>
      <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-3">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <router-link
              to="/motorcycles"
              class="min-h-[44px] px-3 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <ArrowLeft class="w-4 h-4" aria-hidden="true" />
              <span>Tipe Motor</span>
            </router-link>

            <div
              v-if="motor?.images?.length"
              class="w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 hidden sm:block"
            >
              <img :src="motor.images[0].url" :alt="motor.displayName" class="w-full h-full object-cover" />
            </div>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-base sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                  {{ motor?.displayName || 'Kelola Tipe Motor' }}
                </h1>
                <span
                  v-if="motor"
                  class="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                  :class="motor.isActive
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'"
                >
                  {{ motor.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
              <p v-if="motor" class="text-xs font-mono text-zinc-600 dark:text-zinc-400 mt-0.5">
                {{ requirements.length }} entri matriks &bull; {{ annotations.length }} titik peta &bull; {{ closeUpPhotos.length }} foto close-up
              </p>
            </div>
          </div>

          <div v-if="motor" class="flex flex-wrap items-center gap-2 shrink-0">
            <router-link
              :to="`/pick-list/${motor.id}/lokasi`"
              class="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5"
            >
              <Eye class="w-4 h-4" aria-hidden="true" />
              <span>Lihat Tampilan Staf</span>
            </router-link>

            <button
              v-if="auth.isAdmin"
              type="button"
              @click="askToggleActive"
              class="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              {{ motor.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
            </button>
          </div>
        </div>

        <!-- Page Section Tabs -->
        <div v-if="motor" class="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <SegmentedControl
            v-model="activeTab"
            :options="[
              { value: 'matrix', label: 'Matriks Baut & Lokasi', count: requirements.length },
              { value: 'closeup', label: 'Foto Close-Up Area', count: closeUpPhotos.length },
              { value: 'media', label: 'Foto Motor & Model 3D', count: (motor.images?.length || 0) + (model?.modelUrl ? 1 : 0) },
            ]"
          />
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button
        type="button"
        @click="loadAll"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
      >
        Muat Ulang
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-else-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-5" role="status">
      <div class="space-y-3">
        <SkeletonCard v-for="n in 4" :key="n" />
      </div>
      <div class="h-96 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
    </div>

    <template v-else-if="motor">
      <!-- TAB 1: MATRIKS BAUT + INTERACTIVE 3D/2D LOCATION ANNOTATOR -->
      <div v-if="activeTab === 'matrix'" class="space-y-5">
        <!-- Inline Add Requirement Form (Admin only, NO modal) -->
        <section
          v-if="auth.isAdmin"
          class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 shadow-sm"
        >
          <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-3">
            Tambah Kebutuhan Baut ke Matriks
          </p>
          <form @submit.prevent="handleAddRequirement" class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div class="sm:col-span-4">
              <label for="req-pos" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Posisi / Area Motor
              </label>
              <select
                id="req-pos"
                v-model="newReq.boltPositionId"
                required
                class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="">-- Pilih Posisi --</option>
                <option v-for="p in allPositions" :key="p.id" :value="p.id">
                  {{ p.name }} ({{ p.category }})
                </option>
              </select>
            </div>

            <div class="sm:col-span-4">
              <label for="req-spec" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Spesifikasi Baut
              </label>
              <select
                id="req-spec"
                v-model="newReq.boltSpecId"
                required
                class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="">-- Pilih Ukuran Baut --</option>
                <option v-for="s in allSpecs" :key="s.id" :value="s.id">
                  {{ s.code }} &bull; M{{ Number(s.diameterMm) }}×{{ Number(s.lengthMm) }}
                </option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label for="req-side" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Sisi
              </label>
              <select
                id="req-side"
                v-model="newReq.side"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="NONE">Netral</option>
                <option value="LEFT">Kiri</option>
                <option value="RIGHT">Kanan</option>
                <option value="FRONT">Depan</option>
                <option value="REAR">Belakang</option>
              </select>
            </div>

            <div class="sm:col-span-1">
              <label for="req-qty" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Jml
              </label>
              <input
                id="req-qty"
                v-model.number="newReq.quantity"
                type="number"
                min="1"
                max="100"
                required
                class="w-full min-h-[44px] px-2.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div class="sm:col-span-1">
              <button
                type="submit"
                :disabled="isSubmittingReq"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                {{ isSubmittingReq ? '...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </section>

        <!-- Split Workspace: Requirement Cards Left + 3D/2D Location Annotator Right -->
        <div class="grid grid-cols-1 lg:grid-cols-[1.05fr_1.15fr] gap-5 items-start">
          <!-- Left: Requirement Cards (NO Table Modal!) -->
          <section class="space-y-3" aria-label="Daftar matriks baut motor">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <SearchInput v-model="matrixSearch" placeholder="Cari posisi atau kode baut..." class="flex-1 min-w-[200px]" />
              <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {{ filteredRequirements.length }} item
              </span>
            </div>

            <EmptyState
              v-if="filteredRequirements.length === 0"
              :icon="Wrench"
              title="Matriks baut masih kosong"
              description="Tambahkan posisi dan ukuran baut melalui formulir di atas."
            />

            <div v-else class="space-y-2.5">
              <div
                v-for="req in filteredRequirements"
                :key="req.id"
                class="p-3 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div class="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center justify-center">
                    <img
                      v-if="req.boltSpec?.images?.length"
                      :src="req.boltSpec.images[0].url"
                      :alt="req.boltSpec.code"
                      class="w-full h-full object-cover"
                    />
                    <Nut v-else class="w-5 h-5 text-zinc-300" aria-hidden="true" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-mono text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {{ req.boltSpec?.code }}
                      </span>
                      <span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                        M{{ Number(req.boltSpec?.diameterMm) }}×{{ Number(req.boltSpec?.lengthMm) }}
                      </span>
                      <span class="px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-[11px] font-bold">
                        {{ req.quantity }} pcs
                      </span>
                    </div>
                    <p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                      {{ req.boltPosition?.name }}
                      <span class="font-normal text-zinc-500"> &bull; {{ sideLabel(req.side) }}</span>
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    @click="focusPositionOnMap(req.boltPositionId)"
                    title="Lihat / tandai di Peta 3D/2D"
                    class="min-h-[44px] px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin class="w-3.5 h-3.5" aria-hidden="true" />
                    <span class="hidden sm:inline">Peta</span>
                  </button>

                  <button
                    type="button"
                    @click="openCloseupForPosition(req.boltPositionId)"
                    title="Kelola Foto Close-Up Area Ini"
                    class="min-h-[44px] px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Camera class="w-3.5 h-3.5" aria-hidden="true" />
                    <span class="hidden sm:inline">Close-Up</span>
                  </button>

                  <button
                    v-if="auth.isAdmin"
                    type="button"
                    @click="confirmDeleteReq = req"
                    :aria-label="`Hapus ${req.boltSpec?.code} dari ${req.boltPosition?.name}`"
                    class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/15 cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- Right: Live 3D / 2D Location Viewer & Annotation Mode -->
          <section class="lg:sticky lg:top-6 space-y-3" aria-label="Peta lokasi 3D dan anotasi">
            <div
              v-if="auth.isAdmin"
              class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-3 flex items-center justify-between gap-2"
            >
              <span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {{ annotationMode ? 'Ketuk permukaan motor untuk menandai area posisi baut.' : 'Tandai titik area di model 3D/2D agar mekanik tahu posisinya.' }}
              </span>
              <button
                type="button"
                @click="annotationMode = !annotationMode"
                :aria-pressed="annotationMode"
                class="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                :class="annotationMode
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'"
              >
                <Crosshair class="w-4 h-4" aria-hidden="true" />
                <span>{{ annotationMode ? 'Selesai Anotasi' : 'Mode Anotasi Posisi' }}</span>
              </button>
            </div>

            <component
              :is="model?.modelUrl ? AsyncModelViewer : LocationCanvas"
              :motorcycle="motor"
              :model="model"
              :positions="locationPositions"
              :all-positions="allPositions"
              :annotations="annotations"
              :bolts="consolidatedBolts"
              :position-breakdown="positionBreakdown"
              :active-annotation="activeAnnotation"
              :selected-bolt="focusedBolt"
              :annotation-mode="annotationMode"
              :can-annotate="auth.isAdmin"
              :is-saving-annotation="isSavingAnnotation"
              :is-deleting-annotation="isDeletingAnnotation"
              @select-annotation="onSelectAnnotation"
              @clear-selection="activeAnnotation = null; focusedBolt = null"
              @create-annotation="handleCreateAnnotation"
              @update-annotation="handleUpdateAnnotation"
              @delete-annotation="handleDeleteAnnotation"
              @enable-annotation="annotationMode = true"
            />
          </section>
        </div>
      </div>

      <!-- TAB 2: FOTO CLOSE-UP AREA + MULTI-BOLT PINS -->
      <div v-else-if="activeTab === 'closeup'" class="space-y-5">
        <!-- Upload New Close-Up Photo Card -->
        <section
          v-if="auth.isAdmin"
          class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 shadow-sm space-y-3"
        >
          <div>
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Unggah Foto Close-Up Area Motor (Real Photo)
            </h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Unggah foto asli area tertentu (misal: bak CVT kiri, kaliper rem, radiator), lalu tandai beberapa jenis baut tepat di lubang-lubangnya pada 1 gambar.
            </p>
          </div>

          <form @submit.prevent="handleUploadCloseup" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div class="sm:col-span-4">
              <label for="cu-upload-pos" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Pilih Area / Posisi
              </label>
              <select
                id="cu-upload-pos"
                v-model="closeupUpload.boltPositionId"
                required
                class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="">-- Pilih Area Motor --</option>
                <optgroup v-if="locationPositions.length" label="Area pada Motor Ini">
                  <option v-for="p in locationPositions" :key="`m-${p.id}`" :value="p.id">
                    {{ p.name }}
                  </option>
                </optgroup>
                <optgroup label="Semua Area Lainnya">
                  <option v-for="p in allPositions" :key="`all-${p.id}`" :value="p.id">
                    {{ p.name }} ({{ p.category }})
                  </option>
                </optgroup>
              </select>
            </div>

            <div class="sm:col-span-3">
              <label for="cu-upload-caption" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Keterangan (Opsional)
              </label>
              <input
                id="cu-upload-caption"
                v-model="closeupUpload.caption"
                type="text"
                placeholder="Misal: Close-Up Cover CVT"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div class="sm:col-span-3">
              <label for="cu-upload-file" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                File Foto Close-Up
              </label>
              <input
                id="cu-upload-file"
                ref="closeupFileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                @change="onCloseupFileSelected"
                class="w-full min-h-[44px] px-2.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-zinc-900 file:text-white file:text-xs file:font-semibold"
              />
            </div>

            <div class="sm:col-span-2">
              <button
                type="submit"
                :disabled="isUploadingCloseup || !closeupUpload.boltPositionId || !closeupFile"
                class="w-full min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                {{ isUploadingCloseup ? 'Mengunggah...' : 'Unggah Foto' }}
              </button>
            </div>
          </form>
        </section>

        <!-- Position Filter Chips for Close-Ups -->
        <div v-if="closeUpPhotos.length > 0" class="flex flex-wrap gap-2">
          <FilterChip
            label="Semua Area"
            :count="closeUpPhotos.length"
            :active="!selectedCloseupPositionId"
            @click="selectedCloseupPositionId = null"
          />
          <FilterChip
            v-for="p in closeupPositions"
            :key="p.id"
            :label="p.name"
            :count="p.count"
            :active="selectedCloseupPositionId === p.id"
            @click="selectedCloseupPositionId = p.id"
          />
        </div>

        <CloseUpViewer
          :photos="filteredCloseups"
          :selected-photo-id="selectedCloseupPhotoId"
          :requirements="requirements"
          :all-specs="allSpecs"
          :can-annotate="auth.isAdmin"
          :is-saving-pin="isSavingPin"
          @select-photo="(p) => selectedCloseupPhotoId = p.id"
          @create-pin="handleCreateCloseupPin"
          @delete-pin="handleDeleteCloseupPin"
          @delete-photo="handleDeleteCloseupPhoto"
        />
      </div>

      <!-- TAB 3: FOTO MOTOR & MODEL 3D (.GLB) -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <!-- Inline Motorcycle Photos (NO PhotoGalleryModal!) -->
        <section class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 shadow-sm space-y-4">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Galeri Foto Motor</h2>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">
                Foto utama tampil pada kartu roster dan header motor.
              </p>
            </div>
            <span class="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-xs font-semibold">
              {{ motor.images?.length || 0 }} foto
            </span>
          </div>

          <form v-if="auth.isAdmin" @submit.prevent="handleUploadMotorImages" class="flex flex-col sm:flex-row gap-2">
            <input
              ref="motorPhotoInput"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              @change="onMotorPhotoSelected"
              class="flex-1 min-h-[44px] px-2.5 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              :disabled="isUploadingMotorPhotos || motorPhotoFiles.length === 0"
              class="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              {{ isUploadingMotorPhotos ? 'Mengunggah...' : 'Unggah Foto Motor' }}
            </button>
          </form>

          <EmptyState
            v-if="!motor.images?.length"
            :icon="ImageIcon"
            title="Belum ada foto motor"
            description="Unggah foto tampak samping agar staf mudah mengenali motor."
          />

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="img in motor.images"
              :key="img.id"
              class="rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-zinc-50 dark:bg-[#18181c] flex flex-col"
            >
              <div class="relative aspect-[4/3] bg-zinc-950">
                <img :src="img.url" :alt="img.caption || motor.displayName" class="w-full h-full object-cover" />
                <span
                  v-if="img.isPrimary"
                  class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-mono font-bold"
                >
                  Foto Utama
                </span>
              </div>
              <div class="p-2.5 flex items-center justify-between gap-2">
                <button
                  v-if="auth.isAdmin && !img.isPrimary"
                  type="button"
                  @click="setPrimaryMotorImage(img.id)"
                  class="min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-400 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Jadikan Utama
                </button>
                <span v-else class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 truncate">
                  {{ img.caption || 'Foto Motor' }}
                </span>

                <button
                  v-if="auth.isAdmin"
                  type="button"
                  @click="confirmDeleteMotorImage = img"
                  aria-label="Hapus foto motor"
                  class="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/15 cursor-pointer"
                >
                  <Trash2 class="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Inline 3D Model (.glb) Manager -->
        <ModelManagerPanel
          v-if="auth.isAdmin"
          :motorcycle-id="motor.id"
          :motorcycle-name="motor.displayName"
          :model="model"
          @uploaded="loadAll"
          @updated="(m) => model = m"
          @deleted="loadAll"
        />
      </div>
    </template>

    <!-- Confirm Delete Requirement -->
    <ConfirmDialog
      :open="Boolean(confirmDeleteReq)"
      title="Hapus baut dari matriks?"
      :message="`Baut ${confirmDeleteReq?.boltSpec?.code} (${confirmDeleteReq?.quantity} pcs) akan dihapus dari posisi ${confirmDeleteReq?.boltPosition?.name}.`"
      confirm-text="Ya, Hapus"
      :danger="true"
      @confirm="executeDeleteReq"
      @cancel="confirmDeleteReq = null"
    />

    <!-- Confirm Delete Motor Image -->
    <ConfirmDialog
      :open="Boolean(confirmDeleteMotorImage)"
      title="Hapus foto motor ini?"
      message="Foto motor akan dihapus permanen."
      confirm-text="Ya, Hapus"
      :danger="true"
      @confirm="executeDeleteMotorImage"
      @cancel="confirmDeleteMotorImage = null"
    />

    <!-- Confirm Toggle Active Status -->
    <ConfirmDialog
      :open="confirmToggleActive"
      :title="`${motor?.isActive ? 'Nonaktifkan' : 'Aktifkan'} motor ini?`"
      :message="`Motor '${motor?.displayName}' akan ${motor?.isActive ? 'disembunyikan dari roster ambil baut' : 'tampil kembali di roster ambil baut'}.`"
      :confirm-text="motor?.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'"
      :danger="Boolean(motor?.isActive)"
      @confirm="executeToggleActive"
      @cancel="confirmToggleActive = false"
    />
  </AppShell>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowLeft,
  Camera,
  Crosshair,
  Eye,
  Image as ImageIcon,
  MapPin,
  Nut,
  Trash2,
  Wrench,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { SIDE_LABELS } from '../utils/boltTokens';
import AppShell from '../components/ui/AppShell.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import FilterChip from '../components/ui/FilterChip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';
import LocationCanvas from '../components/location/LocationCanvas.vue';
import CloseUpViewer from '../components/location/CloseUpViewer.vue';
import ModelManagerPanel from '../components/location/ModelManagerPanel.vue';

const AsyncModelViewer = defineAsyncComponent(() => import('../components/location/ModelViewer.vue'));

const route = useRoute();
const auth = useAuthStore();
const toast = useToast();

const motor = ref(null);
const model = ref(null);
const requirements = ref([]);
const allPositions = ref([]);
const allSpecs = ref([]);
const locationPositions = ref([]);
const annotations = ref([]);
const consolidatedBolts = ref([]);
const positionBreakdown = ref([]);
const closeUpPhotos = ref([]);

const isLoading = ref(false);
const errorMsg = ref('');
const activeTab = ref('matrix');
const matrixSearch = ref('');

// Matrix add/delete
const newReq = ref({ boltPositionId: '', boltSpecId: '', side: 'NONE', quantity: 1 });
const isSubmittingReq = ref(false);
const confirmDeleteReq = ref(null);

// Map / 3D annotation state
const annotationMode = ref(false);
const activeAnnotation = ref(null);
const focusedBolt = ref(null);
const isSavingAnnotation = ref(false);
const isDeletingAnnotation = ref(false);

// Close-up state
const selectedCloseupPositionId = ref(null);
const selectedCloseupPhotoId = ref(null);
const closeupUpload = ref({ boltPositionId: '', caption: '' });
const closeupFile = ref(null);
const closeupFileInput = ref(null);
const isUploadingCloseup = ref(false);
const isSavingPin = ref(false);

// Motor photos state
const motorPhotoFiles = ref([]);
const motorPhotoInput = ref(null);
const isUploadingMotorPhotos = ref(false);
const confirmDeleteMotorImage = ref(null);
const confirmToggleActive = ref(false);

const sideLabel = (side) => SIDE_LABELS[side] || side || '-';

const filteredRequirements = computed(() => {
  const q = matrixSearch.value.trim().toLowerCase();
  if (!q) return requirements.value;
  return requirements.value.filter((r) =>
    (r.boltSpec?.code || '').toLowerCase().includes(q)
    || (r.boltPosition?.name || '').toLowerCase().includes(q)
    || (r.boltPosition?.category || '').toLowerCase().includes(q)
  );
});

const closeupPositions = computed(() => {
  const map = new Map();
  for (const p of closeUpPhotos.value) {
    if (!p.boltPosition) continue;
    const entry = map.get(p.boltPosition.id) || { id: p.boltPosition.id, name: p.boltPosition.name, count: 0 };
    entry.count++;
    map.set(p.boltPosition.id, entry);
  }
  return Array.from(map.values());
});

const filteredCloseups = computed(() => {
  if (!selectedCloseupPositionId.value) return closeUpPhotos.value;
  return closeUpPhotos.value.filter((c) => c.boltPositionId === selectedCloseupPositionId.value);
});

const loadAll = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  const motorId = route.params.motorId;
  try {
    const [resMotor, resMap, resReqs, resSpecs] = await Promise.all([
      auth.apiFetch(`/api/motorcycles/${motorId}`),
      auth.apiFetch(`/api/motorcycles/${motorId}/location-map`),
      auth.apiFetch(`/api/motorcycles/${motorId}/requirements`),
      auth.apiFetch('/api/bolt-specs'),
    ]);

    if (!resMotor.ok || !resMap.ok || !resReqs.ok || !resSpecs.ok) {
      throw new Error('Gagal memuat data lengkap motor.');
    }

    const [motorData, mapData, reqsData, specsData] = await Promise.all([
      resMotor.json(),
      resMap.json(),
      resReqs.json(),
      resSpecs.json(),
    ]);

    motor.value = motorData;
    model.value = mapData.model || null;
    locationPositions.value = Array.isArray(mapData.positions) ? mapData.positions : [];
    allPositions.value = Array.isArray(mapData.allPositions) ? mapData.allPositions : [];
    annotations.value = Array.isArray(mapData.annotations) ? mapData.annotations : [];
    consolidatedBolts.value = Array.isArray(mapData.bolts) ? mapData.bolts : [];
    positionBreakdown.value = Array.isArray(mapData.positionBreakdown) ? mapData.positionBreakdown : [];
    closeUpPhotos.value = Array.isArray(mapData.closeUpPhotos) ? mapData.closeUpPhotos : [];
    requirements.value = Array.isArray(reqsData) ? reqsData : [];
    allSpecs.value = Array.isArray(specsData) ? specsData : [];
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus. Periksa Wi-Fi lalu muat ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const handleAddRequirement = async () => {
  if (isSubmittingReq.value || !motor.value) return;
  isSubmittingReq.value = true;
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${motor.value.id}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq.value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menambahkan baut.');
    newReq.value = { boltPositionId: '', boltSpecId: '', side: 'NONE', quantity: 1 };
    toast.success('Baut ditambahkan ke matriks');
    await loadAll();
  } catch (err) {
    toast.error(err.message || 'Gagal menyimpan baut.');
  } finally {
    isSubmittingReq.value = false;
  }
};

const executeDeleteReq = async () => {
  if (!confirmDeleteReq.value) return;
  const id = confirmDeleteReq.value.id;
  confirmDeleteReq.value = null;
  try {
    const res = await auth.apiFetch(`/api/requirements/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus baut.');
    toast.success('Item matriks dihapus');
    await loadAll();
  } catch (err) {
    toast.error(err.message || 'Gagal menghapus item.');
  }
};

const onSelectAnnotation = (ann) => {
  activeAnnotation.value = ann;
  focusedBolt.value = consolidatedBolts.value.find(
    (b) => Array.isArray(b.positionIds) && b.positionIds.includes(ann.boltPositionId)
  ) || consolidatedBolts.value[0] || null;
};

const focusPositionOnMap = (boltPositionId) => {
  const match = annotations.value.find((a) => a.boltPositionId === boltPositionId);
  if (match) {
    onSelectAnnotation(match);
  } else {
    annotationMode.value = true;
    toast.info('Posisi ini belum ditandai. Ketuk permukaan motor di peta sebelah kanan.');
  }
};

const openCloseupForPosition = (boltPositionId) => {
  activeTab.value = 'closeup';
  closeupUpload.value.boltPositionId = boltPositionId;
  const matchPhoto = closeUpPhotos.value.find((c) => c.boltPositionId === boltPositionId);
  if (matchPhoto) {
    selectedCloseupPositionId.value = boltPositionId;
    selectedCloseupPhotoId.value = matchPhoto.id;
  } else {
    selectedCloseupPositionId.value = null;
  }
};

const handleCreateAnnotation = async (payload) => {
  if (!motor.value || isSavingAnnotation.value) return;
  isSavingAnnotation.value = true;
  try {
    const res = await auth.apiFetch('/api/position-annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motorcycleTypeId: motor.value.id,
        modelId: model.value?.id || null,
        ...payload,
      }),
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created.error || 'Gagal menandai lokasi.');
    annotations.value.push(created);
    onSelectAnnotation(created);
    toast.success('Titik lokasi disimpan');
  } catch (err) {
    toast.error(err.message || 'Gagal menyimpan titik lokasi.');
  } finally {
    isSavingAnnotation.value = false;
  }
};

const handleUpdateAnnotation = async ({ id, boltPositionId, label }) => {
  if (isSavingAnnotation.value) return;
  isSavingAnnotation.value = true;
  try {
    const res = await auth.apiFetch(`/api/position-annotations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boltPositionId, label }),
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Gagal memperbarui titik.');
    const idx = annotations.value.findIndex((a) => a.id === id);
    if (idx >= 0) annotations.value[idx] = updated;
    if (activeAnnotation.value?.id === id) onSelectAnnotation(updated);
    toast.success('Titik lokasi diperbarui');
  } catch (err) {
    toast.error(err.message || 'Gagal memperbarui titik.');
  } finally {
    isSavingAnnotation.value = false;
  }
};

const handleDeleteAnnotation = async (id) => {
  if (isDeletingAnnotation.value) return;
  isDeletingAnnotation.value = true;
  try {
    const res = await auth.apiFetch(`/api/position-annotations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus titik.');
    annotations.value = annotations.value.filter((a) => a.id !== id);
    if (activeAnnotation.value?.id === id) activeAnnotation.value = null;
    toast.success('Titik lokasi dihapus');
  } catch (err) {
    toast.error(err.message || 'Gagal menghapus titik.');
  } finally {
    isDeletingAnnotation.value = false;
  }
};

const onCloseupFileSelected = (e) => {
  closeupFile.value = e.target.files?.[0] || null;
};

const handleUploadCloseup = async () => {
  if (!motor.value || !closeupFile.value || !closeupUpload.value.boltPositionId || isUploadingCloseup.value) return;
  isUploadingCloseup.value = true;
  try {
    const fd = new FormData();
    fd.append('photo', closeupFile.value);
    fd.append('boltPositionId', String(closeupUpload.value.boltPositionId));
    if (closeupUpload.value.caption.trim()) {
      fd.append('caption', closeupUpload.value.caption.trim());
    }
    const res = await auth.apiFetch(`/api/motorcycles/${motor.value.id}/closeups`, {
      method: 'POST',
      body: fd,
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created.error || 'Gagal mengunggah foto close-up.');

    closeUpPhotos.value.unshift(created);
    selectedCloseupPositionId.value = created.boltPositionId;
    selectedCloseupPhotoId.value = created.id;
    closeupFile.value = null;
    closeupUpload.value.caption = '';
    if (closeupFileInput.value) closeupFileInput.value.value = '';
    toast.success('Foto close-up diunggah. Sekarang ketuk lubang baut untuk menandai ukurannya!');
  } catch (err) {
    toast.error(err.message || 'Gagal mengunggah foto close-up.');
  } finally {
    isUploadingCloseup.value = false;
  }
};

const handleCreateCloseupPin = async ({ photoId, boltSpecId, x, y, quantity, label }) => {
  if (isSavingPin.value) return;
  isSavingPin.value = true;
  try {
    const res = await auth.apiFetch(`/api/closeups/${photoId}/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boltSpecId, x, y, quantity, label }),
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created.error || 'Gagal menyimpan titik baut.');
    const target = closeUpPhotos.value.find((p) => p.id === photoId);
    if (target) {
      target.pins = [...(target.pins || []), created];
    }
    toast.success('Titik baut disimpan pada foto close-up');
  } catch (err) {
    toast.error(err.message || 'Gagal menyimpan titik baut.');
  } finally {
    isSavingPin.value = false;
  }
};

const handleDeleteCloseupPin = async (pinId) => {
  try {
    const res = await auth.apiFetch(`/api/closeup-pins/${pinId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus titik baut.');
    for (const p of closeUpPhotos.value) {
      p.pins = (p.pins || []).filter((pin) => pin.id !== pinId);
    }
    toast.success('Titik baut dihapus');
  } catch (err) {
    toast.error(err.message || 'Gagal menghapus titik baut.');
  }
};

const handleDeleteCloseupPhoto = async (photoId) => {
  try {
    const res = await auth.apiFetch(`/api/closeups/${photoId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus foto close-up.');
    closeUpPhotos.value = closeUpPhotos.value.filter((p) => p.id !== photoId);
    if (selectedCloseupPhotoId.value === photoId) selectedCloseupPhotoId.value = null;
    toast.success('Foto close-up dihapus');
  } catch (err) {
    toast.error(err.message || 'Gagal menghapus foto close-up.');
  }
};

const onMotorPhotoSelected = (e) => {
  motorPhotoFiles.value = Array.from(e.target.files || []);
};

const handleUploadMotorImages = async () => {
  if (!motor.value || !motorPhotoFiles.value.length || isUploadingMotorPhotos.value) return;
  isUploadingMotorPhotos.value = true;
  try {
    const fd = new FormData();
    for (const f of motorPhotoFiles.value) {
      fd.append('images', f);
    }
    const res = await auth.apiFetch(`/api/motorcycles/${motor.value.id}/images`, {
      method: 'POST',
      body: fd,
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Gagal mengunggah foto.');
    motor.value.images = updated;
    motorPhotoFiles.value = [];
    if (motorPhotoInput.value) motorPhotoInput.value.value = '';
    toast.success('Foto motor ditambahkan');
  } catch (err) {
    toast.error(err.message || 'Gagal mengunggah foto.');
  } finally {
    isUploadingMotorPhotos.value = false;
  }
};

const setPrimaryMotorImage = async (imageId) => {
  if (!motor.value) return;
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${motor.value.id}/images/${imageId}/primary`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Gagal mengatur foto utama.');
    motor.value.images = await res.json();
    toast.success('Foto utama diperbarui');
  } catch (err) {
    toast.error(err.message);
  }
};

const executeDeleteMotorImage = async () => {
  if (!confirmDeleteMotorImage.value || !motor.value) return;
  const imgId = confirmDeleteMotorImage.value.id;
  confirmDeleteMotorImage.value = null;
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${motor.value.id}/images/${imgId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus foto.');
    motor.value.images = await res.json();
    toast.success('Foto motor dihapus');
  } catch (err) {
    toast.error(err.message);
  }
};

const askToggleActive = () => {
  confirmToggleActive.value = true;
};

const executeToggleActive = async () => {
  confirmToggleActive.value = false;
  if (!motor.value) return;
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${motor.value.id}/deactivate`, { method: 'PATCH' });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Gagal mengubah status.');
    motor.value.isActive = updated.isActive;
    toast.success(`Motor ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
  } catch (err) {
    toast.error(err.message);
  }
};

onMounted(loadAll);
</script>
