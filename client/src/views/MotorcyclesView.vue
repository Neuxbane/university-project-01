<template>
  <div class="space-y-6">
    <!-- Header Card -->
    <div class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Data Induk</span>
        </div>
        <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Tipe Motor &amp; Matriks Ukuran Baut
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Daftar tipe sepeda motor dan pemetaan titik baut titanium
        </p>
      </div>

      <button
        v-if="auth.isAdmin"
        @click="openAddMotorModal"
        type="button"
        class="min-h-[44px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
      >
        <span aria-hidden="true">+</span>
        <span>Tambah Tipe Motor</span>
      </button>
    </div>

    <!-- Filters & Search -->
    <div class="flex flex-col md:flex-row gap-3">
      <div class="flex-1">
        <label for="motor-search-input" class="sr-only">Cari merek, model, atau varian motor</label>
        <input
          id="motor-search-input"
          v-model="search"
          type="text"
          placeholder="Cari merek, model, atau varian motor..."
          class="w-full min-h-[44px] px-3.5 py-2.5 bg-white dark:bg-[#121215] border border-zinc-500 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 shadow-sm"
        />
      </div>
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-zinc-100 dark:bg-[#18181c] p-1 rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-x-auto max-w-full">
        <button
          v-for="b in ['Semua', 'Honda', 'Yamaha', 'Suzuki', 'Kawasaki']"
          :key="b"
          @click="selectedBrand = b"
          type="button"
          class="min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
          :class="[selectedBrand === b ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100']"
        >
          {{ b }}
        </button>
      </div>
    </div>

    <!-- Error & Loading States -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button
        @click="loadMotors"
        type="button"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Muat Ulang
      </button>
    </div>

    <!-- Roster Grid -->
    <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" role="status" aria-live="polite">
      <SkeletonCard v-for="n in 8" :key="n" />
      <span class="sr-only">Memuat daftar tipe motor...</span>
    </div>

    <EmptyState
      v-else-if="filteredMotors.length === 0"
      :icon="Bike"
      title="Motor tidak ditemukan"
      description="Tidak ada motor yang cocok dengan filter atau pencarian."
      action-label="Tampilkan Semua"
      @action="search = ''; selectedBrand = 'Semua'"
    />

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <RosterCard
        v-for="m in filteredMotors"
        :key="m.id"
        :motorcycle="m"
        @select="openMotorDetail"
      />
    </div>

    <!-- Motor Detail Sheet -->
    <DetailSheet
      :open="Boolean(selectedMotorDetail)"
      :is-modal="true"
      eyebrow="Tipe Motor"
      :title="selectedMotorDetail?.displayName || ''"
      @close="selectedMotorDetail = null"
    >
      <div v-if="selectedMotorDetail" class="space-y-4">
        <div class="aspect-[4/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
          <img
            v-if="selectedMotorDetail.images && selectedMotorDetail.images.length > 0"
            :src="selectedMotorDetail.images[0].url"
            :alt="selectedMotorDetail.displayName"
            class="w-full h-full object-cover"
          />
          <Bike v-else class="w-12 h-12 text-zinc-500" aria-hidden="true" />
        </div>

        <div class="flex flex-wrap gap-2">
          <StatPill :icon="Bike" label="Merek" :value="selectedMotorDetail.brand" />
          <StatPill :icon="Calendar" label="Tahun" :value="`${selectedMotorDetail.yearStart}${selectedMotorDetail.yearEnd ? `-${selectedMotorDetail.yearEnd}` : ''}`" />
          <StatPill :icon="Wrench" label="Titik" :value="`${selectedMotorDetail._count?.requirements || 0} baut`" />
          <StatPill :icon="CircleCheck" label="Status" :value="selectedMotorDetail.isActive ? 'Aktif' : 'Nonaktif'" />
        </div>

        <div class="grid grid-cols-1 gap-2">
          <button
            @click="openMotorGallery(selectedMotorDetail)"
            type="button"
            class="min-h-[48px] px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ImageIcon class="w-4 h-4" aria-hidden="true" />
            Kelola Foto Motor
          </button>
          <button
            @click="openRequirementsModal(selectedMotorDetail)"
            type="button"
            class="min-h-[48px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Wrench class="w-4 h-4" aria-hidden="true" />
            Buka Matriks Baut
          </button>
          <button
            v-if="auth.isAdmin"
            @click="toggleActiveStatus(selectedMotorDetail)"
            type="button"
            class="min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-400 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {{ selectedMotorDetail.isActive ? 'Nonaktifkan Motor' : 'Aktifkan Motor' }}
          </button>
        </div>
      </div>
    </DetailSheet>

    <!-- REQUIREMENTS MATRIX MODAL -->
    <div
      v-if="selectedMotorForReqs"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      @click.self="selectedMotorForReqs = null"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reqs-modal-title"
        class="bg-white dark:bg-[#121215] rounded-2xl max-w-4xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-zinc-300 dark:border-zinc-700 overflow-hidden"
      >
        <!-- Modal Header -->
        <div class="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div class="flex items-center gap-3 min-w-0">
            <button
              v-if="selectedMotorForReqs.images && selectedMotorForReqs.images.length > 0"
              @click="openMotorGallery(selectedMotorForReqs)"
              type="button"
              class="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-zinc-500 transition-all"
              title="Klik untuk melihat semua foto motor ini"
              :aria-label="`Lihat foto motor ${selectedMotorForReqs.displayName}`"
            >
              <img :src="selectedMotorForReqs.images[0].url" :alt="selectedMotorForReqs.displayName" class="w-full h-full object-cover" />
            </button>
            <div class="min-w-0">
              <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Matriks Baut</span>
              <h2 id="reqs-modal-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                {{ selectedMotorForReqs.displayName }}
              </h2>
            </div>
          </div>
          <button
            @click="selectedMotorForReqs = null"
            type="button"
            aria-label="Tutup matriks baut"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <!-- Modal Inline Error -->
        <div
          v-if="modalErrorMsg"
          role="alert"
          class="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs font-medium"
        >
          {{ modalErrorMsg }}
        </div>

        <!-- Add Requirement Form (Admin only) -->
        <div v-if="auth.isAdmin" class="p-4 bg-zinc-50 dark:bg-[#18181c] border-b border-zinc-200 dark:border-zinc-800">
          <form @submit.prevent="handleAddRequirement" class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-sm">
            <div class="sm:col-span-4">
              <label for="req-position" class="sr-only">Posisi Baut</label>
              <select
                id="req-position"
                v-model="newReq.boltPositionId"
                required
                class="w-full min-h-[44px] px-3 py-2 bg-white dark:bg-[#121215] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm"
              >
                <option value="">Pilih Posisi...</option>
                <option v-for="p in allPositions" :key="p.id" :value="p.id">
                  {{ p.name }} ({{ p.category }})
                </option>
              </select>
            </div>

            <div class="sm:col-span-4">
              <label for="req-spec" class="sr-only">Kode Baut</label>
              <select
                id="req-spec"
                v-model="newReq.boltSpecId"
                required
                class="w-full min-h-[44px] px-3 py-2 bg-white dark:bg-[#121215] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono text-sm"
              >
                <option value="">Pilih Kode Baut...</option>
                <option v-for="s in allSpecs" :key="s.id" :value="s.id">
                  {{ s.code }} (M{{ Number(s.diameterMm) }}×{{ Number(s.lengthMm) }})
                </option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label for="req-side" class="sr-only">Sisi Pemasangan</label>
              <select
                id="req-side"
                v-model="newReq.side"
                class="w-full min-h-[44px] px-3 py-2 bg-white dark:bg-[#121215] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm"
              >
                <option value="NONE">Netral</option>
                <option value="LEFT">Kiri</option>
                <option value="RIGHT">Kanan</option>
                <option value="FRONT">Depan</option>
                <option value="REAR">Belakang</option>
              </select>
            </div>

            <div class="sm:col-span-1">
              <label for="req-qty" class="sr-only">Jumlah</label>
              <input
                id="req-qty"
                v-model.number="newReq.quantity"
                type="number"
                inputmode="numeric"
                min="1"
                required
                placeholder="Jml"
                class="w-full min-h-[44px] px-2 py-2 bg-white dark:bg-[#121215] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold text-center text-sm"
              />
            </div>

            <div class="sm:col-span-1">
              <button
                type="submit"
                :disabled="isSubmittingReq"
                class="w-full min-h-[44px] py-2 px-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl text-xs cursor-pointer disabled:opacity-40"
              >
                {{ isSubmittingReq ? '...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Matrix List -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="isLoadingReqs" role="status" class="text-center py-8 text-sm text-zinc-600 dark:text-zinc-400">
            Memuat matriks ukuran baut...
          </div>

          <div v-else-if="matrixList.length === 0" class="text-center py-8 text-sm text-zinc-600 dark:text-zinc-400 font-mono">
            Belum ada ukuran baut untuk motor ini.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] uppercase">
                  <th class="py-2.5 px-3 font-medium">Area &amp; Posisi</th>
                  <th class="py-2.5 px-3 font-medium">Sisi</th>
                  <th class="py-2.5 px-3 font-medium">Kode Baut</th>
                  <th class="py-2.5 px-3 font-medium">Ukuran</th>
                  <th class="py-2.5 px-3 font-medium text-center">Jumlah</th>
                  <th v-if="auth.isAdmin" class="py-2.5 px-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                <tr v-for="req in matrixList" :key="req.id">
                  <td class="py-2.5 px-3">
                    <span class="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 mr-1.5">
                      {{ req.boltPosition.category }}
                    </span>
                    <span class="font-medium text-zinc-900 dark:text-zinc-100">{{ req.boltPosition.name }}</span>
                  </td>
                  <td class="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                    {{ sideLabel(req.side) }}
                  </td>
                  <td class="py-2.5 px-3">
                    <div class="flex items-center gap-2">
                      <div
                        v-if="req.boltSpec?.images && req.boltSpec.images.length > 0"
                        class="w-7 h-7 rounded bg-zinc-900 border border-zinc-400 dark:border-zinc-700 overflow-hidden shrink-0"
                      >
                        <img :src="req.boltSpec.images[0].url" :alt="req.boltSpec.code" class="w-full h-full object-cover" />
                      </div>
                      <span class="font-mono font-bold text-zinc-900 dark:text-zinc-100">{{ req.boltSpec.code }}</span>
                    </div>
                  </td>
                  <td class="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 font-mono whitespace-nowrap">
                    M{{ Number(req.boltSpec.diameterMm) }} × {{ Number(req.boltSpec.lengthMm) }} mm
                  </td>
                  <td class="py-2.5 px-3 text-center font-bold whitespace-nowrap">
                    {{ req.quantity }} pcs
                  </td>
                  <td v-if="auth.isAdmin" class="py-2.5 px-3 text-right">
                    <button
                      @click="handleDeleteReq(req.id)"
                      type="button"
                      class="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD MOTOR MODAL -->
    <div
      v-if="isAddMotorModalOpen"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      @click.self="isAddMotorModalOpen = false"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-motor-modal-title"
        class="bg-white dark:bg-[#121215] rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-zinc-300 dark:border-zinc-700"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 id="add-motor-modal-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Tambah Tipe Motor Baru
          </h2>
          <button
            @click="isAddMotorModalOpen = false"
            type="button"
            aria-label="Tutup form tambah motor"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div
          v-if="addMotorErrorMsg"
          role="alert"
          class="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs font-medium"
        >
          {{ addMotorErrorMsg }}
        </div>

        <form @submit.prevent="handleCreateMotor" class="space-y-3.5 text-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="motor-brand" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Merek</label>
              <select
                id="motor-brand"
                v-model="newMotor.brand"
                required
                class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
              >
                <option value="Honda">Honda</option>
                <option value="Yamaha">Yamaha</option>
                <option value="Suzuki">Suzuki</option>
                <option value="Kawasaki">Kawasaki</option>
              </select>
            </div>
            <div>
              <label for="motor-model" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Model</label>
              <input
                id="motor-model"
                v-model="newMotor.model"
                type="text"
                placeholder="Contoh: Vario, NMAX"
                required
                class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label for="motor-variant" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Varian</label>
            <input
              id="motor-variant"
              v-model="newMotor.variant"
              type="text"
              placeholder="Contoh: 160 ABS, Connected"
              required
              class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="motor-year-start" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Tahun Awal</label>
              <input
                id="motor-year-start"
                v-model.number="newMotor.yearStart"
                type="number"
                inputmode="numeric"
                min="1990"
                max="2030"
                required
                class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label for="motor-year-end" class="block text-xs font-mono uppercase text-zinc-700 dark:text-zinc-300 mb-1">Tahun Akhir</label>
              <input
                id="motor-year-end"
                v-model.number="newMotor.yearEnd"
                type="number"
                inputmode="numeric"
                min="1990"
                max="2030"
                placeholder="2026"
                class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              @click="isAddMotorModalOpen = false"
              type="button"
              class="min-h-[44px] px-4 py-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmittingMotor"
              class="min-h-[44px] px-5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl cursor-pointer disabled:opacity-40"
            >
              {{ isSubmittingMotor ? 'Menyimpan...' : 'Simpan Motor' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- PHOTO GALLERY MODAL -->
    <PhotoGalleryModal
      v-if="selectedMotorForGallery"
      :is-open="Boolean(selectedMotorForGallery)"
      category-title="Foto Tipe Sepeda Motor"
      :item-title="selectedMotorForGallery.displayName"
      :item-subtitle="`${selectedMotorForGallery.brand} • ${selectedMotorForGallery.model} (${selectedMotorForGallery.yearStart}${selectedMotorForGallery.yearEnd ? `-${selectedMotorForGallery.yearEnd}` : ''})`"
      :images="selectedMotorForGallery.images || []"
      :can-manage="auth.isAdmin"
      :upload-endpoint="`/api/motorcycles/${selectedMotorForGallery.id}/images`"
      :delete-endpoint-base="`/api/motorcycles/${selectedMotorForGallery.id}/images`"
      :primary-endpoint-base="`/api/motorcycles/${selectedMotorForGallery.id}/images`"
      :auth-headers="auth.authHeaders"
      @close="selectedMotorForGallery = null"
      @updated="onMotorGalleryUpdated"
    />

    <ConfirmDialog
      :open="confirmDialog.open"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :danger="confirmDialog.danger"
      @cancel="confirmDialog.open = false"
      @confirm="runConfirmedAction"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import PhotoGalleryModal from '../components/PhotoGalleryModal.vue';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';
import RosterCard from '../components/ui/RosterCard.vue';
import DetailSheet from '../components/ui/DetailSheet.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import StatPill from '../components/ui/StatPill.vue';
import { Bike, Calendar, CircleCheck, Image as ImageIcon, Wrench } from 'lucide-vue-next';
import { useToast } from '../composables/useToast';

const auth = useAuthStore();
const toast = useToast();
const confirmDialog = ref({
  open: false,
  title: '',
  message: '',
  confirmText: 'Ya, Lanjutkan',
  danger: false,
  action: null,
});

const askConfirm = (opts) => {
  confirmDialog.value = {
    open: true,
    title: '',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    danger: false,
    action: null,
    ...opts,
  };
};

const runConfirmedAction = async () => {
  const action = confirmDialog.value.action;
  confirmDialog.value.open = false;
  if (action) await action();
};
const motorcycles = ref([]);
const search = ref('');
const selectedBrand = ref('Semua');
const selectedMotorForGallery = ref(null);
const selectedMotorDetail = ref(null);
const isLoading = ref(false);
const errorMsg = ref('');

const sideLabels = {
  NONE: 'Netral',
  LEFT: 'Kiri',
  RIGHT: 'Kanan',
  FRONT: 'Depan',
  REAR: 'Belakang',
};
const sideLabel = (side) => sideLabels[side] || side || '-';

const openMotorDetail = (motor) => {
  selectedMotorDetail.value = motor;
};

const openMotorGallery = (motor) => {
  selectedMotorForGallery.value = motor;
};

const onMotorGalleryUpdated = (updatedImages) => {
  if (selectedMotorForGallery.value) {
    selectedMotorForGallery.value.images = updatedImages;
    const target = motorcycles.value.find((m) => m.id === selectedMotorForGallery.value.id);
    if (target) {
      target.images = updatedImages;
    }
  }
};

const selectedMotorForReqs = ref(null);
const matrixList = ref([]);
const allPositions = ref([]);
const allSpecs = ref([]);
const isLoadingReqs = ref(false);
const isSubmittingReq = ref(false);
const modalErrorMsg = ref('');

const isAddMotorModalOpen = ref(false);
const isSubmittingMotor = ref(false);
const addMotorErrorMsg = ref('');
const newMotor = ref({ brand: 'Honda', model: '', variant: '', yearStart: 2024, yearEnd: 2026 });
const newReq = ref({ boltPositionId: '', boltSpecId: '', side: 'NONE', quantity: 1 });

const filteredMotors = computed(() => {
  return motorcycles.value.filter((m) => {
    const matchBrand = selectedBrand.value === 'Semua' || m.brand.toLowerCase() === selectedBrand.value.toLowerCase();
    const q = search.value.toLowerCase();
    const matchSearch = !q || m.displayName.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q) || m.model.toLowerCase().includes(q);
    return matchBrand && matchSearch;
  });
});

const loadMotors = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const res = await auth.apiFetch('/api/motorcycles');
    if (!res.ok) throw new Error('Gagal memuat data tipe motor.');
    const data = await res.json();
    motorcycles.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const openRequirementsModal = async (motor) => {
  selectedMotorForReqs.value = motor;
  modalErrorMsg.value = '';
  isLoadingReqs.value = true;
  try {
    const [resReqs, resPos, resSpecs] = await Promise.all([
      auth.apiFetch(`/api/motorcycles/${motor.id}/requirements`),
      auth.apiFetch('/api/positions'),
      auth.apiFetch('/api/bolt-specs'),
    ]);
    if (!resReqs.ok || !resPos.ok || !resSpecs.ok) {
      throw new Error('Gagal memuat matriks baut motor.');
    }
    const reqsData = await resReqs.json();
    const posData = await resPos.json();
    const specsData = await resSpecs.json();
    matrixList.value = Array.isArray(reqsData) ? reqsData : [];
    allPositions.value = Array.isArray(posData) ? posData : [];
    allSpecs.value = Array.isArray(specsData) ? specsData : [];
  } catch (err) {
    modalErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat memuat matriks baut.'
      : err.message;
  } finally {
    isLoadingReqs.value = false;
  }
};

const handleAddRequirement = async () => {
  if (isSubmittingReq.value) return;
  modalErrorMsg.value = '';
  isSubmittingReq.value = true;
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${selectedMotorForReqs.value.id}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq.value),
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created.error || 'Gagal menambahkan ukuran baut.');

    matrixList.value.push(created);
    newReq.value = { boltPositionId: '', boltSpecId: '', side: 'NONE', quantity: 1 };
    await loadMotors();
  } catch (err) {
    modalErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat menyimpan. Coba lagi.'
      : err.message;
  } finally {
    isSubmittingReq.value = false;
  }
};

