import { ref, computed } from 'vue';
import { usePainRecord } from './usePainRecord';
import type { TimeRange, TrendDataPoint, FullRecord } from '@/types';
import { getWeekRange, getMonthRange, getDateLabelsForWeek, getDateLabelsForMonth } from '@/utils/date';

export function useTrends() {
  const recordService = usePainRecord();

  const timeRange = ref<TimeRange>('week');
  const currentDate = ref(new Date());
  const isLoading = ref(false);
  const trendData = ref<TrendDataPoint[]>([]);
  const allRecords = ref<FullRecord[]>([]);

  const dateRange = computed(() => {
    return timeRange.value === 'week'
      ? getWeekRange(currentDate.value)
      : getMonthRange(currentDate.value);
  });

  const dateLabels = computed(() => {
    return timeRange.value === 'week'
      ? getDateLabelsForWeek(dateRange.value.start)
      : getDateLabelsForMonth(dateRange.value.start);
  });

  const loadTrendData = async () => {
    isLoading.value = true;
    try {
      const { start, end } = dateRange.value;
      allRecords.value = await recordService.getRecordsByDateRange(start, end);
      
      const recordsByDate: Record<string, FullRecord[]> = {};
      
      for (const record of allRecords.value) {
        if (!recordsByDate[record.date]) {
          recordsByDate[record.date] = [];
        }
        recordsByDate[record.date].push(record);
      }

      trendData.value = dateLabels.value.map(date => {
        const records = recordsByDate[date] || [];
        const painLevels = records.map(r => r.painLevel);
        
        const triggerCounts: Record<string, number> = {};
        const bodyPartCounts: Record<string, number> = {};
        
        for (const r of records) {
          for (const t of r.triggers) {
            triggerCounts[t] = (triggerCounts[t] || 0) + 1;
          }
          for (const b of r.bodyParts) {
            bodyPartCounts[b] = (bodyPartCounts[b] || 0) + 1;
          }
        }

        return {
          date,
          avgPain: painLevels.length > 0 ? Math.round(painLevels.reduce((a, b) => a + b, 0) / painLevels.length * 10) / 10 : 0,
          maxPain: painLevels.length > 0 ? Math.max(...painLevels) : 0,
          recordCount: records.length,
          triggers: triggerCounts,
          bodyParts: bodyPartCounts
        };
      });
    } finally {
      isLoading.value = false;
    }
  };

  const previousPeriod = () => {
    const newDate = new Date(currentDate.value);
    if (timeRange.value === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    currentDate.value = newDate;
  };

  const nextPeriod = () => {
    const newDate = new Date(currentDate.value);
    if (timeRange.value === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    const today = new Date();
    if (newDate <= today) {
      currentDate.value = newDate;
    }
  };

  const setTimeRange = (range: TimeRange) => {
    timeRange.value = range;
    currentDate.value = new Date();
  };

  const getTopTriggers = computed(() => {
    const allCounts: Record<string, number> = {};
    for (const record of allRecords.value) {
      for (const t of record.triggers) {
        allCounts[t] = (allCounts[t] || 0) + 1;
      }
    }
    return Object.entries(allCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  });

  const getTopBodyParts = computed(() => {
    const allCounts: Record<string, number> = {};
    for (const record of allRecords.value) {
      for (const b of record.bodyParts) {
        allCounts[b] = (allCounts[b] || 0) + 1;
      }
    }
    return Object.entries(allCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  });

  const getAveragePain = computed(() => {
    const validData = trendData.value.filter(d => d.recordCount > 0);
    if (validData.length === 0) return 0;
    const sum = validData.reduce((acc, d) => acc + d.avgPain, 0);
    return Math.round(sum / validData.length * 10) / 10;
  });

  const getTotalRecords = computed(() => {
    return trendData.value.reduce((acc, d) => acc + d.recordCount, 0);
  });

  const getWeatherCorrelation = computed(() => {
    const recordsWithWeather = allRecords.value.filter(r => r.weather);
    if (recordsWithWeather.length < 3) return [];

    const tempGroups: Record<string, number[]> = {
      '低温(<10℃)': [],
      '常温(10-25℃)': [],
      '高温(>25℃)': []
    };

    for (const r of recordsWithWeather) {
      const temp = r.weather!.temperature;
      if (temp < 10) tempGroups['低温(<10℃)'].push(r.painLevel);
      else if (temp > 25) tempGroups['高温(>25℃)'].push(r.painLevel);
      else tempGroups['常温(10-25℃)'].push(r.painLevel);
    }

    return Object.entries(tempGroups)
      .filter(([_, levels]) => levels.length > 0)
      .map(([group, levels]) => ({
        group,
        avgPain: Math.round(levels.reduce((a, b) => a + b, 0) / levels.length * 10) / 10,
        count: levels.length
      }));
  });

  return {
    timeRange,
    currentDate,
    isLoading,
    trendData,
    allRecords,
    dateRange,
    dateLabels,
    loadTrendData,
    previousPeriod,
    nextPeriod,
    setTimeRange,
    getTopTriggers,
    getTopBodyParts,
    getAveragePain,
    getTotalRecords,
    getWeatherCorrelation
  };
}
