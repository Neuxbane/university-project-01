<template>
  <div class="space-y-3">
    <!-- Progress + admin arrange toggle -->
    <div class="flex flex-wrap items-center gap-2">
      <ProgressBar
        v-if="steps.length"
        class="flex-1 min-w-[180px]"
        :value="progressPercent"
        :label="`${doneCount} dari ${steps.length} posisi selesai dipasang`"
      />
      <button
        v-if="auth.can('MOTORCYCLES_MANAGE')"
        type="button"
        @click="isArranging = !isArranging"
        :aria-pressed="isArranging"
        class="min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
        :class="isArranging
          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
          : 'border-zinc-400 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'"
      >
        <ListOrdered class="w-4 h-4" aria-hidden="true" />
        {{ isArranging ? 'Selesai mengatur' : 'Atur Posisi' }}
      </button>
    </div>

    <!-- Admin: arrange the positions of this motorcycle (= the installation steps) -->
    <section v-if="isArranging" aria-labelledby="arrange-title" class="space-y-3">
      <div>
        <h3 id="arrange-title" class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Atur posisi pemasangan</h3>
        <p class="text-xs text-zinc-600 dark:text-zinc-400">
          Urutan di sini adalah urutan langkah panduan. Catatan pemasangan tampil ke montir di langkahnya.
          Posisi dan baut baru ditambah lewat <router-link :to="`/motorcycles/${motorId}`" class="underline font-semibold">Kelola Data</router-link>.
        </p>
      </div>
      <ol class="space-y-2">
        <li
          v-for="(pos, idx) in arrangeRows"
          :key="pos.id"
          class="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] flex gap-2.5"
        >
          <div class="flex flex-col items-center gap-1 shrink-0">
            <span class="w-7 text-center font-mono text-sm font-bold text-zinc-700 dark:text-zinc-300">{{ idx + 1 }}</span>
            <button type="button" :disabled="idx === 0 || isSavingArrange" @click="move(idx, -1)" :aria-label="`Naikkan ${pos.name}`" class="w-9 h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 inline-flex items-center justify-center cursor-pointer disabled:opacity-30">
              <ChevronUp class="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" :disabled="idx === arrangeRows.length - 1 || isSavingArrange" @click="move(idx, 1)" :aria-label="`Turunkan ${pos.name}`" class="w-9 h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 inline-flex items-center justify-center cursor-pointer disabled:opacity-30">
              <ChevronDown class="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div class="flex-1 min-w-0 space-y-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label class="block">
                <span class="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Nama posisi</span>
                <input v-model="pos.draftName" type="text" required class="w-full min-h-[40px] px-3 rounded-lg bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
              </label>
              <label class="block">
                <span class="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Kelompok area</span>
                <input v-model="pos.draftCategory" type="text" required class="w-full min-h-[40px] px-3 rounded-lg bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
              </label>
            </div>
            <label class="block">
              <span class="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Catatan pemasangan</span>
              <input v-model="pos.draftNotes" type="text" placeholder="Misal: lepas cover dulu, kunci 10, torsi 10 Nm" class="w-full min-h-[40px] px-3 rounded-lg bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
            </label>
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400">{{ pos.boltSummary }}</p>
              <button
                type="button"
                :disabled="!isDirty(pos) || isSavingArrange || !pos.draftName.trim()"
                @click="savePosition(pos)"
                class="min-h-[36px] px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-default shrink-0"
              >
                Simpan
              </button>
            </div>
          </div>
        </li>
      </ol>
    </section>

    <EmptyState
      v-else-if="!steps.length"
      :icon="Wrench"
      title="Belum ada data baut"
      description="Motor ini belum punya daftar baut per posisi, jadi panduan pasang belum bisa ditampilkan."
    />

    <!-- Finished -->
    <section
      v-else-if="isFinished"
      class="p-5 rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-center space-y-2"
    >
      <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
        <Check class="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 class="text-lg font-bold text-emerald-900 dark:text-emerald-300">Semua {{ steps.length }} posisi selesai dipasang</h3>
      <p class="text-sm text-emerald-800 dark:text-emerald-400/90">{{ totalPcs }} pcs baut terpasang.</p>
      <button type="button" @click="restart" class="min-h-[44px] px-5 rounded-xl border border-emerald-600 text-emerald-800 dark:text-emerald-300 text-sm font-semibold cursor-pointer">
        Ulangi dari awal
      </button>
    </section>

    <!-- Step-by-step guide -->
    <template v-else>
      <section aria-labelledby="step-title" class="p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] space-y-3">
        <div class="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          <span>Posisi {{ current + 1 }} dari {{ steps.length }}</span>
          <span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 normal-case tracking-normal font-semibold">{{ step.category }}</span>
          <span v-if="done.has(step.key)" class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 normal-case tracking-normal font-semibold">Sudah dipasang</span>
          <span v-if="step.hasMarker" class="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 normal-case tracking-normal font-semibold">Disorot di 3D</span>
        </div>
        <h3 id="step-title" class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{{ step.name }}</h3>

        <img v-if="step.closeUp" :src="step.closeUp.imageUrl" :alt="`Foto close-up ${step.name}`" class="w-full max-h-60 object-contain rounded-xl bg-zinc-950" />

        <div v-if="step.notes" class="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-200">
          <strong>Catatan pemasangan:</strong> {{ step.notes }}
        </div>
        <div v-if="step.critical" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-sm text-rose-800 dark:text-rose-300">
          <strong>Posisi kritis.</strong> Pakai titanium Gr5 bersertifikat dan kencangkan sesuai torsi OEM.
        </div>
        <div v-if="step.needsCheck" class="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-sm text-amber-900 dark:text-amber-300">
          <strong>Cek dulu.</strong> Ukuran atau jenis kepala baut di posisi ini belum dipastikan; cocokkan dengan baut asli sebelum memasang.
        </div>

        <ul class="space-y-2" aria-label="Baut di posisi ini">
          <li v-for="(row, idx) in step.rows" :key="idx" class="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c]">
            <img
              v-if="row.boltSpec.images?.[0]?.url"
              :src="row.boltSpec.images[0].url"
              :alt="row.boltSpec.code"
              class="w-16 h-11 rounded-lg object-cover bg-white border border-zinc-200 dark:border-zinc-700 shrink-0"
            />
            <div class="min-w-0 flex-1 space-y-0.5">
              <p class="text-base font-bold text-zinc-900 dark:text-zinc-100">{{ itemName(row.boltSpec) }}</p>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                <span v-if="row.side && row.side !== 'NONE'" class="font-semibold">{{ formatSideLabel(row.side) }} &bull; </span>{{ oemText(row.notes) }}
              </p>
              <BoltFlags :critical="Boolean(row.isCritical)" :check="row.sizeStatus === 'CEK_FISIK'" />
            </div>
            <span class="shrink-0 text-right">
              <span class="block font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100">{{ row.quantity }}</span>
              <span class="block text-[11px] font-mono text-zinc-500">pcs</span>
            </span>
          </li>
        </ul>

        <div class="flex gap-2">
          <button
            type="button"
            :disabled="current === 0"
            @click="go(current - 1)"
            class="min-h-[52px] px-4 rounded-xl border border-zinc-400 dark:border-zinc-700 text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            <ArrowLeft class="w-4 h-4" aria-hidden="true" />
            Sebelumnya
          </button>
          <button
            type="button"
            @click="completeStep"
            class="flex-1 min-h-[52px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Check class="w-5 h-5" aria-hidden="true" />
            {{ current === steps.length - 1 ? 'Selesai, posisi terakhir' : 'Selesai, lanjut' }}
          </button>
        </div>
      </section>

      <!-- Step list: jump to any position -->
      <nav aria-label="Urutan posisi" class="p-2 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215]">
        <p class="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Urutan posisi</p>
        <ol class="space-y-1 max-h-72 overflow-y-auto">
          <li v-for="(s, idx) in steps" :key="s.key">
            <button
              type="button"
              @click="go(idx)"
              :aria-current="idx === current ? 'step' : undefined"
              class="w-full min-h-[44px] px-2.5 py-2 rounded-lg text-left text-sm flex items-center gap-2.5 cursor-pointer"
              :class="idx === current ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'"
            >
              <span
                class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-mono font-bold border"
                :class="done.has(s.key) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-current'"
              >
                <Check v-if="done.has(s.key)" class="w-3.5 h-3.5" aria-hidden="true" />
                <span v-else>{{ idx + 1 }}</span>
              </span>
              <span class="min-w-0 flex-1 truncate">{{ s.name }}</span>
              <span v-if="s.critical" class="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Posisi kritis"></span>
            </button>
          </li>
        </ol>
      </nav>
    </template>
  </div>
