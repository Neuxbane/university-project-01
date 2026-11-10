<template>
  <button
    @click="toggleTheme"
    type="button"
    class="min-w-[44px] min-h-[44px] p-2.5 rounded-xl inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
    :title="isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'"
    :aria-label="isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'"
  >
    <!-- Sun icon -->
    <svg
      v-if="isDark"
      class="w-5 h-5 text-zinc-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" stroke-width="2"></circle>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"></path>
    </svg>
    <!-- Moon icon -->
    <svg
      v-else
      class="w-5 h-5 text-zinc-700"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      ></path>
    </svg>
  </button>
</template>

<script setup>
import { useTheme } from '../composables/useTheme';

const { isDark, toggleTheme } = useTheme();
</script>
