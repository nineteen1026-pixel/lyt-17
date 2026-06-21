import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('发现新版本，是否立即更新？')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('应用已准备好离线使用');
  },
  onRegisteredSW(swUrl, registration) {
    console.log('Service Worker 已注册:', swUrl);
  },
  onRegisterError(error) {
    console.warn('Service Worker 注册失败:', error);
  }
});

const app = createApp(App);
app.use(router);
app.mount('#app');
