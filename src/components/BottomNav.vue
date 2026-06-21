<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Home, Plus, Target, TrendingUp, History, Settings } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const navItems = [
  { name: 'home', path: '/', icon: Home, label: '首页' },
  { name: 'record', path: '/record', icon: Plus, label: '记录' },
  { name: 'body', path: '/body', icon: Target, label: '部位' },
  { name: 'trends', path: '/trends', icon: TrendingUp, label: '趋势' },
  { name: 'history', path: '/history', icon: History, label: '历史' },
  { name: 'settings', path: '/settings', icon: Settings, label: '设置' }
];

const isActive = computed(() => (name: string) => route.name === name);

const navigate = (path: string) => {
  if (route.path !== path) {
    router.push(path);
  }
};
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-slate-900/95 to-transparent">
    <div class="max-w-5xl mx-auto">
      <div class="glass-card px-2 py-2 flex justify-around items-center">
        <button
          v-for="item in navItems"
          :key="item.name"
          @click="navigate(item.path)"
          class="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[60px]"
          :class="isActive(item.name)
            ? 'bg-gradient-to-br from-blue-500/30 to-emerald-500/30 text-emerald-400'
            : 'text-white/60 hover:text-white hover:bg-white/10'"
        >
          <component
            :is="item.icon"
            :size="22"
            :class="{ 'animate-bounce-subtle': isActive(item.name) }"
          />
          <span class="text-xs font-medium">{{ item.label }}</span>
        </button>
      </div>
    </div>
  </nav>
</template>
