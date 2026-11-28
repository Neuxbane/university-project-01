import { ref } from 'vue';

const backendHost = ref(
  typeof window !== 'undefined' && window.location.host ? window.location.host : ''
);
const isBackendOnline = ref(true);
let hasInitialized = false;

export function useSystemInfo() {
  async function checkBackend() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        isBackendOnline.value = true;
      } else {
        isBackendOnline.value = false;
      }
    } catch {
      isBackendOnline.value = false;
    }
  }

  if (!hasInitialized && typeof window !== 'undefined') {
    hasInitialized = true;
    checkBackend();
  }

  return {
    backendHost,
    isBackendOnline,
    checkBackend,
  };
}
