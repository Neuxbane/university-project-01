<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button type="button" @click="load" class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0">Coba Lagi</button>
    </div>

    <div v-else-if="isLoading" role="status" aria-label="Memuat checklist" class="h-72 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/60 animate-pulse"></div>

    <template v-else-if="claim">
      <!-- Header -->
      <section class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
        <router-link
          to="/history"
          class="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
        >
          <ArrowLeft class="w-3.5 h-3.5" aria-hidden="true" />
          Riwayat
        </router-link>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border" :class="typeMeta.badge">{{ typeMeta.label }}</span>
              <span
                class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border"
                :class="claim.completedAt
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'"
              >
                {{ claim.completedAt ? 'LENGKAP' : 'BERJALAN' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{{ claim.package?.name || `Checklist #${claim.id}` }}</h1>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              Checklist #{{ claim.id }} &bull; dibuka {{ formatDateTime(claim.createdAt) }} oleh {{ claim.creator?.name || '–' }}
            </p>
          </div>
          <router-link
            v-if="claim.package?.id"
            :to="`/bundling/${claim.package.id}`"
            class="min-h-[40px] px-3 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 shrink-0"
          >
            <Eye class="w-4 h-4" aria-hidden="true" />
            Lihat isi bundling
          </router-link>
        </div>

        <div>
          <label for="claim-buyer" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Nama pembeli / no. nota</label>
          <input
            id="claim-buyer"
            v-model="buyerName"
            type="text"
            placeholder="Misal: Andi / INV-0231"
            :disabled="!canChecklist"
            @change="saveBuyer"
            class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
          />
          <p v-if="!canChecklist" class="text-xs font-medium text-amber-800 dark:text-amber-300">Hanya lihat: peran Anda belum diberi akses mencentang checklist.</p>
        </div>

        <ProgressBar :value="progress" :label="`${claimedCount} dari ${claim.items.length} barang sudah dicentang`" />
      </section>

      <!-- Checklist -->
      <section aria-labelledby="klaim-items" class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div>
          <h2 id="klaim-items" class="text-base font-bold text-zinc-900 dark:text-zinc-100">Checklist barang</h2>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">
            Centang barang yang sudah diterima atau dipasang. Kalau baru sebagian, biarkan sisanya; checklist ini tetap tersimpan di Riwayat untuk dilanjutkan nanti.
          </p>
        </div>
        <ul class="space-y-2">
          <li v-for="item in claim.items" :key="item.id">
            <button
              type="button"
              role="checkbox"
              :aria-checked="item.claimed ? 'true' : 'false'"
              :disabled="busy || !canChecklist"
              @click="toggleItem(item)"
              class="w-full min-h-[64px] px-3 py-2 rounded-xl border-2 text-left flex items-center gap-3 cursor-pointer transition-colors disabled:cursor-wait"
              :class="item.claimed ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40' : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-700'"
            >
              <span class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center border-2" :class="item.claimed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-400'">
                <Check v-if="item.claimed" class="w-4 h-4" aria-hidden="true" />
              </span>
              <img v-if="item.boltSpec?.images?.[0]?.url" :src="item.boltSpec.images[0].url" :alt="item.boltSpec.code" class="w-14 h-10 rounded-lg object-cover bg-white border border-zinc-200 dark:border-zinc-700 shrink-0" />
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-bold truncate" :class="item.claimed ? 'line-through text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'">
                  {{ itemLabel(item.boltSpec) }}
                  <span v-if="item.isBonus" class="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-mono font-bold no-underline align-middle">BONUS</span>
                </span>
                <span class="block text-xs text-zinc-600 dark:text-zinc-400">{{ item.claimed ? `Dicentang ${formatDateTime(item.claimedAt)}` : 'Belum dicentang' }}</span>
              </span>
              <span class="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100 shrink-0">{{ item.quantity }}<span class="text-[11px] text-zinc-500"> pcs</span></span>
            </button>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, Check, Eye } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { getPackageTypeMeta } from '../utils/boltTokens';
import { formatLength } from '../utils/boltSize';
import { formatDateTime } from '../utils/date';
import ProgressBar from '../components/ui/ProgressBar.vue';

const route = useRoute();
const auth = useAuthStore();
const toast = useToast();

const claim = ref(null);
const buyerName = ref('');
const isLoading = ref(true);
const errorMsg = ref('');
const busy = ref(false);

// ticking and the buyer name follow the role's "Mulai & centang checklist" access
const canChecklist = computed(() => auth.can('SESSION_CHECKLIST'));
const typeMeta = computed(() => getPackageTypeMeta(claim.value?.package?.packageType));
const claimedCount = computed(() => (claim.value?.items || []).filter((i) => i.claimed).length);
const progress = computed(() => (claim.value?.items.length ? Math.round((claimedCount.value / claim.value.items.length) * 100) : 0));

// bolts/nuts by size, emblems by name
const itemLabel = (spec) => {
  if (!spec) return '–';
  if (spec.itemType && spec.itemType !== 'BAUT') return spec.name || spec.code;
  return Number(spec.lengthMm) > 0 ? `Baut M${Number(spec.diameterMm)} × ${formatLength(spec.lengthMm)}` : `${spec.headType} M${Number(spec.diameterMm)}`;
};

const load = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await auth.apiFetch(`/api/bundle-claims/${route.params.id}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal memuat checklist.');
    claim.value = body;
    buyerName.value = body.buyerName || '';
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Coba Lagi.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const saveBuyer = async () => {
  try {
    const res = await auth.apiFetch(`/api/bundle-claims/${claim.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerName: buyerName.value }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal menyimpan nama pembeli.');
    claim.value.buyerName = body.buyerName;
    toast.success('Nama pembeli disimpan');
  } catch (err) {
    toast.error(err.message);
  }
};

const toggleItem = async (item) => {
  busy.value = true;
  const wasComplete = Boolean(claim.value.completedAt);
  try {
    const res = await auth.apiFetch(`/api/bundle-claims/${claim.value.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimed: !item.claimed }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal menyimpan checklist.');
    claim.value = { ...claim.value, items: body.items, completedAt: body.completedAt };
    if (body.completedAt && !wasComplete) toast.success('Semua barang sudah dicentang.');
  } catch (err) {
    toast.error(err.message);
  } finally {
    busy.value = false;
  }
};

onMounted(load);
</script>
