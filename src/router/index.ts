import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import RecordPage from '@/pages/RecordPage.vue'
import BodyMapPage from '@/pages/BodyMapPage.vue'
import TrendsPage from '@/pages/TrendsPage.vue'
import HistoryPage from '@/pages/HistoryPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import MedicationPage from '@/pages/MedicationPage.vue'
import MonthlyReportPage from '@/pages/MonthlyReportPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: '疼痛日记' }
  },
  {
    path: '/record',
    name: 'record',
    component: RecordPage,
    meta: { title: '记录疼痛' }
  },
  {
    path: '/record/:recordId',
    name: 'edit-record',
    component: RecordPage,
    meta: { title: '编辑疼痛记录' }
  },
  {
    path: '/body',
    name: 'body',
    component: BodyMapPage,
    meta: { title: '部位标注' }
  },
  {
    path: '/trends',
    name: 'trends',
    component: TrendsPage,
    meta: { title: '趋势分析' }
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryPage,
    meta: { title: '历史记录' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsPage,
    meta: { title: '设置' }
  },
  {
    path: '/medication',
    name: 'medication',
    component: MedicationPage,
    meta: { title: '用药管理' }
  },
  {
    path: '/report',
    name: 'report',
    component: MonthlyReportPage,
    meta: { title: '月度健康报告' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '疼痛日记'} - 疼痛日记`
  next()
})

export default router
