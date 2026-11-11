import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import PickListView from '../views/PickListView.vue';
import PickSessionView from '../views/PickSessionView.vue';
import BoltLocationView from '../views/BoltLocationView.vue';
import MotorcyclesView from '../views/MotorcyclesView.vue';
import MotorcycleManageView from '../views/MotorcycleManageView.vue';
import BoltSpecsView from '../views/BoltSpecsView.vue';
import PackagesView from '../views/PackagesView.vue';
import AdminToolsView from '../views/AdminToolsView.vue';
import ManualBookView from '../views/ManualBookView.vue';
import HistoryView from '../views/HistoryView.vue';

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/', redirect: '/pick-list' },
  { path: '/pick-list', name: 'pick-list', component: PickListView },
  { path: '/pick-list/:motorId/lokasi', name: 'bolt-location', component: BoltLocationView },
  { path: '/pick-list/:sessionId', name: 'pick-session', component: PickSessionView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView },
  { path: '/history', name: 'history', component: HistoryView },
  { path: '/motorcycles', name: 'motorcycles', component: MotorcyclesView },
  { path: '/motorcycles/:motorId', name: 'motorcycle-manage', component: MotorcycleManageView },
  { path: '/bolt-specs', name: 'bolt-specs', component: BoltSpecsView },
  { path: '/packages', name: 'packages', component: PackagesView },
  { path: '/admin/import', name: 'admin-tools', component: AdminToolsView, meta: { requiresAdmin: true } },
  { path: '/help/manual', name: 'manual-book', component: ManualBookView },
  { path: '/:pathMatch(.*)*', redirect: '/pick-list' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return next({ name: 'login' });
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next({ name: 'pick-list' });
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return next({ name: 'pick-list' });
  }
  next();
});

export default router;