</template>

<script setup>
import { itemName } from '../../utils/itemLabel';
import { ref, computed, watch, onMounted } from 'vue';
import { ArrowLeft, Check, ChevronDown, ChevronUp, ListOrdered, Wrench } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../composables/useToast';
import { formatSideLabel } from '../../utils/boltTokens';
import ProgressBar from '../ui/ProgressBar.vue';
import EmptyState from '../ui/EmptyState.vue';
import BoltFlags from '../ui/BoltFlags.vue';

/**
 * Step-by-step installation guide inside Paket Full Bike: one step per installation position, in the
 * position order of this motorcycle. Each step change is emitted so the page can highlight the position
 * on the 3D model / motorcycle photo.
 */
const props = defineProps({
  locationData: { type: Object, required: true },
  motorId: { type: Number, required: true },
  packageId: { type: Number, default: null },
  startArranging: { type: Boolean, default: false },
});
const emit = defineEmits(['step-change', 'changed']);

const auth = useAuthStore();
const toast = useToast();

const current = ref(0);
const done = ref(new Set());
const isFinished = ref(false);
const isArranging = ref(props.startArranging && auth.can('MOTORCYCLES_MANAGE'));
const arrangeRows = ref([]);
const isSavingArrange = ref(false);

// requirement notes look like "OEM: 96001-06035-07 Flange x13 · Zona: KASAR · ..."; the OEM part is what helps at the bike
const oemText = (notes) => (String(notes || '').split(' · ')[0] || '').replaceAll(' [cek fisik]', '');

