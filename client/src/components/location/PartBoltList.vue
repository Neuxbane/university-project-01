<template>
  <section
    :aria-labelledby="titleId"
    class="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215]"
  >
    <!-- Header: which bagian/position was tapped, totals, back to the whole motorcycle -->
    <div ref="headerRef" class="px-4 py-3 flex items-start justify-between gap-3 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20">
      <div class="min-w-0">
        <p class="text-[11px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-300">
          {{ annotation.category ? 'Rincian baut bagian' : 'Rincian baut posisi' }}
        </p>
        <h3 :id="titleId" class="text-base font-bold text-zinc-900 dark:text-zinc-100">{{ title }}</h3>
        <p class="text-xs text-zinc-600 dark:text-zinc-400">
          {{ groups.length }} posisi &bull; {{ itemCount }} barang &bull; {{ totalPcs }} pcs
        </p>
      </div>
      <button
        type="button"
        @click="$emit('close')"
        class="min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
      >
        <X class="w-4 h-4" aria-hidden="true" />
        Tutup
      </button>
    </div>

    <p v-if="groups.length === 0" class="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400">
      Belum ada baut yang tercatat di {{ annotation.category ? 'bagian' : 'posisi' }} ini.
    </p>

    <!-- One block per position, the bolts of that position under it (no inner scrolling: the page scrolls) -->
    <div v-for="group in groups" :key="group.key" class="px-4 py-3 border-b last:border-b-0 border-zinc-200 dark:border-zinc-800">
      <p class="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
        {{ group.positionName }}<span v-if="group.side"> &bull; {{ group.side }}</span>
      </p>
      <ul class="space-y-2">
        <li
          v-for="row in group.rows"
          :key="row.key"
          class="flex items-center gap-3 p-2 rounded-xl border"
          :class="row.checked
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
            : 'bg-zinc-50 dark:bg-[#18181c] border-zinc-200 dark:border-zinc-800'"
        >
          <img
            v-if="row.imageUrl"
            :src="row.imageUrl"
            :alt="row.name"
            loading="lazy"
            class="w-16 h-12 rounded-lg object-cover bg-white border border-zinc-200 dark:border-zinc-700 shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold leading-tight" :class="row.checked ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'">{{ row.name }}</p>
            <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">{{ [row.code, row.size].filter(Boolean).join(' • ') }}</p>
            <BoltFlags class="pt-0.5" :critical="row.isCritical" :check="row.needsCheck" />
          </div>
          <span class="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100 shrink-0">{{ row.quantity }}<span class="text-[11px] text-zinc-500"> pcs</span></span>
          <button
            v-if="checklist"
            type="button"
            role="checkbox"
            :aria-checked="row.checked ? 'true' : 'false'"
            :aria-label="`Centang ${row.name}`"
            :disabled="isTogglingCheck || row.checked === null"
            @click="$emit('toggle-spec-check', row.boltSpecId)"
            class="min-w-[44px] min-h-[44px] rounded-xl border-2 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-default"
            :class="row.checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-400 text-transparent'"
          >
            <Check class="w-5 h-5 stroke-[3]" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Check, X } from 'lucide-vue-next';
import { markerCovers, markerLabel } from '../../utils/annotationCallouts';
import { itemName, itemSize } from '../../utils/itemLabel';
import { formatSideLabel } from '../../utils/boltTokens';
import BoltFlags from '../ui/BoltFlags.vue';

/** Item list of the tapped marker, shown under the 3D model instead of on top of it. */
const props = defineProps({
  annotation: { type: Object, required: true },
  positionBreakdown: { type: Array, default: () => [] },
  bolts: { type: Array, default: () => [] },
  sessionItems: { type: Array, default: null },
  isTogglingCheck: { type: Boolean, default: false },
});
defineEmits(['close', 'toggle-spec-check']);

const headerRef = ref(null);
const titleId = `part-list-${Math.random().toString(36).slice(2, 8)}`;
const checklist = computed(() => Array.isArray(props.sessionItems));
const title = computed(() => markerLabel(props.annotation) || 'Posisi pasang');

const groups = computed(() => {
  const byPosition = new Map();
  for (const row of props.positionBreakdown || []) {
    if (!row.boltSpec || !markerCovers(props.annotation, { positionId: row.positionId, category: row.positionCategory })) continue;
    const key = `${row.positionId}|${row.side || 'NONE'}`;
    if (!byPosition.has(key)) {
      byPosition.set(key, {
        key,
        positionName: row.positionName,
        side: row.side && row.side !== 'NONE' ? formatSideLabel(row.side) : '',
        rows: [],
      });
    }
    const spec = row.boltSpec;
    const consolidated = (props.bolts || []).find((b) => b.boltSpecId === spec.id);
    const sessionItem = checklist.value ? props.sessionItems.find((it) => it.boltSpecId === spec.id) : null;
    byPosition.get(key).rows.push({
      key: `${key}|${spec.id}`,
      boltSpecId: spec.id,
      name: itemName(spec),
      code: spec.code,
      size: itemSize(spec),
      quantity: row.quantity,
      imageUrl: spec.images?.[0]?.url || consolidated?.images?.[0]?.url || null,
      isCritical: Boolean(row.isCritical),
      needsCheck: row.sizeStatus === 'CEK_FISIK',
      checked: sessionItem ? Boolean(sessionItem.checked) : checklist.value ? null : false,
    });
  }
  return [...byPosition.values()];
});

const itemCount = computed(() => new Set(groups.value.flatMap((g) => g.rows.map((r) => r.boltSpecId))).size);
const totalPcs = computed(() => groups.value.reduce((sum, g) => sum + g.rows.reduce((s, r) => s + Number(r.quantity || 0), 0), 0));

// lets the 3D viewer bring the list into view when a marker is tapped
defineExpose({ headerRef });
</script>
