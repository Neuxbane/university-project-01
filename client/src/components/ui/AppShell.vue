<template>
  <div class="space-y-4 sm:space-y-5">
    <div v-if="$slots.topbar" class="no-print">
      <slot name="topbar" />
    </div>
    <div>
      <slot />
    </div>
    <div v-if="$slots.bottombar" class="no-print">
      <slot name="bottombar" />
    </div>
  </div>
</template>