const steps = computed(() => {
  const data = props.locationData;
  const byKey = new Map();
  for (const row of data.positionBreakdown || []) {
    const key = row.positionId ?? row.positionName;
    const step = byKey.get(key) || {
      key: String(key),
      positionId: row.positionId,
      name: row.positionName,
      category: row.category,
      rows: [],
      critical: false,
      needsCheck: false,
    };
    step.rows.push(row);
    step.critical ||= Boolean(row.isCritical);
    step.needsCheck ||= row.sizeStatus === 'CEK_FISIK';
    byKey.set(key, step);
  }
  const closeUps = data.closeUpPhotos || [];
  const markers = new Set((data.annotations || []).map((a) => a.boltPositionId));
  const positionsById = new Map((data.allPositions || []).map((p) => [p.id, p]));
  return [...byKey.values()].map((s) => ({
    ...s,
    closeUp: closeUps.find((c) => c.boltPositionId === s.positionId) || null,
    notes: positionsById.get(s.positionId)?.notes || '',
    hasMarker: markers.has(s.positionId),
  }));
});

const step = computed(() => steps.value[current.value] || steps.value[0]);
const doneCount = computed(() => steps.value.filter((s) => done.value.has(s.key)).length);
const progressPercent = computed(() => (steps.value.length ? Math.round((doneCount.value / steps.value.length) * 100) : 0));
const totalPcs = computed(() => steps.value.reduce((sum, s) => sum + s.rows.reduce((a, r) => a + r.quantity, 0), 0));

