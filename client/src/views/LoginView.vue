<template>
  <div class="w-full max-w-sm sm:max-w-md mx-auto">
    <!-- Theme Toggle Bar (never clips on short screens) -->
    <div class="flex justify-end mb-2">
      <ThemeToggle />
    </div>

    <!-- Login Card -->
    <div
      class="w-full space-y-6 bg-white dark:bg-[#121215] p-6 sm:p-8 rounded-2xl shadow-xl border border-zinc-300 dark:border-zinc-800 transition-colors"
    >
      <!-- Brand Header -->
      <div class="text-center">
        <div
          class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold font-mono text-base tracking-tight shadow-sm"
        >
          HX
        </div>
        <h1 class="mt-4 text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Sistem Bengkel Hex Titanium
        </h1>
        <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Masuk untuk melihat daftar ukuran baut motor
        </p>
        <div
          class="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono"
          :class="isBackendOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
            : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="isBackendOnline ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'"
            aria-hidden="true"
          ></span>
          <span>
            Server {{ isBackendOnline ? 'Terhubung' : 'Terputus' }} &bull; Port <strong>{{ backendPort }}</strong>
          </span>
        </div>
      </div>

      <!-- Login Form -->
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div
          v-if="sessionExpired && !errorMessage"
          role="status"
          class="p-3.5 bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300 rounded-xl text-sm font-medium"
        >
          Sesi masuk Anda telah berakhir. Silakan masuk kembali.
        </div>

        <div
          v-if="errorMessage"
          role="alert"
          class="p-3.5 bg-rose-50 border border-rose-300 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 rounded-xl text-sm font-medium"
        >
          {{ errorMessage }}
        </div>

        <div class="space-y-4">
          <div>
            <label
              for="login-username"
              class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Nama Pengguna
            </label>
            <input
              id="login-username"
              v-model="username"
              type="text"
              required
              autofocus
              autocomplete="username"
              placeholder="Contoh: dimas"
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 transition-colors"
            />
          </div>

          <div>
            <label
              for="login-password"
              class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Kata Sandi
            </label>
            <div class="relative">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="Masukkan kata sandi"
                class="w-full min-h-[44px] pl-3.5 pr-12 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 transition-colors"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                class="absolute inset-y-0 right-0 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
              >
                <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full min-h-[48px] py-3 px-4 rounded-xl text-sm font-semibold text-white dark:text-zinc-950 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg
            v-if="isLoading"
            class="animate-spin h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span v-if="isLoading">Memproses Masuk...</span>
          <span v-else>Masuk ke Sistem</span>
        </button>
      </form>

      <!-- Footer Info inside Card -->
      <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
          Hex Titanium &bull; Server Gerai Lokal
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSystemInfo } from '../composables/useSystemInfo';
import ThemeToggle from '../components/ThemeToggle.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { backendPort, isBackendOnline } = useSystemInfo();

const sessionExpired = computed(() => route.query.expired === '1');
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);

const handleSubmit = async () => {
  errorMessage.value = '';
  isLoading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push('/pick-list');
  } catch (err) {
    errorMessage.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu coba lagi.'
      : err.message || 'Gagal masuk. Periksa nama pengguna dan kata sandi.';
  } finally {
    isLoading.value = false;
  }
};
</script>
