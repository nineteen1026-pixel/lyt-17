<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import html2canvas from 'html2canvas';
import {
  ChevronLeft,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Pill,
  Calendar,
  Activity,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Timer
} from 'lucide-vue-next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions
} from 'chart.js';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import { useConsultationReport, type ConsultationStats } from '@/composables/useConsultationReport';
import { formatDisplayDate } from '@/utils/date';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const reportService = useConsultationReport();
const isLoading = ref(true);
const reportRef = ref<HTMLElement | null>(null);
const isExportingImage = ref(false);
const showCustomRange = ref(false);

const presetOptions: Array<{ label: string; value: 'week' | 'half-month' | 'month' | 'quarter' | 'half-year' }> = [
  { label: '近1周', value: 'week' },
  { label: '近15天', value: 'half-month' },
  { label: '近30天', value: 'month' },
  { label: '近3月', value: 'quarter' },
  { label: '近半年', value: 'half-year' }
];

const activePreset = ref<'week' | 'half-month' | 'month' | 'quarter' | 'half-year'>('month');

const selectPreset = (preset: typeof activePreset.value) => {
  activePreset.value = preset;
  showCustomRange.value = false;
  reportService.setPresetRange(preset);
  loadData();
};

const applyCustomRange = () => {
  if (reportService.startDate.value && reportService.endDate.value) {
    activePreset.value = 'month';
    showCustomRange.value = false;
    loadData();
  }
};

const loadData = async () => {
  isLoading.value = true;
  try {
    await reportService.generateConsultationReport();
  } finally {
    isLoading.value = false;
  }
};

const stats = computed(() => reportService.consultationStats.value);

const hasData = computed(() => {
  if (!stats.value) return false;
  return stats.value.totalRecords > 0 || stats.value.medicationStats.totalScheduled > 0;
});

const hasPainData = computed(() => stats.value && stats.value.totalRecords > 0);
const hasMedicationData = computed(() => stats.value && stats.value.medicationStats.totalScheduled > 0);

const trendIcon = computed(() => {
  if (!stats.value) return Minus;
  switch (stats.value.painTrendDirection) {
    case 'increasing': return TrendingUp;
    case 'decreasing': return TrendingDown;
    default: return Minus;
  }
});

const trendLabel = computed(() => {
  if (!stats.value) return '稳定';
  switch (stats.value.painTrendDirection) {
    case 'increasing': return '上升';
    case 'decreasing': return '下降';
    default: return '稳定';
  }
});

const trendColor = computed(() => {
  if (!stats.value) return 'text-blue-400';
  switch (stats.value.painTrendDirection) {
    case 'increasing': return 'text-red-400';
    case 'decreasing': return 'text-emerald-400';
    default: return 'text-blue-400';
  }
});

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

const trendChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] };
  const daily = stats.value.dailyTrend.filter(d => d.count > 0);
  const labels = daily.map(d => {
    const parts = d.date.split('-');
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  });
  const hasChartData = daily.length > 0;
  return {
    labels,
    datasets: hasChartData ? [
      {
        label: '平均疼痛',
        data: daily.map(d => d.avgPain),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      },
      {
        label: '最高疼痛',
        data: daily.map(d => d.maxPain),
        borderColor: 'rgba(239, 68, 68, 0.7)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgba(239, 68, 68, 0.7)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4
      }
    ] : []
  };
});

const trendChartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        usePointStyle: true,
        padding: 12,
        font: { size: 11 }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 }, maxRotation: 45 }
    },
    y: {
      min: 0,
      max: 10,
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: 'rgba(255, 255, 255, 0.6)', stepSize: 2, font: { size: 10 } },
      title: {
        display: true,
        text: '疼痛程度 (0-10)',
        color: 'rgba(255, 255, 255, 0.6)',
        font: { size: 11 }
      }
    }
  }
}));

const bodyPartChartData = computed(() => {
  if (!stats.value || stats.value.bodyPartSummary.length === 0) return { labels: [], datasets: [] };
  const topParts = stats.value.bodyPartSummary.slice(0, 8);
  return {
    labels: topParts.map(b => b.name),
    datasets: [{
      label: '出现次数',
      data: topParts.map(b => b.count),
      backgroundColor: [
        'rgba(236, 72, 153, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(99, 102, 241, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(14, 165, 233, 0.8)',
        'rgba(6, 182, 212, 0.8)',
        'rgba(20, 184, 166, 0.8)'
      ],
      borderRadius: 6
    }]
  };
});

const bodyPartChartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 }, stepSize: 1 },
      beginAtZero: true
    },
    y: {
      grid: { display: false },
      ticks: { color: 'rgba(255, 255, 255, 0.8)', font: { size: 11 } }
    }
  }
}));

const painDistributionChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] };
  return {
    labels: ['轻微(1-2)', '轻度(3-4)', '中度(5-6)', '重度(7-8)', '剧烈(9-10)'],
    datasets: [{
      data: stats.value.painDistribution,
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgba(16, 185, 129, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(234, 179, 8, 1)',
        'rgba(249, 115, 22, 1)',
        'rgba(239, 68, 68, 1)'
      ],
      borderWidth: 2,
      hoverOffset: 6
    }]
  };
});

const painDistributionChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '55%',
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        usePointStyle: true,
        padding: 10,
        font: { size: 11 }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      padding: 10,
      cornerRadius: 8
    }
  }
}));

const adherenceChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] };
  const rate = stats.value.medicationStats.adherenceRate;
  return {
    labels: ['已服', '漏服'],
    datasets: [{
      data: [rate, 100 - rate],
      backgroundColor: [
        rate >= 80 ? 'rgba(16, 185, 129, 0.8)' : rate >= 50 ? 'rgba(234, 179, 8, 0.8)' : 'rgba(239, 68, 68, 0.8)',
        'rgba(255, 255, 255, 0.1)'
      ],
      borderColor: [
        rate >= 80 ? 'rgba(16, 185, 129, 1)' : rate >= 50 ? 'rgba(234, 179, 8, 1)' : 'rgba(239, 68, 68, 1)',
        'rgba(255, 255, 255, 0.2)'
      ],
      borderWidth: 2
    }]
  };
});

const adherenceChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      padding: 10,
      cornerRadius: 8
    }
  }
}));

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
        const clonedEl = clonedDoc.querySelector<HTMLElement>('[data-report-content]')
          || clonedDoc.querySelector('.space-y-5');
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
    const padding = 40;
    const headerHeight = 90;
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
    ctx.font = 'bold 26px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('就诊报告', padding, padding + 30);
    ctx.font = '13px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText(
      `${reportService.dateRangeDisplay.value}    |    生成时间: ${new Date().toLocaleString('zh-CN')}    |    疼痛日记`,
      padding,
      padding + 56
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(padding, headerHeight - 6, reportCanvas.width, 1);
    ctx.drawImage(reportCanvas, padding, headerHeight + padding);
    finalCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `就诊报告-${reportService.startDate.value}-${reportService.endDate.value}.png`;
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

