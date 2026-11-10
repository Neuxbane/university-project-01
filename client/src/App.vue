<template>
  <div class="min-h-dvh flex flex-col md:flex-row bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors duration-150">
    <!-- Skip link for keyboard navigation -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-zinc-900 focus:text-white dark:focus:bg-zinc-100 dark:focus:text-zinc-900 focus:text-sm focus:font-semibold focus:shadow-lg no-print"
    >
      Langsung ke konten utama
    </a>

    <!-- Global Toast Stack -->
    <ToastContainer />

    <!-- Clean Minimalist Sidebar with Android mobile drawer support - only when authenticated & not login -->
    <Sidebar v-if="showSidebar" />

    <!-- Main Content Area -->
    <div
      class="flex-1 flex flex-col min-w-0"
      :class="[showSidebar ? '' : 'justify-center items-center min-h-dvh']"
    >
      <main
        id="main-content"
        tabindex="-1"
        :class="[
          showSidebar
            ? 'flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 focus:outline-none'
            : 'w-full flex-1 flex items-center justify-center p-4 focus:outline-none'
        ]"
      >
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- Footer (only shown inside main app shell) -->
      <footer
        v-if="showSidebar"
        class="border-t border-zinc-200/80 dark:border-zinc-800 py-5 text-center text-xs text-zinc-600 dark:text-zinc-400 no-print"
      >
        <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p class="font-medium">
            Hex Titanium &bull; Banguntapan, Bantul, Yogyakarta
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            <span>Operasional Gerai Lokal</span>
            <span aria-hidden="true">&bull;</span>
            <span class="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <span
                class="w-2 h-2 rounded-full shrink-0"
                :class="isBackendOnline ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'"
                aria-hidden="true"
              ></span>
              <span>
                Server {{ isBackendOnline ? 'Terhubung' : 'Terputus' }} (Port <strong class="font-bold text-zinc-900 dark:text-zinc-100">{{ backendPort }}</strong>)
              </span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './components/Sidebar.vue';
import ToastContainer from './components/ui/ToastContainer.vue';
import { useTheme } from './composables/useTheme';
import { useSystemInfo } from './composables/useSystemInfo';
import { useAuthStore } from './stores/auth';

const route = useRoute();
const auth = useAuthStore();
const { initTheme } = useTheme();
const { backendPort, isBackendOnline } = useSystemInfo();

const showSidebar = computed(() => {
  return auth.isAuthenticated && route.name !== 'login';
});

onMounted(() => {
  initTheme();
});
</script>
