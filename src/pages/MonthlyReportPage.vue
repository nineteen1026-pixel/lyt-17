<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import html2canvas from 'html2canvas';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Printer,
  Download,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Pill,
  Calendar,
  Activity,
  Cloud,
  BarChart3,
  Target,
  Flame
} from 'lucide-vue-next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions
} from 'chart.js';
import { Line, Bar } from 'vue-chartjs';
import { useMonthlyReport, type MonthlyStats } from '@/composables/useMonthlyReport';
import { formatDisplayDate } from '@/utils/date';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const reportService = useMonthlyReport();
const isLoading = ref(true);
const reportRef = ref<HTMLElement | null>(null);
const isExportingImage = ref(false);

const loadData = async () => {
  isLoading.value = true;
  try {
    await reportService.generateMonthlyReport();
  } finally {
    isLoading.value = false;
  }
};

const prevMonth = () => {
  reportService.previousMonth();
  loadData();
};

const nextMonth = () => {
  reportService.nextMonth();
  loadData();
};

const formatDateRange = () => {
  const { start, end } = reportService.monthRange.value;
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
};

const stats = computed(() => reportService.monthlyStats.value);

const trendChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] };
  const daily = stats.value.dailyTrend.filter(d => d.count > 0);
  const labels = daily.map(d => {
    const day = d.date.split('-')[2];
    return `${parseInt(day)}日`;
  });
  const hasData = daily.length > 0;
  return {
    labels,
    datasets: hasData ? [
      {
        label: '平均疼痛程度',
        data: daily.map(d => d.avgPain),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: '最高疼痛程度',
        data: daily.map(d => d.maxPain),
        borderColor: 'rgba(239, 68, 68, 0.8)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgba(239, 68, 68, 0.8)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ] : []
  };
});

const trendChartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        usePointStyle: true,
        padding: 15,
        font: { size: 12 }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 11 } }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      min: 0,
      max: 10,
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: 'rgba(255, 255, 255, 0.6)', stepSize: 2, font: { size: 11 } },
      title: {
        display: true,
        text: '疼痛程度 (0-10)',
        color: 'rgba(255, 255, 255, 0.6)',
        font: { size: 12 }
      }
    }
  }
}));

const painDistributionData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] };
  const labels = ['轻微(1-2)', '轻度(3-4)', '中度(5-6)', '重度(7-8)', '剧烈(9-10)'];
  const colors = [
    'rgba(16, 185, 129, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(239, 68, 68, 0.8)'
  ];
  return {
    labels,
    datasets: [{
      label: '记录次数',
      data: stats.value.painDistribution,
      backgroundColor: colors,
      borderRadius: 8,
      borderSkipped: false
    }]
  };
});

const painDistributionOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 11 } }
    },
    y: {
      grid: { display: false },
      ticks: { color: 'rgba(255, 255, 255, 0.8)', font: { size: 12 } }
    }
  }
}));

const triggerChartData = computed(() => {
  if (!stats.value || stats.value.topTriggers.length === 0) return { labels: [], datasets: [] };
  return {
    labels: stats.value.topTriggers.map(t => t.name),
    datasets: [{
      label: '出现次数',
      data: stats.value.topTriggers.map(t => t.count),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(139, 92, 246, 0.8)'
      ],
      borderRadius: 8
    }]
  };
});

const bodyPartChartData = computed(() => {
  if (!stats.value || stats.value.topBodyParts.length === 0) return { labels: [], datasets: [] };
  return {
    labels: stats.value.topBodyParts.map(b => b.name),
    datasets: [{
      label: '出现次数',
      data: stats.value.topBodyParts.map(b => b.count),
      backgroundColor: [
        'rgba(236, 72, 153, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(99, 102, 241, 0.8)',
        'rgba(59, 130, 246, 0.8)'
      ],
      borderRadius: 8
    }]
  };
});

const barChartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: 'rgba(255, 255, 255, 0.8)', font: { size: 12 } }
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: 'rgba(255, 255, 255, 0.6)', stepSize: 1, font: { size: 11 } },
      beginAtZero: true
    }
  }
}));

const getPainLevelLabel = (level: number): string => {
  if (level <= 2) return '轻微';
  if (level <= 4) return '轻度';
  if (level <= 6) return '中度';
  if (level <= 8) return '重度';
  return '剧烈';
};

const getPainLevelColor = (level: number): string => {
  if (level <= 2) return 'text-emerald-400';
  if (level <= 4) return 'text-green-400';
  if (level <= 6) return 'text-yellow-400';
  if (level <= 8) return 'text-orange-400';
  return 'text-red-400';
};

