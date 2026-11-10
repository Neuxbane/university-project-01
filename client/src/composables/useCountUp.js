import { ref, watch, onUnmounted } from 'vue';

/**
 * Counts up a numeric value over 400ms (ease-out), respecting prefers-reduced-motion.
 */
export function useCountUp(targetGetter, durationMs = 400) {
  const displayValue = ref(Number(targetGetter()) || 0);
  let rafId = null;

  const animateTo = (endVal) => {
    const end = Number(endVal) || 0;
    if (rafId) cancelAnimationFrame(rafId);

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || durationMs <= 0) {
      displayValue.value = end;
      return;
    }

    const start = Number(displayValue.value) || 0;
    if (start === end) {
      displayValue.value = end;
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      displayValue.value = Math.round(start + (end - start) * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        displayValue.value = end;
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(step);
  };

  watch(targetGetter, (val) => animateTo(val), { immediate: true });

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });

  return displayValue;
}
