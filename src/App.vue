<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import BottomNav from '@/components/BottomNav.vue';
import { useMedicationReminder } from '@/composables/useMedicationReminder';
import { getNotificationPermission } from '@/utils/notification';

const isOnline = ref(navigator.onLine);
const { startNotificationScheduler, stopNotificationScheduler, generateTodayLogs, scheduleTodayNotifications } = useMedicationReminder();

const initMedicationReminder = async () => {
  try {
    await generateTodayLogs();
  } catch (e) {
    console.warn('初始化当日服药记录失败:', e);
  }

  const permission = getNotificationPermission();
  if (permission === 'granted') {
    try {
      await scheduleTodayNotifications();
    } catch (e) {
      console.warn('调度用药通知失败:', e);
    }
    startNotificationScheduler();
  }
};

onMounted(() => {
  window.addEventListener('online', () => {
    isOnline.value = true;
  });
  window.addEventListener('offline', () => {
    isOnline.value = false;
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        await generateTodayLogs();
        const permission = getNotificationPermission();
        if (permission === 'granted') {
          await scheduleTodayNotifications();
        }
      } catch (e) {
        console.warn('刷新当日服药记录失败:', e);
      }
    }
  });

  initMedicationReminder();
});

onUnmounted(() => {
  stopNotificationScheduler();
});
</script>

<template>
  <div class="min-h-screen">
    <div
      v-if="!isOnline"
      class="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-yellow-900 text-center py-2 text-sm font-medium"
    >
      ⚡ 离线模式 - 数据会保存在本地，联网后自动同步
    </div>
    <main :class="{ 'pt-8': !isOnline }">
      <router-view />
    </main>
    <BottomNav />
  </div>
</template>
