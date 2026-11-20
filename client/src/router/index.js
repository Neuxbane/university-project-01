import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import PickListView from '../views/PickListView.vue';
import PickSessionView from '../views/PickSessionView.vue';
import BoltLocationView from '../views/BoltLocationView.vue';
import MotorcycleManageView from '../views/MotorcycleManageView.vue';
import BoltSpecsView from '../views/BoltSpecsView.vue';
import PackagesView from '../views/PackagesView.vue';
import AdminToolsView from '../views/AdminToolsView.vue';
import ManualBookView from '../views/ManualBookView.vue';
import VerificationView from '../views/VerificationView.vue';
import ServiceTimeView from '../views/ServiceTimeView.vue';
import BundleDetailView from '../views/BundleDetailView.vue';
import ClaimView from '../views/ClaimView.vue';
import HistoryView from '../views/HistoryView.vue';
import NoAccessView from '../views/NoAccessView.vue';

// meta.permission: feature code(s) a role needs to open the page (any one of them is enough).
// The super admin opens everything; other roles follow Kelola Sistem > Kelola Peran & Hak Akses.
const SYSTEM_CODES = ['USERS_MANAGE', 'ROLES_MANAGE', 'CSV_IMPORT_EXPORT', 'SYSTEM_BACKUP_RESTORE', 'AUDIT_LOG_VIEW'];

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/', redirect: () => useAuthStore().homePath },
  { path: '/tanpa-akses', name: 'no-access', component: NoAccessView },
  { path: '/pick-list', name: 'pick-list', component: PickListView, meta: { permission: 'MENU_PAKET_FULL_BIKE' } },
  { path: '/pick-list/:motorId/lokasi', name: 'bolt-location', component: BoltLocationView, meta: { permission: 'MENU_PAKET_FULL_BIKE' } },
  { path: '/pick-list/:sessionId', redirect: (to) => `/history/paket/${to.params.sessionId}` },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { permission: 'MENU_DASHBOARD' } },
  { path: '/history', name: 'history', component: HistoryView, meta: { permission: 'MENU_RIWAYAT' } },
  // Panduan Pasang lives inside Paket Full Bike (tab next to the 3D model); old links keep working
  { path: '/pasang', redirect: '/pick-list' },
  { path: '/pasang/:motorId', redirect: (to) => ({ path: `/pick-list/${to.params.motorId}/lokasi`, query: { ...to.query, panduan: '1' } }) },
  // Riwayat records: Paket Full Bike claims (checklist per bolt size) and Bundling claims
  { path: '/history/paket/:sessionId', name: 'pick-session', component: PickSessionView, meta: { permission: 'MENU_RIWAYAT' } },
  { path: '/history/klaim/:id', name: 'claim', component: ClaimView, meta: { permission: 'MENU_RIWAYAT' } },
  { path: '/verifikasi', name: 'verification', component: VerificationView, meta: { permission: 'VERIFICATION_MANAGE' } },
  { path: '/laporan/waktu', name: 'service-time', component: ServiceTimeView, meta: { permission: 'REPORT_SERVICE_TIME' } },
  { path: '/motorcycles', redirect: '/pick-list' },
  { path: '/motorcycles/:motorId', name: 'motorcycle-manage', component: MotorcycleManageView, meta: { permission: 'MOTORCYCLES_MANAGE' } },
  { path: '/bolt-specs', name: 'bolt-specs', component: BoltSpecsView, meta: { permission: 'MENU_MASTER_BARANG' } },
  { path: '/bundling', name: 'bundling', component: PackagesView, meta: { permission: 'MENU_BUNDLING' } },
  { path: '/bundling/:id', name: 'bundling-detail', component: BundleDetailView, meta: { permission: 'MENU_BUNDLING' } },
  { path: '/packages', redirect: '/bundling' },
  { path: '/admin/import', name: 'admin-tools', component: AdminToolsView, meta: { permission: SYSTEM_CODES } },
  { path: '/help/manual', name: 'manual-book', component: ManualBookView, meta: { permission: 'MENU_BUKU_PANDUAN' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login' };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return auth.homePath;
  }
  if (!to.meta.public) {
    await auth.refreshMe();
    if (!auth.isAuthenticated) return { name: 'login' };
  }
  const needed = to.meta.permission;
  if (needed && !auth.can(...[].concat(needed))) {
    return auth.homePath;
  }
  if (to.name === 'no-access' && auth.homePath !== '/tanpa-akses') {
    return auth.homePath;
  }
  return true;
});

export default router;

