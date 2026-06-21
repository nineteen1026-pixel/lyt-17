<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
import type { TrendDataPoint } from '@/types';
import { getWeekdayName } from '@/utils/date';

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

const props = defineProps<{
  data: TrendDataPoint[];
  timeRange: 'week' | 'month';
}>();

const chartType = ref<'line' | 'bar'>('line');

const formatLabel = (date: string) => {
  if (props.timeRange === 'week') {
    return getWeekdayName(date);
  }
  const day = date.split('-')[2];
  return `${parseInt(day)}日`;
};

const chartData = computed(() => {
  const labels = props.data.map(d => formatLabel(d.date));
  const hasData = props.data.some(d => d.recordCount > 0);
  
  return {
    labels,
    datasets: hasData ? [
      {
        label: '平均疼痛程度',
        data: props.data.map(d => d.avgPain),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: chartType.value === 'line',
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      },
      {
        label: '最高疼痛程度',
        data: props.data.map(d => d.maxPain),
        borderColor: 'rgba(239, 68, 68, 0.8)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgba(239, 68, 68, 0.8)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: '记录次数',
        data: props.data.map(d => d.recordCount),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1'
      }
    ] : []
  };
});

const chartOptions = computed<ChartOptions<'line' | 'bar'>>(() => ({
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
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: true
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
        font: {
          size: 11
        }
      }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      min: 0,
      max: 10,
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
        stepSize: 2,
        font: {
          size: 11
        }
      },
      title: {
        display: true,
        text: '疼痛程度 (0-10)',
        color: 'rgba(255, 255, 255, 0.6)',
        font: {
          size: 12
        }
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      min: 0,
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        color: 'rgba(16, 185, 129, 0.8)',
        stepSize: 1,
        font: {
          size: 11
        }
      },
      title: {
        display: true,
        text: '记录次数',
        color: 'rgba(16, 185, 129, 0.8)',
        font: {
          size: 12
        }
      }
    }
  },
  animation: {
    duration: 800,
    easing: 'easeOutQuart'
  }
}));

const noData = computed(() => props.data.every(d => d.recordCount === 0));

watch(chartType, () => {
  // Trigger chart update when type changes
});
</script>

<template>
  <div class="glass-card p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold">疼痛趋势图</h3>
      <div class="flex gap-2">
        <button
          @click="chartType = 'line'"
          class="px-3 py-1.5 rounded-lg text-sm transition-all"
          :class="chartType === 'line'
            ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white'
            : 'bg-white/10 text-white/60 hover:bg-white/20'"
        >
          折线图
        </button>
        <button
          @click="chartType = 'bar'"
          class="px-3 py-1.5 rounded-lg text-sm transition-all"
          :class="chartType === 'bar'
            ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white'
            : 'bg-white/10 text-white/60 hover:bg-white/20'"
        >
          柱状图
        </button>
      </div>
    </div>
    
    <div v-if="noData" class="h-64 flex items-center justify-center text-white/40">
      <div class="text-center">
        <p class="text-lg mb-2">暂无数据</p>
        <p class="text-sm">记录疼痛数据后即可查看趋势分析</p>
      </div>
    </div>
    
    <div v-else class="h-80">
      <Line v-if="chartType === 'line'" :data="chartData" :options="chartOptions as ChartOptions<'line'>" />
      <Bar v-else :data="chartData" :options="chartOptions as ChartOptions<'bar'>" />
    </div>
  </div>
</template>
