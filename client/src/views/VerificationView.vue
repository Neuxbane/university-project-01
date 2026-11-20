<template>
  <div class="space-y-4">
    <section class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Basis Data Baut</p>
      <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">Verifikasi Full Bike</h1>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
        Ukuran di bawah ini diturunkan dari kode part, belum diukur langsung. Ukur baut asli di motor, lalu tandai benar atau ubah ukurannya.
      </p>
      <div v-if="data" class="flex flex-wrap gap-2 mt-3">
        <StatPill :icon="Ruler" label="Perlu cek fisik" :value="`${data.totalToCheck} baris`" />
        <StatPill :icon="Bike" label="Motor tanpa data baut" :value="`${data.motorsWithoutData.length} motor`" />
      </div>
    </section>

    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button type="button" @click="load" class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0">Coba Lagi</button>
    </div>

    <div v-else-if="isLoading" role="status" aria-label="Memuat verifikasi" class="h-64 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/60 animate-pulse"></div>

    <template v-else-if="data">
      <EmptyState
        v-if="!data.groups.length"
        :icon="CircleCheck"
        title="Semua ukuran sudah dicek"
        description="Tidak ada baris kebutuhan baut yang menunggu cek fisik."
      />

      <section
        v-for="group in data.groups"
        :key="group.motorcycle.id"
        class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
      >
        <header class="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div class="min-w-0">
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{{ group.motorcycle.displayName }}</h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ group.rows.length }} baris perlu cek fisik</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <router-link
              :to="`/motorcycles/${group.motorcycle.id}`"
              class="min-h-[40px] px-3 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5"
            >
              <Wrench class="w-4 h-4" aria-hidden="true" />
              Ubah di Kelola Data
            </router-link>
            <button
              type="button"
              :disabled="busy"
              @click="verify(group.rows.map((r) => r.id), `${group.rows.length} baris ${group.motorcycle.displayName}`)"
              class="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCheck class="w-4 h-4" aria-hidden="true" />
              Tandai semua benar
            </button>
          </div>
        </header>

        <ul class="divide-y divide-zinc-200 dark:divide-zinc-800">
          <li v-for="row in group.rows" :key="row.id" class="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 sm:px-4">
            <img
              v-if="row.boltSpec.images?.[0]?.url"
              :src="row.boltSpec.images[0].url"
              :alt="row.boltSpec.code"
              class="w-16 h-11 rounded-lg object-cover bg-white border border-zinc-200 dark:border-zinc-700 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <span class="font-mono">{{ sizeText(row.boltSpec) }}</span> &times; {{ row.quantity }} pcs
                <BoltFlags class="ml-1 align-middle" :critical="row.isCritical" />
              </p>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 truncate">{{ row.position.name }} &bull; {{ oemText(row.notes) }}</p>
            </div>
            <button
              type="button"
              :disabled="busy"
              @click="verify([row.id], `${sizeText(row.boltSpec)} di ${row.position.name}`)"
              class="min-h-[44px] px-3.5 rounded-xl border border-emerald-600 text-emerald-800 dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50 shrink-0"
            >
              <Check class="w-4 h-4" aria-hidden="true" />
              Ukuran benar
            </button>
          </li>
        </ul>
      </section>

      <section
        v-if="data.motorsWithoutData.length"
        class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3"
      >
        <div>
          <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Motor belum punya data baut</h2>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">Isi matriks bautnya di Kelola Data supaya bisa dipakai di Paket Full Bike.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <router-link
            v-for="m in data.motorsWithoutData"
            :key="m.id"
            :to="`/motorcycles/${m.id}`"
            class="min-h-[40px] px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-zinc-500 inline-flex items-center"
          >
            {{ m.displayName }}
          </router-link>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Bike, Check, CheckCheck, CircleCheck, Ruler, Wrench } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { formatLength } from '../utils/boltSize';
import StatPill from '../components/ui/StatPill.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import BoltFlags from '../components/ui/BoltFlags.vue';

const auth = useAuthStore();
const toast = useToast();

const data = ref(null);
const isLoading = ref(true);
const errorMsg = ref('');
const busy = ref(false);

const sizeText = (spec) => (Number(spec.lengthMm) > 0 ? `M${Number(spec.diameterMm)} × ${formatLength(spec.lengthMm)}` : `${spec.headType} M${Number(spec.diameterMm)}`);
const oemText = (notes) => (String(notes || '').split(' · ')[0] || '').replaceAll(' [cek fisik]', '');

const load = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await auth.apiFetch('/api/verification');
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal memuat daftar verifikasi.');
    data.value = body;
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Coba Lagi.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const verify = async (ids, label) => {
  if (busy.value) return;
  busy.value = true;
  try {
    const res = await auth.apiFetch('/api/verification', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, sizeStatus: 'VERIFIED' }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal menyimpan verifikasi.');
    toast.success(`Ukuran ${label} ditandai sudah dicek`);
    // drop verified rows locally so the list stays where the admin is working
    const done = new Set(ids);
    data.value.groups = data.value.groups
      .map((g) => ({ ...g, rows: g.rows.filter((r) => !done.has(r.id)) }))
      .filter((g) => g.rows.length);
    data.value.totalToCheck -= body.updated;
  } catch (err) {
    toast.error(err.message);
  } finally {
    busy.value = false;
  }
};

onMounted(load);
</script>