watch([() => reportService.startDate.value, () => reportService.endDate.value], () => {
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <ChevronLeft :size="20" />
        </button>
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Stethoscope :size="26" class="text-cyan-400" />
            就诊报告
          </h1>
          <p class="text-xs text-white/40 mt-0.5">供线下复诊参考使用</p>
        </div>
      </div>
      <button
        @click="exportAsImage"
        class="btn-primary flex items-center gap-2 !px-4 !py-2 text-sm"
        :disabled="!hasData || isExportingImage"
      >
        <Download :size="18" />
        {{ isExportingImage ? '导出中...' : '导出图片' }}
      </button>
    </div>

    <div class="glass-card p-4 mb-5">
      <div class="flex items-center gap-2 mb-3">
        <Timer :size="16" class="text-white/60" />
        <span class="text-sm text-white/60">选择时间范围</span>
      </div>
      <div class="flex flex-wrap gap-2 mb-3">
        <button
          v-for="opt in presetOptions"
          :key="opt.value"
          @click="selectPreset(opt.value)"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
          :class="activePreset === opt.value
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
            : 'bg-white/10 text-white/70 hover:bg-white/20'"
        >
          {{ opt.label }}
        </button>
        <button
          @click="showCustomRange = !showCustomRange"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
          :class="showCustomRange
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20'
            : 'bg-white/10 text-white/70 hover:bg-white/20'"
        >
          自定义
        </button>
      </div>
      <div v-if="showCustomRange" class="flex items-center gap-3 animate-fade-in">
        <input
          type="date"
          v-model="reportService.startDate.value"
          class="input-field !py-2 text-sm flex-1"
        />
        <span class="text-white/40">至</span>
        <input
          type="date"
          v-model="reportService.endDate.value"
          class="input-field !py-2 text-sm flex-1"
        />
        <button @click="applyCustomRange" class="btn-secondary !px-3 !py-2 text-sm">应用</button>
      </div>
      <div class="mt-2 text-sm text-white/50">
        {{ reportService.dateRangeDisplay.value }}
      </div>
    </div>

    <div v-if="isLoading" class="glass-card p-12 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-white/60">生成报告中...</p>
      </div>
    </div>

    <div v-else-if="!hasData" class="glass-card p-12 text-center">
      <Stethoscope :size="64" class="mx-auto mb-4 text-white/30" />
      <p class="text-lg text-white/60 mb-2">所选时段暂无记录数据</p>
      <p class="text-sm text-white/40">记录疼痛数据后即可生成就诊报告</p>
    </div>

    <div v-else ref="reportRef" data-report-content class="space-y-5">
      <div class="glass-card p-5 border-l-4 border-cyan-500/50">
        <div class="flex items-center gap-2 mb-4">
          <Stethoscope :size="20" class="text-cyan-400" />
          <h2 class="font-bold text-lg">患者疼痛概要</h2>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <p class="text-xs text-white/50 mb-1">记录天数</p>
            <p class="text-2xl font-bold text-cyan-400">{{ stats?.daysWithRecords || 0 }}<span class="text-sm text-white/40">/{{ stats?.totalDays || 0 }}天</span></p>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <p class="text-xs text-white/50 mb-1">平均疼痛</p>
            <p class="text-2xl font-bold" :class="getPainLevelColor(stats?.avgPain || 0)">{{ hasPainData ? stats?.avgPain : '—' }}</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <p class="text-xs text-white/50 mb-1">最高疼痛</p>
            <p class="text-2xl font-bold text-red-400">{{ hasPainData ? stats?.maxPain : '—' }}</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center">
            <p class="text-xs text-white/50 mb-1">疼痛趋势</p>
            <div class="flex items-center justify-center gap-1">
              <component :is="trendIcon" :size="18" :class="trendColor" />
              <span class="text-lg font-bold" :class="trendColor">{{ trendLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasPainData" class="glass-card p-5">
        <h3 class="font-bold mb-3 flex items-center gap-2">
          <Activity :size="18" class="text-blue-400" />
          疼痛趋势变化
        </h3>
        <div class="h-56">
          <Line :data="trendChartData" :options="trendChartOptions" />
        </div>
        <div class="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div class="bg-white/5 rounded-lg p-2 text-center">
            <span class="text-white/50">重度天数</span>
            <span class="ml-2 font-bold text-red-400">{{ stats?.severePainDays }}天</span>
          </div>
          <div class="bg-white/5 rounded-lg p-2 text-center">
            <span class="text-white/50">最低疼痛</span>
            <span class="ml-2 font-bold" :class="getPainLevelColor(stats?.minPain || 0)">{{ stats?.minPain }}</span>
          </div>
          <div class="bg-white/5 rounded-lg p-2 text-center">
            <span class="text-white/50">记录总数</span>
            <span class="ml-2 font-bold text-blue-400">{{ stats?.totalRecords }}次</span>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-5">
        <div v-if="hasPainData" class="glass-card p-5">
          <h3 class="font-bold mb-3 flex items-center gap-2">
            <BarChart3 :size="18" class="text-yellow-400" />
            疼痛程度分布
          </h3>
          <div class="h-52">
            <Doughnut :data="painDistributionChartData" :options="painDistributionChartOptions" />
          </div>
        </div>

        <div v-if="hasPainData && stats?.bodyPartSummary && stats.bodyPartSummary.length > 0" class="glass-card p-5">
          <h3 class="font-bold mb-3 flex items-center gap-2">
            <MapPin :size="18" class="text-pink-400" />
            疼痛部位分布
          </h3>
          <div class="h-52">
            <Bar :data="bodyPartChartData" :options="bodyPartChartOptions" />
          </div>
        </div>
      </div>

      <div v-if="hasPainData && stats?.bodyPartSummary && stats.bodyPartSummary.length > 0" class="glass-card p-5">
        <h3 class="font-bold mb-3 flex items-center gap-2">
          <MapPin :size="18" class="text-pink-400" />
          部位详情（按频次排序）
        </h3>
        <div class="space-y-2">
          <div
            v-for="(part, index) in stats.bodyPartSummary"
            :key="part.name"
            class="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5"
          >
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              :class="index === 0 ? 'bg-pink-500' : index === 1 ? 'bg-purple-500' : index === 2 ? 'bg-violet-500' : 'bg-blue-500'"
            >
              {{ index + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-1">
                <span class="text-sm font-medium">{{ part.name }}</span>
                <span class="text-xs text-white/50">{{ part.count }}次 ({{ part.percentage }}%)</span>
              </div>
              <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                  :style="{ width: `${part.percentage}%` }"
                ></div>
              </div>
            </div>
            <div class="text-right shrink-0 pl-2">
              <span class="text-sm font-bold" :class="getPainLevelColor(part.avgPain)">{{ part.avgPain }}</span>
              <p class="text-xs text-white/40">平均痛度</p>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="font-bold mb-3 flex items-center gap-2">
          <Pill :size="18" class="text-emerald-400" />
          用药依从情况
        </h3>
        <div v-if="!hasMedicationData" class="text-center py-6 text-white/40">
          所选时段暂无用药记录
        </div>
        <div v-else class="flex flex-col sm:flex-row gap-5">
          <div class="flex-shrink-0 flex items-center justify-center">
            <div class="relative w-32 h-32">
              <Doughnut :data="adherenceChartData" :options="adherenceChartOptions" />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                  <p class="text-2xl font-bold" :class="(stats?.medicationStats.adherenceRate || 0) >= 80 ? 'text-emerald-400' : (stats?.medicationStats.adherenceRate || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'">
                    {{ stats?.medicationStats.adherenceRate }}%
                  </p>
                  <p class="text-xs text-white/50">依从率</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex-1 space-y-3">
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-white/5 rounded-lg p-3 text-center">
                <p class="text-xl font-bold text-blue-400">{{ stats?.medicationStats.totalScheduled }}</p>
                <p class="text-xs text-white/50">计划次数</p>
              </div>
              <div class="bg-white/5 rounded-lg p-3 text-center">
                <p class="text-xl font-bold text-emerald-400">{{ stats?.medicationStats.totalTaken }}</p>
                <p class="text-xs text-white/50">已服次数</p>
              </div>
              <div class="bg-white/5 rounded-lg p-3 text-center">
                <p class="text-xl font-bold text-red-400">{{ stats?.medicationStats.totalMissed }}</p>
                <p class="text-xs text-white/50">漏服次数</p>
              </div>
            </div>
            <div v-if="stats?.medicationStats.medications && stats.medicationStats.medications.length > 0" class="space-y-1.5">
              <p class="text-xs text-white/50">药物明细:</p>
              <div
                v-for="med in stats?.medicationStats.medications"
                :key="med.name"
                class="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg text-sm"
              >
                <div class="flex items-center gap-2">
                  <component
                    :is="med.adherenceRate >= 80 ? CheckCircle2 : med.adherenceRate >= 50 ? AlertTriangle : XCircle"
                    :size="14"
                    :class="med.adherenceRate >= 80 ? 'text-emerald-400' : med.adherenceRate >= 50 ? 'text-yellow-400' : 'text-red-400'"
                  />
                  <span class="font-medium">{{ med.name }}</span>
                  <span v-if="med.dosage" class="text-white/40 text-xs">{{ med.dosage }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-white/50 text-xs">{{ med.taken }}/{{ med.scheduled }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded text-xs font-medium"
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

      <div v-if="hasPainData && stats?.topTriggers && stats.topTriggers.length > 0" class="glass-card p-5">
        <h3 class="font-bold mb-3 flex items-center gap-2">
          <AlertTriangle :size="18" class="text-yellow-400" />
          高频诱因
        </h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(t, i) in stats.topTriggers"
            :key="t.name"
            class="px-3 py-1.5 rounded-lg text-sm font-medium"
            :class="i === 0 ? 'bg-red-500/20 text-red-300' : i === 1 ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'"
          >
            {{ t.name }} <span class="text-white/40">{{ t.count }}次 ({{ t.percentage }}%)</span>
          </span>
        </div>
      </div>

      <div class="glass-card p-5 border-t-2 border-cyan-500/30">
        <div class="flex items-center gap-2 mb-4">
          <FileText :size="20" class="text-cyan-400" />
          <h2 class="font-bold text-lg">就诊信息摘要</h2>
        </div>
        <div class="bg-white/5 rounded-xl p-5 space-y-4">
          <div>
            <h4 class="text-xs font-semibold text-cyan-400/80 uppercase tracking-wider mb-2 pb-1 border-b border-white/10">一、基本信息</h4>
            <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span class="text-white/50">报告周期:</span>
                <span class="ml-2 font-medium">{{ reportService.dateRangeDisplay.value }}</span>
              </div>
              <div>
                <span class="text-white/50">生成时间:</span>
                <span class="ml-2 font-medium">{{ new Date().toLocaleString('zh-CN') }}</span>
              </div>
              <div>
                <span class="text-white/50">记录天数:</span>
                <span class="ml-2 font-medium">{{ stats?.daysWithRecords }} / {{ stats?.totalDays }} 天</span>
              </div>
              <div>
                <span class="text-white/50">记录总数:</span>
                <span class="ml-2 font-medium">{{ stats?.totalRecords }} 次</span>
              </div>
            </div>
          </div>

          <div v-if="hasPainData">
            <h4 class="text-xs font-semibold text-cyan-400/80 uppercase tracking-wider mb-2 pb-1 border-b border-white/10">二、疼痛评估</h4>
            <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span class="text-white/50">平均疼痛:</span>
                <span class="ml-2 font-medium" :class="getPainLevelColor(stats?.avgPain || 0)">{{ stats?.avgPain }} ({{ getPainLevelLabel(stats?.avgPain || 0) }})</span>
              </div>
              <div>
                <span class="text-white/50">最高疼痛:</span>
                <span class="ml-2 font-medium text-red-400">{{ stats?.maxPain }} ({{ getPainLevelLabel(stats?.maxPain || 0) }})</span>
              </div>
              <div>
                <span class="text-white/50">最低疼痛:</span>
                <span class="ml-2 font-medium" :class="getPainLevelColor(stats?.minPain || 0)">{{ stats?.minPain }} ({{ getPainLevelLabel(stats?.minPain || 0) }})</span>
              </div>
              <div>
                <span class="text-white/50">重度天数:</span>
                <span class="ml-2 font-medium text-red-400">{{ stats?.severePainDays }} 天</span>
              </div>
              <div>
                <span class="text-white/50">趋势方向:</span>
                <span class="ml-2 font-medium" :class="trendColor">{{ trendLabel }}</span>
              </div>
            </div>
          </div>

          <div v-if="hasPainData && stats?.topBodyParts && stats.topBodyParts.length > 0">
            <h4 class="text-xs font-semibold text-cyan-400/80 uppercase tracking-wider mb-2 pb-1 border-b border-white/10">三、主要疼痛部位</h4>
            <div class="space-y-1 text-sm">
              <div v-for="(part, i) in stats.bodyPartSummary.slice(0, 5)" :key="part.name" class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-white/10 shrink-0">{{ i + 1 }}</span>
                <span class="font-medium">{{ part.name }}</span>
                <span class="text-white/40">{{ part.count }}次</span>
                <span class="text-white/30">|</span>
                <span class="text-white/40">平均痛度</span>
                <span class="font-medium" :class="getPainLevelColor(part.avgPain)">{{ part.avgPain }}</span>
              </div>
            </div>
          </div>

          <div v-if="hasPainData && stats?.topTriggers && stats.topTriggers.length > 0">
            <h4 class="text-xs font-semibold text-cyan-400/80 uppercase tracking-wider mb-2 pb-1 border-b border-white/10">四、主要诱因</h4>
            <div class="flex flex-wrap gap-2 text-sm">
              <span
                v-for="(t, i) in stats.topTriggers"
                :key="t.name"
                class="px-2.5 py-1 rounded-full text-xs font-medium"
                :class="i === 0 ? 'bg-red-500/20 text-red-300' : i === 1 ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'"
              >
                {{ t.name }} ({{ t.count }}次)
              </span>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-semibold text-cyan-400/80 uppercase tracking-wider mb-2 pb-1 border-b border-white/10">五、用药依从</h4>
            <div v-if="!hasMedicationData" class="text-sm text-white/40">所选时段暂无用药记录</div>
            <div v-else>
              <div class="grid grid-cols-3 gap-x-6 gap-y-2 text-sm mb-2">
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
                <p class="text-xs text-white/40 mb-1">药物明细:</p>
                <div class="space-y-1">
                  <div
                    v-for="med in stats?.medicationStats.medications"
                    :key="med.name"
                    class="text-sm flex justify-between bg-white/5 px-3 py-1.5 rounded-lg"
                  >
                    <span>{{ med.name }}<span v-if="med.dosage" class="text-white/40"> ({{ med.dosage }})</span></span>
                    <span class="text-white/60">{{ med.taken }}/{{ med.scheduled }} · {{ med.adherenceRate }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-white/10 text-center space-y-1">
            <p class="text-xs text-white/30">本报告由「疼痛日记」应用自动生成，仅供就诊参考</p>
            <p class="text-xs text-white/30">具体诊断与治疗方案请遵医嘱</p>
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
  :deep(.text-white\/80) {
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
