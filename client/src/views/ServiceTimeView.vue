<template>
  <div class="space-y-4">
    <section class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div>
        <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Laporan</p>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">Waktu Layanan</h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Waktu persiapan baut dihitung dari tombol <em>Mulai Checklist</em> di Paket Full Bike sampai semua baut tercentang.
          Target evaluasi: minimal <strong>50% lebih cepat</strong> dari baseline (cara lama sebelum sistem).
        </p>
      </div>

      <form @submit.prevent="saveBaseline" class="flex flex-wrap items-end gap-2">
        <div>
          <label for="baseline-minutes" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Baseline (menit per motor)</label>
          <input
            id="baseline-minutes"
            v-model.number="baselineInput"
            type="number"
            min="1"
            max="600"
            step="0.5"
            required
            placeholder="mis. 20"
            class="w-40 min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <button
          type="submit"
          :disabled="isSaving"
          class="min-h-[44px] px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-ink text-sm font-semibold cursor-pointer disabled:opacity-50"
        >
          {{ isSaving ? 'Menyimpan...' : 'Simpan baseline' }}
        </button>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 basis-full">Isi dari hasil pengukuran manual sebelum aplikasi dipakai (rata-rata menit menyiapkan baut satu motor).</p>
      </form>
    </section>

    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button type="button" @click="load" class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0">Coba Lagi</button>
    </div>

    <div v-else-if="isLoading" role="status" aria-label="Memuat laporan" class="h-48 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/60 animate-pulse"></div>

    <template v-else-if="report">
      <section aria-label="Ringkasan waktu" class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div v-for="kpi in kpis" :key="kpi.label" class="p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm" :class="kpi.tone">
          <p class="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{{ kpi.label }}</p>
          <p class="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{{ kpi.value }}</p>
          <p class="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">{{ kpi.hint }}</p>
        </div>
      </section>

      <EmptyState
        v-if="!report.summary.sessions"
        :icon="Timer"
        title="Belum ada sesi yang selesai"
        description="Durasi tercatat otomatis setiap kali staf menekan Mulai Checklist di Paket Full Bike dan mencentang semua baut sampai selesai."
      />

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Rata-rata per motor" description="Rata-rata menit persiapan baut untuk tiap motor.">
          <BarList :items="motorBars" unit="menit" aria-label="Rata-rata waktu per motor" />
        </ChartCard>

        <ChartCard title="Sesi terakhir" description="20 sesi checklist terbaru yang sudah selesai.">
          <ul class="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            <li v-for="s in report.recent" :key="s.id" class="py-2 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{{ s.motorcycle.displayName }}</p>
                <p class="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  {{ formatDateTime(s.completedAt) }} &bull; {{ s.staff }} &bull; {{ s.pcs }} pcs<span v-if="s.packageName"> &bull; {{ s.packageName }}</span>
                </p>
              </div>
              <span class="font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0">{{ s.minutes }} mnt</span>
            </li>
          </ul>
        </ChartCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Timer } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { formatDateTime } from '../utils/date';
import ChartCard from '../components/charts/ChartCard.vue';
import BarList from '../components/charts/BarList.vue';
import EmptyState from '../components/ui/EmptyState.vue';

const auth = useAuthStore();
const toast = useToast();

const report = ref(null);
const isLoading = ref(true);
const errorMsg = ref('');
const baselineInput = ref(null);
const isSaving = ref(false);

const show = (n, unit = 'mnt') => (n === null || n === undefined ? '–' : `${n} ${unit}`);

const kpis = computed(() => {
  const s = report.value.summary;
  const baseline = report.value.baselineMinutes;
  const improvement = s.improvementPercent;
  const reached = improvement !== null && improvement >= s.targetPercent;
  return [
    { label: 'Sesi selesai', value: s.sessions, hint: 'checklist sampai semua tercentang' },
    { label: 'Rata-rata', value: show(s.averageMinutes), hint: `median ${show(s.medianMinutes)}, tercepat ${show(s.fastestMinutes)}` },
    { label: 'Baseline', value: show(baseline), hint: baseline ? 'cara lama, sebelum sistem' : 'isi baseline di atas' },
    {
      label: 'Lebih cepat',
      value: improvement === null ? '–' : `${improvement}%`,
      hint: improvement === null ? 'butuh baseline dan sesi selesai' : reached ? `target ≥ ${s.targetPercent}% tercapai` : `target ≥ ${s.targetPercent}% belum tercapai`,
      tone: improvement === null ? '' : reached ? '!border-emerald-400 !bg-emerald-50 dark:!bg-emerald-500/10' : '!border-amber-400 !bg-amber-50 dark:!bg-amber-500/10',
    },
  ];
});

const motorBars = computed(() =>
  report.value.byMotorcycle.map((m) => ({ label: m.label, value: m.averageMinutes, hint: `${m.sessions} sesi` }))
);

const load = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await auth.apiFetch('/api/service-time');
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal memuat laporan waktu layanan.');
    report.value = body;
    baselineInput.value = body.baselineMinutes;
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Coba Lagi.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const saveBaseline = async () => {
  isSaving.value = true;
  try {
    const res = await auth.apiFetch('/api/service-time/baseline', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: baselineInput.value }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Gagal menyimpan baseline.');
    toast.success(`Baseline ${body.baselineMinutes} menit disimpan`);
    await load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    isSaving.value = false;
  }
};

onMounted(load);
</script>