// Progress is a per-device convenience: it survives closing the page but is not shared
const storageKey = computed(() => `hexti-pasang-${props.motorId}-${props.packageId || 'semua'}`);
const saveProgress = () => {
  try {
    localStorage.setItem(storageKey.value, JSON.stringify({ current: current.value, done: [...done.value], finished: isFinished.value }));
  } catch {}
};
const restoreProgress = () => {
  current.value = 0;
  done.value = new Set();
  isFinished.value = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey.value) || 'null');
    if (saved) {
      done.value = new Set(saved.done || []);
      current.value = Math.min(saved.current || 0, Math.max(0, steps.value.length - 1));
      isFinished.value = Boolean(saved.finished) && doneCount.value === steps.value.length;
    }
  } catch {}
};

const announce = () => {
  if (!isFinished.value && step.value) emit('step-change', step.value);
};

const go = (idx) => {
  current.value = Math.max(0, Math.min(idx, steps.value.length - 1));
  isFinished.value = false;
  saveProgress();
  announce();
};

const completeStep = () => {
  done.value = new Set(done.value).add(step.value.key);
  const next = steps.value.findIndex((s, idx) => idx > current.value && !done.value.has(s.key));
  const firstOpen = steps.value.findIndex((s) => !done.value.has(s.key));
  if (next !== -1) go(next);
  else if (firstOpen !== -1) go(firstOpen);
  else {
    isFinished.value = true;
    saveProgress();
  }
};

const restart = () => {
  done.value = new Set();
  go(0);
};

// Positions of this motorcycle in installation order, with editable drafts
const buildArrangeRows = () => {
  const bolts = new Map();
  for (const row of props.locationData.positionBreakdown || []) {
    const entry = bolts.get(row.positionId) || { sizes: 0, pcs: 0 };
    entry.sizes += 1;
    entry.pcs += row.quantity;
    bolts.set(row.positionId, entry);
  }
  arrangeRows.value = (props.locationData.allPositions || [])
    .filter((p) => p.motorcycleTypeId === props.motorId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((p) => ({
      ...p,
      draftName: p.name,
      draftCategory: p.category,
      draftNotes: p.notes || '',
      boltSummary: bolts.has(p.id) ? `${bolts.get(p.id).sizes} ukuran baut · ${bolts.get(p.id).pcs} pcs` : 'Belum ada baut di posisi ini',
    }));
};

const isDirty = (pos) => pos.draftName.trim() !== pos.name || pos.draftCategory.trim() !== pos.category || pos.draftNotes.trim() !== (pos.notes || '');

const putPosition = async (pos, fields) => {
  const res = await auth.apiFetch(`/api/positions/${pos.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: pos.name, category: pos.category, notes: pos.notes, sortOrder: pos.sortOrder, ...fields }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Gagal menyimpan posisi.');
};

const savePosition = async (pos) => {
  isSavingArrange.value = true;
  try {
    await putPosition(pos, { name: pos.draftName.trim(), category: pos.draftCategory.trim(), notes: pos.draftNotes.trim() || null });
    toast.success(`Posisi "${pos.draftName.trim()}" disimpan`);
    emit('changed');
  } catch (err) {
    toast.error(err.message === 'Gagal memperbarui posisi baut.' ? 'Gagal menyimpan. Nama posisi mungkin sudah dipakai di motor ini.' : err.message);
  } finally {
    isSavingArrange.value = false;
  }
};

// Move a position up/down, then renumber 1..n and save only the rows whose order changed
const move = async (idx, dir) => {
  const rows = [...arrangeRows.value];
  [rows[idx], rows[idx + dir]] = [rows[idx + dir], rows[idx]];
  arrangeRows.value = rows;
  isSavingArrange.value = true;
  try {
    for (const [i, pos] of rows.entries()) {
      if (pos.sortOrder !== i + 1) await putPosition(pos, { sortOrder: i + 1 });
    }
  } catch (err) {
    toast.error(err.message);
  } finally {
    isSavingArrange.value = false;
    emit('changed');
  }
};

// The page reloads its location data after edits or a bundling switch: rebuild the editor, keep the guide's place
watch(() => props.locationData, buildArrangeRows);
watch(() => [props.motorId, props.packageId], () => {
  restoreProgress();
  announce();
});

onMounted(() => {
  restoreProgress();
  buildArrangeRows();
  announce();
});
</script>