const handleDeleteReq = (id) => {
  askConfirm({
    title: 'Hapus ukuran baut ini?',
    message: 'Titik baut akan dihapus dari matriks motor ini. Tindakan ini tidak bisa dibatalkan.',
    confirmText: 'Ya, Hapus',
    danger: true,
    action: () => doDeleteReq(id),
  });
};

const doDeleteReq = async (id) => {
  modalErrorMsg.value = '';
  try {
    const res = await auth.apiFetch(`/api/requirements/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Gagal menghapus titik baut.');
    matrixList.value = matrixList.value.filter((r) => r.id !== id);
    toast.success('Titik baut berhasil dihapus.');
    await loadMotors();
  } catch (err) {
    modalErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat menghapus. Coba lagi.'
      : err.message;
  }
};

const openAddMotorModal = () => {
  addMotorErrorMsg.value = '';
  newMotor.value = { brand: 'Honda', model: '', variant: '', yearStart: 2024, yearEnd: 2026 };
  isAddMotorModalOpen.value = true;
};

const handleCreateMotor = async () => {
  if (isSubmittingMotor.value) return;
  addMotorErrorMsg.value = '';
  isSubmittingMotor.value = true;
  try {
    const res = await auth.apiFetch('/api/motorcycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMotor.value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan tipe motor.');

    isAddMotorModalOpen.value = false;
    await loadMotors();
  } catch (err) {
    addMotorErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat menyimpan motor. Coba lagi.'
      : err.message;
  } finally {
    isSubmittingMotor.value = false;
  }
};

const toggleActiveStatus = (motor) => {
  const action = motor.isActive ? 'menonaktifkan' : 'mengaktifkan';
  askConfirm({
    title: `${motor.isActive ? 'Nonaktifkan' : 'Aktifkan'} motor ini?`,
    message: `Motor "${motor.displayName}" akan ${motor.isActive ? 'disembunyikan dari roster ambil baut' : 'tampil kembali di roster ambil baut'}.`,
    confirmText: motor.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
    danger: motor.isActive,
    action: () => doToggleActiveStatus(motor),
  });
};

const doToggleActiveStatus = async (motor) => {
  errorMsg.value = '';
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${motor.id}/deactivate`, {
      method: 'PATCH',
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Gagal mengubah status motor.');
    motor.isActive = updated.isActive;
    toast.success(`Motor berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`);
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat mengubah status motor.'
      : err.message;
  }
};

const onKeyDown = (e) => {
  if (e.key === 'Escape') {
    if (isAddMotorModalOpen.value) isAddMotorModalOpen.value = false;
    else if (selectedMotorForReqs.value && !selectedMotorForGallery.value) selectedMotorForReqs.value = null;
  }
};

onMounted(() => {
  loadMotors();
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>
