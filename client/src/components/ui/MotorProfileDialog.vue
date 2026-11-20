<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
    @click.self="$emit('cancel')"
  >
    <form
      role="dialog"
      aria-modal="true"
      aria-labelledby="motor-profile-title"
      @submit.prevent="save"
      class="bg-white dark:bg-[#121215] rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-zinc-300 dark:border-zinc-700 space-y-4"
    >
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
          <Pencil class="w-5 h-5" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 id="motor-profile-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100">Edit Profil Paket</h2>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Nama, data motor, dan foto yang tampil di kartu Paket Full Bike dan halaman motornya.</p>
        </div>
      </div>

      <div v-if="isLoading" role="status" aria-label="Memuat profil" class="h-48 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/60 animate-pulse"></div>

      <template v-else>
        <!-- Main photo -->
        <div class="flex items-center gap-3">
          <div class="w-24 h-16 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center justify-center">
            <img v-if="previewUrl" :src="previewUrl" alt="Foto utama motor" class="w-full h-full object-cover" />
            <Bike v-else class="w-7 h-7 text-zinc-500" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <label for="profile-photo" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Ganti foto utama (opsional)</label>
            <input
              id="profile-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              @change="onPhotoSelected"
              class="w-full text-xs text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>

        <div>
          <div class="flex items-end justify-between gap-2 mb-1">
            <label for="profile-display" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400">Nama tampil</label>
            <button type="button" @click="form.displayName = autoName" class="text-[11px] font-semibold underline text-zinc-700 dark:text-zinc-300 cursor-pointer">Buat otomatis</button>
          </div>
          <input id="profile-display" v-model="form.displayName" type="text" required class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-zinc-100" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="profile-brand" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Merek</label>
            <input id="profile-brand" v-model="form.brand" type="text" required class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <label for="profile-model" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Model</label>
            <input id="profile-model" v-model="form.model" type="text" required class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <label for="profile-variant" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Varian</label>
            <input id="profile-variant" v-model="form.variant" type="text" required class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <label for="profile-year-start" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Tahun mulai</label>
            <input id="profile-year-start" v-model.number="form.yearStart" type="number" min="1980" max="2100" required class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <label for="profile-year-end" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Tahun akhir</label>
            <input id="profile-year-end" v-model.number="form.yearEnd" type="number" min="1980" max="2100" placeholder="opsional" class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100" />
          </div>
        </div>

        <div>
          <label for="profile-notes" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Catatan (opsional)</label>
          <textarea id="profile-notes" v-model="form.notes" rows="2" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"></textarea>
        </div>

        <p v-if="errorMsg" role="alert" class="text-sm font-medium text-rose-700 dark:text-rose-400">{{ errorMsg }}</p>
      </template>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          @click="$emit('cancel')"
          class="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="isSaving || isLoading"
          class="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 cursor-pointer disabled:opacity-50"
        >
          {{ isSaving ? 'Menyimpan...' : 'Simpan Profil' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { Bike, Pencil } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';

/** Edit Profil Paket: the motorcycle profile behind a Paket Full Bike slot (name, data, main photo). */
const props = defineProps({
  open: { type: Boolean, default: false },
  motorId: { type: Number, default: null },
});
const emit = defineEmits(['saved', 'cancel']);

const auth = useAuthStore();
const form = reactive({ displayName: '', brand: '', model: '', variant: '', yearStart: null, yearEnd: null, notes: '' });
const currentPhoto = ref('');
const photoFile = ref(null);
const photoPreview = ref('');
const isLoading = ref(false);
const isSaving = ref(false);
const errorMsg = ref('');

const autoName = computed(() => `${form.brand.trim()} ${form.model.trim()} ${form.variant.trim()} (${form.yearStart || ''}${form.yearEnd ? `-${form.yearEnd}` : ''})`);
const previewUrl = computed(() => photoPreview.value || currentPhoto.value);

const onPhotoSelected = (e) => {
  photoFile.value = e.target.files?.[0] || null;
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value);
  photoPreview.value = photoFile.value ? URL.createObjectURL(photoFile.value) : '';
};

const load = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  photoFile.value = null;
  photoPreview.value = '';
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${props.motorId}`);
    const m = await res.json();
    if (!res.ok) throw new Error(m.error || 'Gagal memuat profil motor.');
    Object.assign(form, {
      displayName: m.displayName || '',
      brand: m.brand || '',
      model: m.model || '',
      variant: m.variant || '',
      yearStart: m.yearStart,
      yearEnd: m.yearEnd,
      notes: m.notes || '',
    });
    currentPhoto.value = m.images?.[0]?.url || '';
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

const save = async () => {
  isSaving.value = true;
  errorMsg.value = '';
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${props.motorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, yearEnd: form.yearEnd || null }),
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Gagal menyimpan profil.');
    if (photoFile.value) {
      // a new upload becomes the main photo (roster card + motor page)
      const fd = new FormData();
      fd.append('images', photoFile.value);
      const up = await auth.apiFetch(`/api/motorcycles/${props.motorId}/images`, { method: 'POST', body: fd });
      const upBody = await up.json();
      if (!up.ok) throw new Error(upBody.error || 'Profil tersimpan, tetapi foto gagal diunggah.');
    }
    emit('saved', updated);
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    isSaving.value = false;
  }
};

watch(() => props.open, (val) => {
  if (val && props.motorId) load();
});

const onKeyDown = (e) => {
  if (props.open && e.key === 'Escape') emit('cancel');
};
onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value);
});
</script>
