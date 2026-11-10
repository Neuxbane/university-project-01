import { ref } from 'vue';

const toasts = ref([]);
let nextId = 1;

/**
 * Global lightweight toast notification store for instant workshop feedback.
 */
export function useToast() {
  function showToast({ type = 'info', message, duration = 3500 }) {
    if (!message) return null;
    const id = nextId++;
    toasts.value.push({ id, type, message });

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
    return id;
  }

  function dismissToast(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    showToast,
    dismissToast,
    success: (message, duration = 3000) => showToast({ type: 'success', message, duration }),
    error: (message, duration = 5000) => showToast({ type: 'error', message, duration }),
    info: (message, duration = 3000) => showToast({ type: 'info', message, duration }),
  };
}
