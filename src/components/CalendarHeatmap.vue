<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { formatDate } from '@/utils/date';
import type { FullRecord } from '@/types';

const props = defineProps<{
  records: FullRecord[];
  selectedDate?: string;
}>();

const emit = defineEmits<{
  (e: 'select-date', date: string): void;
}>();

const currentMonth = ref(new Date());

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

interface DayData {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  avgPain: number;
  maxPain: number;
  recordCount: number;
  hasRecords: boolean;
}

const monthData = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  const days: DayData[] = [];
  
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    days.push(createDayData(date, false));
  }
  
  const daysInMonth = lastDay.getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    days.push(createDayData(date, true));
  }
  
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push(createDayData(date, false));
  }
  
  return days;
});

const createDayData = (date: Date, isCurrentMonth: boolean): DayData => {
  const dateStr = formatDate(date);
  const todayStr = formatDate(new Date());
  
  const dayRecords = props.records.filter(r => r.date === dateStr);
  const hasRecords = dayRecords.length > 0;
  
  let avgPain = 0;
  let maxPain = 0;
  
  if (hasRecords) {
    avgPain = dayRecords.reduce((sum, r) => sum + r.painLevel, 0) / dayRecords.length;
    maxPain = Math.max(...dayRecords.map(r => r.painLevel));
  }
  
  return {
    date: dateStr,
    day: date.getDate(),
    isCurrentMonth,
    isToday: dateStr === todayStr,
    avgPain: Math.round(avgPain * 10) / 10,
    maxPain,
    recordCount: dayRecords.length,
    hasRecords
  };
};

const monthTitle = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth() + 1;
  return `${year}年${month}月`;
});

const prevMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  );
};

const nextMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1
  );
};

const goToToday = () => {
  currentMonth.value = new Date();
};

const selectDate = (day: DayData) => {
  if (day.hasRecords) {
    emit('select-date', day.date);
  }
};

const getHeatmapClass = (day: DayData) => {
  if (!day.hasRecords) {
    return 'bg-white/5 text-white/30';
  }
  
  const pain = day.maxPain;
  
  if (pain <= 2) {
    return 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30';
  }
  if (pain <= 4) {
    return 'bg-emerald-500/40 text-emerald-200 hover:bg-emerald-500/50';
  }
  if (pain <= 6) {
    return 'bg-yellow-500/40 text-yellow-200 hover:bg-yellow-500/50';
  }
  if (pain <= 8) {
    return 'bg-orange-500/50 text-orange-200 hover:bg-orange-500/60';
  }
  return 'bg-red-500/60 text-red-100 hover:bg-red-500/70';
};

const isSelected = (day: DayData) => {
  return props.selectedDate === day.date;
};
</script>

<template>
  <div class="glass-card p-4">
    <div class="flex items-center justify-between mb-4">
      <button
        @click="prevMonth"
        class="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
      >
        <ChevronLeft :size="20" />
      </button>
      
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-bold">{{ monthTitle }}</h3>
        <button
          @click="goToToday"
          class="text-xs px-3 py-1 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
        >
          今天
        </button>
      </div>
      
      <button
        @click="nextMonth"
        class="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
      >
        <ChevronRight :size="20" />
      </button>
    </div>
    
    <div class="grid grid-cols-7 gap-1 mb-2">
      <div
        v-for="day in weekdays"
        :key="day"
        class="text-center text-xs text-white/50 py-2 font-medium"
      >
        {{ day }}
      </div>
    </div>
    
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="(day, index) in monthData"
        :key="index"
        @click="selectDate(day)"
        class="aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 relative"
        :class="[
          getHeatmapClass(day),
          day.isCurrentMonth ? '' : 'opacity-40',
          day.hasRecords ? 'cursor-pointer' : 'cursor-default',
          isSelected(day) ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-105' : ''
        ]"
        :title="day.hasRecords ? `${day.date}：平均${day.avgPain}级，最高${day.maxPain}级，共${day.recordCount}条记录` : `${day.date}：暂无记录`"
      >
        <span>{{ day.day }}</span>
        <span v-if="day.recordCount > 1" class="text-[10px] mt-0.5 opacity-80">
          {{ day.recordCount }}条
        </span>
        
        <div
          v-if="day.isToday"
          class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full"
        ></div>
      </div>
    </div>
    
    <div class="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-white/10">
      <span class="text-xs text-white/50">疼痛强度：</span>
      <div class="flex items-center gap-1">
        <div class="w-5 h-5 rounded bg-white/5" title="无记录"></div>
        <span class="text-xs text-white/40">无</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-5 h-5 rounded bg-emerald-500/30" title="轻微"></div>
        <span class="text-xs text-white/40">轻</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-5 h-5 rounded bg-yellow-500/40" title="中度"></div>
        <span class="text-xs text-white/40">中</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-5 h-5 rounded bg-orange-500/50" title="较重"></div>
        <span class="text-xs text-white/40">重</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-5 h-5 rounded bg-red-500/60" title="严重"></div>
        <span class="text-xs text-white/40">剧</span>
      </div>
    </div>
  </div>
</template>
