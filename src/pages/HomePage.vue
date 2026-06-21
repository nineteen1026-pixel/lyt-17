<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, TrendingUp, Calendar, Droplets, Activity, Target } from 'lucide-vue-next';
import { usePainRecord } from '@/composables/usePainRecord';
import { useTrends } from '@/composables/useTrends';
import { formatDisplayDate } from '@/utils/date';

const router = useRouter();
const recordService = usePainRecord();
const trendsService = useTrends();

const todayStats = ref({ count: 0, avgPain: 0, maxPain: 0 });
const weekStats = ref({ avgPain: 0, totalRecords: 0 });
const isLoading = ref(true);
const today = formatDisplayDate(new Date().toISOString().split('T')[0]);

const loadStats = async () => {
  isLoading.value = true;
  try {
    todayStats.value = await recordService.getTodayStats();
    await trendsService.loadTrendData();
    weekStats.value = {
      avgPain: trendsService.getAveragePain.value,
      totalRecords: trendsService.getTotalRecords.value
    };
  } finally {
    isLoading.value = false;
  }
};

const goToRecord = () => {
  router.push('/record');
};

const goToTrends = () => {
  router.push('/trends');
};

const goToBody = () => {
  router.push('/body');
};

const goToHistory = () => {
  router.push('/history');
};

onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">疼痛日记</h1>
      <p class="text-white/60">{{ today }}</p>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="stat-card animate-slide-up" style="animation-delay: 0.1s">
        <div class="stat-value">{{ todayStats.count }}</div>
        <div class="stat-label">今日记录</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay: 0.2s">
        <div class="stat-value">{{ todayStats.avgPain || '-' }}</div>
        <div class="stat-label">今日平均</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay: 0.3s">
        <div class="stat-value">{{ weekStats.totalRecords }}</div>
        <div class="stat-label">本周记录</div>
      </div>
    </div>

    <div
      class="glass-card p-6 mb-8 cursor-pointer animate-slide-up"
      style="animation-delay: 0.4s"
      @click="goToRecord"
    >
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold mb-2">记录今日疼痛</h2>
          <p class="text-white/60 text-sm">记录部位、程度、诱因等详细信息</p>
        </div>
        <button class="btn-primary flex items-center gap-2">
          <Plus :size="20" />
          快速记录
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-8">
      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.5s"
        @click="goToBody"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Target :size="20" />
          </div>
          <h3 class="font-bold">部位标注</h3>
        </div>
        <p class="text-sm text-white/60">交互式人体图，精准标注疼痛位置</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.6s"
        @click="goToTrends"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
            <TrendingUp :size="20" />
          </div>
          <h3 class="font-bold">趋势分析</h3>
        </div>
        <p class="text-sm text-white/60">查看周/月疼痛趋势图表</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.7s"
        @click="goToHistory"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Calendar :size="20" />
          </div>
          <h3 class="font-bold">历史记录</h3>
        </div>
        <p class="text-sm text-white/60">查看和管理所有历史记录</p>
      </div>

      <div
        class="glass-card-hover p-5 cursor-pointer animate-slide-up"
        style="animation-delay: 0.8s"
        @click="router.push('/settings')"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
            <Activity :size="20" />
          </div>
          <h3 class="font-bold">设置</h3>
        </div>
        <p class="text-sm text-white/60">数据导出、清除等管理功能</p>
      </div>
    </div>

    <div
      v-if="weekStats.totalRecords > 0"
      class="glass-card p-5 animate-slide-up"
      style="animation-delay: 0.9s"
    >
      <h3 class="font-bold mb-3 flex items-center gap-2">
        <Droplets :size="18" class="text-blue-400" />
        本周概览
      </h3>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            {{ weekStats.avgPain || 0 }}
          </p>
          <p class="text-sm text-white/60">平均疼痛程度</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold">{{ weekStats.totalRecords }}</p>
          <p class="text-sm text-white/60">总记录次数</p>
        </div>
      </div>
      <div class="mt-4">
        <div class="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000"
            :style="{ width: `${Math.min((weekStats.avgPain / 10) * 100, 100)}%` }"
          ></div>
        </div>
      </div>
    </div>

    <div
      v-else-if="!isLoading"
      class="glass-card p-8 text-center animate-slide-up"
      style="animation-delay: 0.9s"
    >
      <div class="text-5xl mb-4">📝</div>
      <h3 class="text-lg font-bold mb-2">开始记录</h3>
      <p class="text-white/60 text-sm mb-4">记录您的第一次疼痛数据，开始追踪健康状况</p>
      <button class="btn-primary" @click="goToRecord">开始记录</button>
    </div>
  </div>
</template>
