<template>
  <div class="space-y-4">
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button type="button" @click="load" class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0">Coba Lagi</button>
    </div>

    <div v-else-if="isLoading" role="status" aria-label="Memuat bundling" class="h-72 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/60 animate-pulse"></div>

    <template v-else-if="bundle">
      <StartChecklistDialog
        :open="dialogOpen"
        kind="bundling"
        :name="bundle.name"
        :summary="`${bundle.items.length} barang · ${totalPcs} pcs${bonusCount ? ` · ${bonusCount} bonus` : ''}`"
        :loading="busy"
        @confirm="startClaim"
        @cancel="dialogOpen = false"
      />

      <!-- Header -->
      <section class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-2">
        <router-link
          to="/bundling"
          class="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
        >
          <ArrowLeft class="w-3.5 h-3.5" aria-hidden="true" />
          Bundling
        </router-link>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border" :class="typeMeta.badge">{{ typeMeta.label }}</span>
              <span v-if="bundle.status === 'INACTIVE'" class="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold">Nonaktif</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{{ bundle.name }}</h1>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {{ bundle.motorcycleType?.displayName || 'Semua motor (bundling umum)' }}<span v-if="bundle.description"> &bull; {{ bundle.description }}</span>
            </p>
          </div>
          <div class="flex flex-col items-end gap-2 shrink-0">
            <p class="font-mono text-2xl font-bold" :class="bundle.price != null ? 'text-zinc-900 dark:text-zinc-100' : 'text-base text-zinc-500'">
              {{ bundle.price != null ? `Rp ${Number(bundle.price).toLocaleString('id-ID')}` : 'Harga belum diatur' }}
            </p>
            <button
              v-if="auth.can('SESSION_CHECKLIST')"
              type="button"
              @click="dialogOpen = true"
              :disabled="bundle.status !== 'ACTIVE' || busy"
              class="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ListChecks class="w-4 h-4" aria-hidden="true" />
              {{ busy ? 'Membuka...' : 'Mulai Checklist' }}
            </button>
          </div>
        </div>
      </section>

      <div>
        <!-- Contents -->
        <section aria-labelledby="isi-title" class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div>
            <h2 id="isi-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100">Isi bundling</h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ bundle.items.length }} barang &bull; {{ totalPcs }} pcs<span v-if="bonusCount"> &bull; {{ bonusCount }} bonus</span></p>
          </div>
          <ul class="space-y-2">
            <li v-for="item in sortedItems" :key="item.id" class="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c]">
              <img v-if="item.boltSpec?.images?.[0]?.url" :src="item.boltSpec.images[0].url" :alt="item.boltSpec.code" class="w-16 h-11 rounded-lg object-cover bg-white border border-zinc-200 dark:border-zinc-700 shrink-0" />
              <div v-else class="w-16 h-11 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0"><Nut class="w-5 h-5 text-zinc-500" aria-hidden="true" /></div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ itemName(item.boltSpec) }}
                  <span v-if="item.isBonus" class="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-mono font-bold align-middle">BONUS</span>
                </p>
                <p class="text-xs text-zinc-600 dark:text-zinc-400 truncate">{{ item.boltSpec?.code }}<span v-if="item.emblemNote"> &bull; {{ item.emblemNote }}</span></p>
              </div>
              <span class="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100 shrink-0">{{ item.quantity }}<span class="text-[11px] text-zinc-500"> pcs</span></span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { itemName } from '../utils/itemLabel';
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ListChecks, Nut } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { getPackageTypeMeta } from '../utils/boltTokens';
import StartChecklistDialog from '../components/ui/StartChecklistDialog.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const bundle = ref(null);
const isLoading = ref(true);
const errorMsg = ref('');
const busy = ref(false);

const typeMeta = computed(() => getPackageTypeMeta(bundle.value?.packageType));
const sortedItems = computed(() => [...(bundle.value?.items || [])].sort((a, b) => Number(a.isBonus) - Number(b.isBonus)));
const totalPcs = computed(() => (bundle.value?.items || []).reduce((sum, i) => sum + i.quantity, 0));
const bonusCount = computed(() => (bundle.value?.items || []).filter((i) => i.isBonus).length);


const load = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await auth.apiFetch(`/api/packages/${route.params.id}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal memuat bundling.');
    bundle.value = body;
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Coba Lagi.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

// Mulai Checklist: the popup asks for the buyer, then a Riwayat slot is created and opened
const dialogOpen = ref(false);
const startClaim = async (buyerName = '') => {
  busy.value = true;
  try {
    const res = await auth.apiFetch(`/api/packages/${bundle.value.id}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerName }),
    });
    const claim = await res.json();
    if (!res.ok) throw new Error(claim.error || 'Gagal membuat riwayat checklist.');
    dialogOpen.value = false;
    router.push(`/history/klaim/${claim.id}`);
  } catch (err) {
    toast.error(err.message);
  } finally {
    busy.value = false;
  }
};

onMounted(load);
</script>