const hasData = computed(() => {
  if (!stats.value) return false;
  return stats.value.totalRecords > 0 || stats.value.medicationStats.totalScheduled > 0;
});

const hasPainData = computed(() => stats.value && stats.value.totalRecords > 0);
const hasMedicationData = computed(() =>
  stats.value && stats.value.medicationStats.totalScheduled > 0
);

const printReport = () => {
  window.print();
};

const exportAsImage = async () => {
  if (!reportRef.value) return;
  isExportingImage.value = true;
  const originalScrollY = window.scrollY;
  const originalOverflow = document.body.style.overflow;
  try {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    await nextTick();
    await new Promise(r => setTimeout(r, 500));
    const targetEl = reportRef.value;
    const reportCanvas = await html2canvas(targetEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(
        document.documentElement.scrollWidth,
        targetEl.scrollWidth + 80
      ),
      windowHeight: targetEl.scrollHeight + 200,
      ignoreElements: (el) => {
        const tag = (el as HTMLElement).tagName?.toLowerCase();
        return tag === 'script' || tag === 'style';
      },
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.querySelector<HTMLElement>('[ref="reportRef"]')
          || clonedDoc.querySelector('.space-y-6');
        if (clonedEl) {
          clonedEl.style.transform = 'none';
          clonedEl.style.margin = '0';
        }
        const charts = clonedDoc.querySelectorAll('canvas');
        charts.forEach((canvas) => {
          canvas.style.display = 'block';
        });
      }
    });
    const padding = 48;
    const headerHeight = 100;
    const totalWidth = reportCanvas.width + padding * 2;
    const totalHeight = reportCanvas.height + headerHeight + padding * 2;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = totalWidth;
    finalCanvas.height = totalHeight;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, totalWidth, totalHeight);
    gradient.addColorStop(0, '#1e1b4b');
    gradient.addColorStop(0.5, '#312e81');
    gradient.addColorStop(1, '#1e3a5f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 30px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`月度健康报告 · ${reportService.getMonthDisplay.value}`, padding, padding + 36);
    ctx.font = '14px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText(
      `报告时间: ${new Date().toLocaleString('zh-CN')}    |    疼痛日记 · Pain Diary`,
      padding,
      padding + 64
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(padding, headerHeight - 8, reportCanvas.width, 1);
    ctx.drawImage(reportCanvas, padding, headerHeight + padding);
    finalCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `月度健康报告-${reportService.getMonthDisplay.value}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } finally {
    document.body.style.overflow = originalOverflow;
    window.scrollTo({ top: originalScrollY, behavior: 'instant' as ScrollBehavior });
    isExportingImage.value = false;
  }
};

watch(() => reportService.currentDate.value, () => {
  loadData();
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <div class="flex items-center justify-between mb-6 print:hidden">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <FileText :size="28" class="text-blue-400" />
        月度健康报告
      </h1>
      <div class="flex gap-2">
        <button
          @click="printReport"
          class="btn-secondary flex items-center gap-2 !px-4 !py-2 text-sm"
          :disabled="!hasData"
        >
          <Printer :size="18" />
          打印
        </button>
        <button
          @click="exportAsImage"
          class="btn-primary flex items-center gap-2 !px-4 !py-2 text-sm"
          :disabled="!hasData || isExportingImage"
        >
          <Download :size="18" />
          {{ isExportingImage ? '导出中...' : '导出图片' }}
        </button>
      </div>
    </div>

    <div class="glass-card p-4 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="prevMonth"
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors print:hidden"
          >
            <ChevronLeft :size="20" />
          </button>
          <div class="text-center">
            <h2 class="text-xl font-bold">{{ reportService.getMonthDisplay.value }}</h2>
            <p class="text-sm text-white/60">{{ formatDateRange() }}</p>
          </div>
          <button
            @click="nextMonth"
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors print:hidden"
          >
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="glass-card p-12 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white/60">生成报告中...</p>
      </div>
    </div>

    <div v-else-if="!hasData" class="glass-card p-12 text-center">
      <FileText :size="64" class="mx-auto mb-4 text-white/30" />
      <p class="text-lg text-white/60 mb-2">本月暂无记录数据</p>
      <p class="text-sm text-white/40">记录疼痛数据后即可生成月度健康报告</p>
    </div>

    <div v-else ref="reportRef" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-center gap-2 mb-2">
            <Activity :size="18" class="text-blue-400" />
            <span class="stat-label">疼痛记录</span>
          </div>
          <div class="stat-value">{{ stats?.totalRecords || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-center gap-2 mb-2">
            <Calendar :size="18" class="text-emerald-400" />
            <span class="stat-label">记录天数</span>
          </div>
          <div class="stat-value">{{ stats?.daysWithRecords || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-center gap-2 mb-2">
            <TrendingUp :size="18" class="text-yellow-400" />
            <span class="stat-label">平均疼痛</span>
          </div>
          <div class="stat-value" :class="hasPainData ? getPainLevelColor(stats?.avgPain || 0) : 'text-white/40'">
            {{ hasPainData ? stats?.avgPain : '—' }}
          </div>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-center gap-2 mb-2">
            <Pill :size="18" class="text-emerald-400" />
            <span class="stat-label">用药记录</span>
          </div>
          <div class="stat-value text-emerald-400">{{ stats?.medicationStats.totalScheduled || 0 }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="glass-card p-4 text-center">
          <p class="text-sm text-white/60 mb-1">重度疼痛天数</p>
          <p class="text-2xl font-bold text-red-400">{{ hasPainData ? stats?.severePainDays : '—' }}</p>
        </div>
        <div class="glass-card p-4 text-center">
          <p class="text-sm text-white/60 mb-1">最长连续记录</p>
          <p class="text-2xl font-bold text-emerald-400">{{ hasPainData ? stats?.consecutiveDays : '—' }}</p>
        </div>
        <div class="glass-card p-4 text-center">
          <p class="text-sm text-white/60 mb-1">用药依从率</p>
          <p class="text-2xl font-bold" :class="hasMedicationData
            ? ((stats?.medicationStats.adherenceRate || 0) >= 80 ? 'text-emerald-400' : 'text-yellow-400')
            : 'text-white/30'">
            {{ hasMedicationData ? `${stats?.medicationStats.adherenceRate}%` : '—' }}
          </p>
        </div>
      </div>

      <div v-if="hasPainData" class="glass-card p-6">
        <h3 class="font-bold mb-4 flex items-center gap-2">
          <TrendingUp :size="18" class="text-blue-400" />
          疼痛趋势图
        </h3>
        <div class="h-72">
          <Line :data="trendChartData" :options="trendChartOptions" />
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="glass-card p-6">
          <h3 class="font-bold mb-4 flex items-center gap-2">
            <BarChart3 :size="18" class="text-yellow-400" />
            疼痛程度分布
          </h3>
          <div v-if="!hasPainData" class="h-56 flex items-center justify-center text-white/40">
            暂无疼痛数据
          </div>
          <div v-else class="h-56">
            <Bar :data="painDistributionData" :options="painDistributionOptions" />
          </div>
        </div>

        <div class="glass-card p-6">
          <h3 class="font-bold mb-4 flex items-center gap-2">
            <Pill :size="18" class="text-emerald-400" />
            用药依从情况
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-white/70">用药依从率</span>
              <span class="text-lg font-bold" :class="(stats?.medicationStats.adherenceRate || 0) >= 80 ? 'text-emerald-400' : 'text-yellow-400'">
                {{ stats?.medicationStats.adherenceRate }}%
              </span>
            </div>
            <div class="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="(stats?.medicationStats.adherenceRate || 0) >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'"
                :style="{ width: `${stats?.medicationStats.adherenceRate}%` }"
              ></div>
            </div>
            <div class="grid grid-cols-3 gap-4 pt-2">
              <div class="text-center">
                <p class="text-xl font-bold text-blue-400">{{ stats?.medicationStats.totalScheduled }}</p>
                <p class="text-xs text-white/50">计划</p>
              </div>
              <div class="text-center">
                <p class="text-xl font-bold text-emerald-400">{{ stats?.medicationStats.totalTaken }}</p>
                <p class="text-xs text-white/50">已服</p>
              </div>
              <div class="text-center">
                <p class="text-xl font-bold text-red-400">{{ stats?.medicationStats.totalMissed }}</p>
                <p class="text-xs text-white/50">漏服</p>
              </div>
            </div>
            <div v-if="stats?.medicationStats.medications && stats.medicationStats.medications.length > 0" class="pt-4 border-t border-white/10">
              <p class="text-sm text-white/60 mb-3">药物明细:</p>
              <div class="space-y-2 max-h-32 overflow-y-auto">
                <div
                  v-for="med in stats?.medicationStats.medications"
                  :key="med.name"
                  class="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg"
                >
                  <div>
                    <span class="font-medium">{{ med.name }}</span>
                    <span v-if="med.dosage" class="text-white/50 ml-1">{{ med.dosage }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-white/60">{{ med.taken }}/{{ med.scheduled }}</span>
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="med.adherenceRate >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'"
                    >
                      {{ med.adherenceRate }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="glass-card p-6">
          <h3 class="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle :size="18" class="text-yellow-400" />
            高频诱因 Top 5
          </h3>
          <div v-if="stats?.topTriggers.length === 0" class="text-center py-8 text-white/40">
            暂无数据
          </div>
          <div v-else class="h-56">
            <Bar :data="triggerChartData" :options="barChartOptions" />
          </div>
          <div v-if="stats && stats.topTriggers.length > 0" class="mt-4 space-y-2">
            <div
              v-for="(trigger, index) in stats.topTriggers"
              :key="trigger.name"
              class="flex items-center gap-3"
            >
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                :class="index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : index === 2 ? 'bg-yellow-500' : 'bg-blue-500'"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm">{{ trigger.name }}</span>
                  <span class="text-sm text-white/60">{{ trigger.count }}次 ({{ trigger.percentage }}%)</span>
                </div>
                <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                    :style="{ width: `${trigger.percentage}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card p-6">
          <h3 class="font-bold mb-4 flex items-center gap-2">
            <MapPin :size="18" class="text-pink-400" />
            常见部位 Top 5
          </h3>
          <div v-if="stats?.topBodyParts.length === 0" class="text-center py-8 text-white/40">
            暂无数据
          </div>
          <div v-else class="h-56">
            <Bar :data="bodyPartChartData" :options="barChartOptions" />
          </div>
          <div v-if="stats && stats.topBodyParts.length > 0" class="mt-4 space-y-2">
            <div
              v-for="(part, index) in stats.topBodyParts"
              :key="part.name"
              class="flex items-center gap-3"
            >
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                :class="index === 0 ? 'bg-pink-500' : index === 1 ? 'bg-purple-500' : index === 2 ? 'bg-violet-500' : 'bg-blue-500'"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm">{{ part.name }}</span>
                  <span class="text-sm text-white/60">{{ part.count }}次 ({{ part.percentage }}%)</span>
                </div>
                <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    :style="{ width: `${part.percentage}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="stats?.weatherCorrelation && stats.weatherCorrelation.length >= 2" class="glass-card p-6">
        <h3 class="font-bold mb-4 flex items-center gap-2">
          <Cloud :size="18" class="text-cyan-400" />
          天气关联分析
        </h3>
        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="item in stats.weatherCorrelation"
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

      <div class="glass-card p-6 print:break-before-page">
        <h3 class="font-bold text-xl mb-4 flex items-center gap-2">
          <Target :size="20" class="text-emerald-400" />
          就医摘要
        </h3>
        <div class="bg-white/5 rounded-xl p-5 space-y-5">
          <div>
            <h4 class="text-sm font-semibold text-white/70 mb-2 border-b border-white/10 pb-2">基本信息</h4>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-white/50">报告月份:</span>
                <span class="ml-2 font-medium">{{ stats?.month }}</span>
              </div>
              <div>
                <span class="text-white/50">生成时间:</span>
                <span class="ml-2 font-medium">{{ new Date().toLocaleString('zh-CN') }}</span>
              </div>
              <div>
                <span class="text-white/50">记录总数:</span>
                <span class="ml-2 font-medium">{{ stats?.totalRecords }} 次</span>
              </div>
              <div>
                <span class="text-white/50">记录天数:</span>
                <span class="ml-2 font-medium">{{ stats?.daysWithRecords }} 天</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white/70 mb-2 border-b border-white/10 pb-2">疼痛概况</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span class="text-white/50">平均疼痛:</span>
                <span class="ml-2 font-medium" :class="getPainLevelColor(stats?.avgPain || 0)">
                  {{ stats?.avgPain }} ({{ getPainLevelLabel(stats?.avgPain || 0) }})
                </span>
              </div>
              <div>
                <span class="text-white/50">最高疼痛:</span>
                <span class="ml-2 font-medium" :class="getPainLevelColor(stats?.maxPain || 0)">
                  {{ stats?.maxPain }} ({{ getPainLevelLabel(stats?.maxPain || 0) }})
                </span>
              </div>
              <div>
                <span class="text-white/50">最低疼痛:</span>
                <span class="ml-2 font-medium" :class="getPainLevelColor(stats?.minPain || 0)">
                  {{ stats?.minPain }} ({{ getPainLevelLabel(stats?.minPain || 0) }})
                </span>
              </div>
              <div>
                <span class="text-white/50">重度天数:</span>
                <span class="ml-2 font-medium text-red-400">{{ stats?.severePainDays }} 天</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white/70 mb-2 border-b border-white/10 pb-2">主要诱因</h4>
            <div v-if="stats?.topTriggers.length === 0" class="text-sm text-white/40">暂无数据</div>
            <div v-else class="flex flex-wrap gap-2">
              <span
                v-for="(t, i) in stats?.topTriggers"
                :key="t.name"
                class="px-3 py-1 rounded-full text-sm"
                :class="i === 0 ? 'bg-red-500/20 text-red-300' : i === 1 ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'"
              >
                {{ t.name }} ({{ t.count }}次)
              </span>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white/70 mb-2 border-b border-white/10 pb-2">主要疼痛部位</h4>
            <div v-if="stats?.topBodyParts.length === 0" class="text-sm text-white/40">暂无数据</div>
            <div v-else class="flex flex-wrap gap-2">
              <span
                v-for="(b, i) in stats?.topBodyParts"
                :key="b.name"
                class="px-3 py-1 rounded-full text-sm"
                :class="i === 0 ? 'bg-pink-500/20 text-pink-300' : i === 1 ? 'bg-purple-500/20 text-purple-300' : 'bg-violet-500/20 text-violet-300'"
              >
                {{ b.name }} ({{ b.count }}次)
              </span>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white/70 mb-2 border-b border-white/10 pb-2">用药情况</h4>
            <div class="grid grid-cols-3 gap-3 text-sm mb-3">
              <div>
                <span class="text-white/50">依从率:</span>
                <span class="ml-2 font-medium" :class="(stats?.medicationStats.adherenceRate || 0) >= 80 ? 'text-emerald-400' : 'text-yellow-400'">
                  {{ stats?.medicationStats.adherenceRate }}%
                </span>
              </div>
              <div>
                <span class="text-white/50">已服/计划:</span>
                <span class="ml-2 font-medium">{{ stats?.medicationStats.totalTaken }}/{{ stats?.medicationStats.totalScheduled }}</span>
              </div>
              <div>
                <span class="text-white/50">漏服:</span>
                <span class="ml-2 font-medium text-red-400">{{ stats?.medicationStats.totalMissed }} 次</span>
              </div>
            </div>
            <div v-if="stats?.medicationStats.medications && stats.medicationStats.medications.length > 0">
              <p class="text-xs text-white/50 mb-2">药物明细:</p>
              <div class="space-y-1">
                <div
                  v-for="med in stats?.medicationStats.medications"
                  :key="med.name"
                  class="text-sm flex justify-between bg-white/5 px-3 py-1.5 rounded-lg"
                >
                  <span>{{ med.name }}<span v-if="med.dosage" class="text-white/50"> ({{ med.dosage }})</span></span>
                  <span class="text-white/70">{{ med.taken }}/{{ med.scheduled }} · {{ med.adherenceRate }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="stats?.weatherCorrelation && stats.weatherCorrelation.length >= 2">
            <h4 class="text-sm font-semibold text-white/70 mb-2 border-b border-white/10 pb-2">天气关联</h4>
            <div class="grid grid-cols-3 gap-3 text-sm">
              <div v-for="item in stats.weatherCorrelation" :key="item.group">
                <span class="text-white/50">{{ item.group }}:</span>
                <span class="ml-2 font-medium text-cyan-400">平均 {{ item.avgPain }}</span>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-white/10 text-xs text-white/40 text-center print:text-black/50">
            本报告由疼痛日记应用自动生成，仅供参考，具体诊断请遵医嘱
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  :deep(body) {
    background: white !important;
    color: #1e293b !important;
  }
  :deep(.glass-card) {
    background: #f8fafc !important;
    border: 1px solid #e2e8f0 !important;
    color: #1e293b !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }
  :deep(.stat-value),
  :deep(.stat-label),
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(p),
  :deep(span) {
    color: #1e293b !important;
  }
  :deep(.text-white\/40),
  :deep(.text-white\/50),
  :deep(.text-white\/60),
  :deep(.text-white\/70),
  :deep(.text-white\/80),
  :deep(.text-white\/90) {
    color: #64748b !important;
  }
  :deep(.bg-white\/5),
  :deep(.bg-white\/10) {
    background: #f1f5f9 !important;
  }
  :deep(.border-white\/10) {
    border-color: #e2e8f0 !important;
  }
}
</style>
