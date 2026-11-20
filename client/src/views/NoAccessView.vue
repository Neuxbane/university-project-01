<template>
  <div class="max-w-xl mx-auto pt-6">
    <EmptyState
      :icon="Lock"
      title="Belum ada menu untuk peran Anda"
      :description="`Peran ${auth.user?.roleName || auth.user?.role || ''} belum diberi akses ke menu mana pun. Minta super admin membukanya di Kelola Sistem → Kelola Peran & Hak Akses, lalu ketuk Muat Ulang.`"
      action-label="Muat Ulang"
      @action="reload"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { Lock } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import EmptyState from '../components/ui/EmptyState.vue';

const auth = useAuthStore();
const router = useRouter();

const reload = async () => {
  await auth.refreshMe({ maxAgeMs: 0 });
  if (auth.homePath !== '/tanpa-akses') router.replace(auth.homePath);
};
</script>
