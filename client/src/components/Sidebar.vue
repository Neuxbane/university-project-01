<template>
  <div>
    <!-- Mobile Top Header (Android & Smartphone view) -->
    <header class="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 min-h-[56px] pt-[env(safe-area-inset-top)] px-3 flex items-center justify-between no-print">
      <div class="flex items-center gap-1.5 min-w-0">
        <button
          v-if="auth.isAuthenticated"
          ref="menuBtnRef"
          @click="openDrawer"
          type="button"
          class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer shrink-0"
          aria-label="Buka Menu Navigasi"
          :aria-expanded="isMobileOpen"
          aria-controls="app-sidebar"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        <router-link to="/pick-list" class="min-h-[44px] px-1.5 flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-[11px] shrink-0">
            HX
          </div>
          <span class="font-bold text-xs tracking-wider uppercase text-zinc-900 dark:text-zinc-100 truncate">
            HEX TITANIUM
          </span>
        </router-link>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <div
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono"
          :class="isBackendOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
            : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'"
        >
          <span class="w-2 h-2 rounded-full shrink-0" :class="isBackendOnline ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'" aria-hidden="true"></span>
          <span>{{ isBackendOnline ? 'Aktif' : 'Terputus' }}</span>
        </div>
        <ThemeToggle />
      </div>
    </header>

    <!-- Mobile Drawer Backdrop Overlay (Android view) -->
    <div
      v-if="isMobileOpen"
      @click="closeDrawer"
      class="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
      aria-hidden="true"
    ></div>

    <!-- Sidebar Container (Desktop: fixed sticky sidebar | Mobile: slide-over drawer) -->
    <aside
      id="app-sidebar"
      ref="sidebarRef"
      :role="!isDesktop && isMobileOpen ? 'dialog' : undefined"
      :aria-modal="!isDesktop && isMobileOpen ? 'true' : undefined"
      aria-label="Menu Utama"
      :aria-hidden="!isDesktop && !isMobileOpen ? 'true' : undefined"
      :inert="!isDesktop && !isMobileOpen"
      class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:w-64 bg-white dark:bg-[#121215] border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-30 md:h-dvh md:sticky md:top-0 no-print"
      :class="[isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0']"
    >
      <!-- Top Branding & Navigation -->
      <div class="p-4 flex-1 overflow-y-auto">
        <!-- Logo & Close button on Mobile -->
        <div class="flex items-center justify-between pb-4 mb-3 border-b border-zinc-200 dark:border-zinc-800">
          <router-link to="/pick-list" class="flex items-center gap-2.5 min-h-[44px]">
            <div class="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-xs tracking-tighter shadow-sm shrink-0">
              HX
            </div>
            <div>
              <span class="font-bold text-xs tracking-wider uppercase text-zinc-900 dark:text-zinc-100 block leading-tight">
                HEX TITANIUM
              </span>
              <div class="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                <span>SISTEM GERAI</span>
                <span aria-hidden="true">&bull;</span>
                <span class="inline-flex items-center gap-1" :class="isBackendOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'">
                  <span class="w-1.5 h-1.5 rounded-full" :class="isBackendOnline ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'" aria-hidden="true"></span>
                  <span>{{ isBackendOnline ? 'Terhubung' : 'Terputus' }}</span>
                </span>
              </div>
            </div>
          </router-link>

          <!-- Mobile Close Button -->
          <button
            ref="closeBtnRef"
            @click="closeDrawer"
            type="button"
            aria-label="Tutup Menu Navigasi"
            class="md:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Navigation Links -->
        <nav v-if="auth.isAuthenticated" class="space-y-1.5" aria-label="Navigasi Halaman">
          <router-link
            to="/pick-list"
            class="min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path.startsWith('/pick-list') ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-sm' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
            <span>Ambil Baut</span>
          </router-link>

          <router-link
            to="/dashboard"
            class="min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path === '/dashboard' ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-sm' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
            <span>Ringkasan</span>
          </router-link>

          <router-link
            to="/history"
            class="min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path === '/history' ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-sm' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Riwayat</span>
          </router-link>

          <router-link
            to="/motorcycles"
            class="min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path.startsWith('/motorcycles') ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-sm' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <span>Tipe Motor</span>
          </router-link>

          <router-link
            to="/bolt-specs"
            class="min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path === '/bolt-specs' ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-sm' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <circle cx="12" cy="12" r="3" stroke-width="2"></circle>
            </svg>
            <span>Master Baut</span>
          </router-link>

          <router-link
            to="/packages"
            class="min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path === '/packages' ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-sm' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
            <span>Paket</span>
          </router-link>

          <router-link
            v-if="auth.isAdmin"
            to="/admin/import"
            class="min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path.startsWith('/admin') ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-sm' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
            <span>Kelola Sistem</span>
          </router-link>

          <router-link
            to="/help/manual"
            class="min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="[$route.path === '/help/manual' ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-sm' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            <span>Buku Panduan</span>
          </router-link>
        </nav>
      </div>

      <!-- Bottom User Profile & Controls -->
      <div v-if="auth.isAuthenticated" class="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0e0e11]">
        <div class="flex items-center justify-between mb-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500 shrink-0" aria-hidden="true"></span>
            <div class="min-w-0">
              <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {{ auth.user?.name }}
              </p>
              <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 uppercase">
                {{ auth.user?.role }}
              </p>
            </div>
          </div>

          <ThemeToggle />
        </div>

        <div class="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800/80 mb-2">
          <span>Server Lokal</span>
          <span class="inline-flex items-center gap-1.5 font-semibold" :class="isBackendOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'">
            <span class="w-2 h-2 rounded-full" :class="isBackendOnline ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'" aria-hidden="true"></span>
            <span>{{ isBackendOnline ? 'Aktif' : 'Terputus' }} (:{{ backendPort }})</span>
          </span>
        </div>

        <button
          @click="handleLogout"
          type="button"
          class="w-full min-h-[44px] py-2.5 px-3 text-sm font-medium text-zinc-700 hover:text-rose-700 dark:text-zinc-300 dark:hover:text-rose-400 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          <span>Keluar Akun</span>
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSystemInfo } from '../composables/useSystemInfo';
import ThemeToggle from './ThemeToggle.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const isMobileOpen = ref(false);
const isDesktop = ref(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
const menuBtnRef = ref(null);
const closeBtnRef = ref(null);
const { backendPort, isBackendOnline } = useSystemInfo();

const updateViewport = () => {
  isDesktop.value = window.innerWidth >= 768;
  if (isDesktop.value && isMobileOpen.value) {
    isMobileOpen.value = false;
  }
};

const openDrawer = async () => {
  isMobileOpen.value = true;
  await nextTick();
  closeBtnRef.value?.focus();
};

const closeDrawer = async () => {
  isMobileOpen.value = false;
  await nextTick();
  menuBtnRef.value?.focus();
};

const onKeyDown = (e) => {
  if (e.key === 'Escape' && isMobileOpen.value) {
    closeDrawer();
  }
};

watch(isMobileOpen, (open) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : '';
  }
});

watch(
  () => route.fullPath,
  () => {
    if (isMobileOpen.value) {
      isMobileOpen.value = false;
    }
  }
);

onMounted(() => {
  updateViewport();
  window.addEventListener('resize', updateViewport);
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport);
  window.removeEventListener('keydown', onKeyDown);
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});

const handleLogout = () => {
  isMobileOpen.value = false;
  auth.logout();
  router.push('/login');
};
</script>
