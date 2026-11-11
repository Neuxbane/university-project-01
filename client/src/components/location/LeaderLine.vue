<template>
  <svg
    class="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
    aria-hidden="true"
  >
    <!-- Soft outer glow/contrast casing -->
    <line
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
      stroke="rgba(0,0,0,0.55)"
      stroke-width="4"
      stroke-linecap="round"
    />
    <!-- Crisp inner line -->
    <line
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
      stroke="#fbbf24"
      stroke-width="2"
      stroke-linecap="round"
    />
    <!-- Anchor dot at card end -->
    <circle :cx="x2" :cy="y2" r="4" fill="#fbbf24" stroke="#18181b" stroke-width="1.5" />
  </svg>
</template>

<script setup>
defineProps({
  x1: { type: [Number, String], required: true },
  y1: { type: [Number, String], required: true },
  x2: { type: [Number, String], required: true },
  y2: { type: [Number, String], required: true },
});
</script>
