<template>
  <span v-if="critical || check" class="inline-flex flex-wrap gap-1">
    <span
      v-if="critical"
      title="Posisi kritis: pakai titanium Gr5 bersertifikat dan kencangkan sesuai torsi OEM"
      class="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide bg-rose-600 text-white"
    >Kritis</span>
    <span
      v-if="check"
      title="Ukuran belum dipastikan: ukur baut asli dulu sebelum memasang"
      class="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide bg-amber-400 text-amber-950"
    >Cek fisik</span>
  </span>
</template>

<script setup>
defineProps({
  critical: { type: Boolean, default: false },
  check: { type: Boolean, default: false },
});
</script>
