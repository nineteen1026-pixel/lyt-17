<script setup lang="ts">
import { onMounted, ref } from 'vue';
import BottomNav from '@/components/BottomNav.vue';

const isOnline = ref(navigator.onLine);

onMounted(() => {
  window.addEventListener('online', () => {
    isOnline.value = true;
  });
  window.addEventListener('offline', () => {
    isOnline.value = false;
  });
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
