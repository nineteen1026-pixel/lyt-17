<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ChevronLeft, ChevronRight, Calendar, MapPin, AlertTriangle, Cloud } from 'lucide-vue-next';
import { useTrends } from '@/composables/useTrends';
import TrendChart from '@/components/TrendChart.vue';
import type { TimeRange } from '@/types';
import { formatDisplayDate } from '@/utils/date';

const trendsService = useTrends();

const isLoading = ref(true);

const loadData = async () => {
  isLoading.value = true;
  try {
    await trendsService.loadTrendData();
  } finally {
    isLoading.value = false;
  }
};

const setRange = (range: TimeRange) => {
  trendsService.setTimeRange(range);
  loadData();
};

const prevPeriod = () => {
  trendsService.previousPeriod();
  loadData();
};

const nextPeriod = () => {
  trendsService.nextPeriod();
  loadData();
};

const formatDateRange = () => {
  const { start, end } = trendsService.dateRange.value;
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
};

watch(() => trendsService.timeRange.value, () => {
  loadData();
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <h1 class="text-2xl font-bold mb-6">趋势分析</h1>

    <div class="glass-card p-4 mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex gap-2">
          <button
            @click="setRange('week')"
            class="px-4 py-2 rounded-full text-sm font-medium transition-all"
            :class="trendsService.timeRange.value === 'week'
              ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'"
          >
            本周
          </button>
          <button
            @click="setRange('month')"
            class="px-4 py-2 rounded-full text-sm font-medium transition-all"
            :class="trendsService.timeRange.value === 'month'
              ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'"
          >
            本月
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="prevPeriod"
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft :size="20" />
          </button>
          <span class="text-sm text-white/70 min-w-[180px] text-center">
            {{ formatDateRange() }}
          </span>
          <button
            @click="nextPeriod"
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="stat-card">
          <div class="stat-value">{{ trendsService.getAveragePain.value || '-' }}</div>
          <div class="stat-label">平均疼痛</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ trendsService.getTotalRecords.value }}</div>
          <div class="stat-label">记录次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ trendsService.trendData.value.filter(d => d.recordCount > 0).length }}
          </div>
          <div class="stat-label">有记录天数</div>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="glass-card p-12 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white/60">加载数据中...</p>
      </div>
    </div>

    <div v-else>
      <TrendChart
        :data="trendsService.trendData.value"
        :time-range="trendsService.timeRange.value"
        class="mb-6"
      />

      <div class="grid md:grid-cols-2 gap-6">
        <div class="glass-card p-5">
          <h3 class="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle :size="18" class="text-yellow-400" />
            高频诱因
          </h3>
          <div v-if="trendsService.getTopTriggers.value.length === 0" class="text-center py-8 text-white/40">
            暂无数据
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="([trigger, count], index) in trendsService.getTopTriggers.value"
              :key="trigger"
              class="flex items-center gap-3"
            >
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                :class="index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : index === 2 ? 'bg-yellow-500' : 'bg-blue-500'"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm">{{ trigger }}</span>
                  <span class="text-sm text-white/60">{{ count }}次</span>
                </div>
                <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                    :style="{ width: `${(count / trendsService.getTopTriggers.value[0][1]) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card p-5">
          <h3 class="font-bold mb-4 flex items-center gap-2">
            <MapPin :size="18" class="text-blue-400" />
            常见部位
          </h3>
          <div v-if="trendsService.getTopBodyParts.value.length === 0" class="text-center py-8 text-white/40">
            暂无数据
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="([part, count], index) in trendsService.getTopBodyParts.value"
              :key="part"
              class="flex items-center gap-3"
            >
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                :class="index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : index === 2 ? 'bg-yellow-500' : 'bg-blue-500'"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm">{{ part }}</span>
                  <span class="text-sm text-white/60">{{ count }}次</span>
                </div>
                <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    :style="{ width: `${(count / trendsService.getTopBodyParts.value[0][1]) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card p-5 md:col-span-2">
          <h3 class="font-bold mb-4 flex items-center gap-2">
            <Cloud :size="18" class="text-cyan-400" />
            天气关联分析
          </h3>
          <div v-if="trendsService.getWeatherCorrelation.value.length < 3" class="text-center py-8 text-white/40">
            <p>需要更多数据来分析天气与疼痛的关联</p>
            <p class="text-sm mt-2">建议在不同天气条件下记录数据</p>
          </div>
          <div v-else class="grid grid-cols-3 gap-4">
            <div
              v-for="item in trendsService.getWeatherCorrelation.value"
              :key="item.group"
              class="bg-white/5 p-4 rounded-xl text-center"
            >
              <p class="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {{ item.avgPain }}
              </p>
              <p class="text-sm text-white/60 mt-1">{{ item.group }}</p>
              <p class="text-xs text-white/40 mt-1">{{ item.count }}条记录</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
