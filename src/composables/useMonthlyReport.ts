import { ref, computed } from 'vue';
import { usePainRecord } from './usePainRecord';
import { useMedicationReminder } from './useMedicationReminder';
import { useIndexedDB } from './useIndexedDB';
import type { FullRecord, MedicationLog } from '@/types';
import { formatDate, getMonthRange } from '@/utils/date';

export interface MonthlyStats {
  month: string;
  year: number;
  totalRecords: number;
  daysWithRecords: number;
  avgPain: number;
  maxPain: number;
  minPain: number;
  painDistribution: number[];
  topTriggers: Array<{ name: string; count: number; percentage: number }>;
  topBodyParts: Array<{ name: string; count: number; percentage: number }>;
  dailyTrend: Array<{ date: string; avgPain: number; maxPain: number; count: number }>;
  medicationStats: {
    totalScheduled: number;
    totalTaken: number;
    totalMissed: number;
    adherenceRate: number;
    medications: Array<{ name: string; dosage: string; scheduled: number; taken: number; adherenceRate: number }>;
  };
  severePainDays: number;
  consecutiveDays: number;
  weatherCorrelation?: Array<{ group: string; avgPain: number; count: number }>;
}

export function useMonthlyReport() {
  const recordService = usePainRecord();
  const medicationService = useMedicationReminder();
  const db = useIndexedDB();

  const currentDate = ref(new Date());
  const isLoading = ref(false);
  const monthlyStats = ref<MonthlyStats | null>(null);
  const allRecords = ref<FullRecord[]>([]);
  const medicationLogs = ref<MedicationLog[]>([]);

  const monthRange = computed(() => getMonthRange(currentDate.value));

  const previousMonth = () => {
    const d = new Date(currentDate.value);
    d.setMonth(d.getMonth() - 1);
    currentDate.value = d;
  };

  const nextMonth = () => {
    const d = new Date(currentDate.value);
    d.setMonth(d.getMonth() + 1);
    const today = new Date();
    if (d <= today) {
      currentDate.value = d;
    }
  };

  const goToMonth = (year: number, month: number) => {
    currentDate.value = new Date(year, month, 1);
  };

  const calculateConsecutiveDays = (dates: string[]): number => {
    if (dates.length === 0) return 0;
    const sortedDates = [...new Set(dates)].sort();
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    return maxStreak;
  };

  const generateMonthlyReport = async (): Promise<MonthlyStats | null> => {
    isLoading.value = true;
    try {
      const { start, end } = monthRange.value;
      allRecords.value = await recordService.getRecordsByDateRange(start, end);
      medicationLogs.value = await medicationService.calculateAdherence('month')
        .then(() => {
          const db = (recordService as any).db || null;
          return [];
        })
        .catch(() => []);

      const adherenceStats = await medicationService.calculateAdherence('month');

      const records = allRecords.value;

      if (records.length === 0) {
        monthlyStats.value = {
          month: `${currentDate.value.getFullYear()}年${currentDate.value.getMonth() + 1}月`,
          year: currentDate.value.getFullYear(),
          totalRecords: 0,
          daysWithRecords: 0,
          avgPain: 0,
          maxPain: 0,
          minPain: 0,
          painDistribution: [0, 0, 0, 0, 0],
          topTriggers: [],
          topBodyParts: [],
          dailyTrend: [],
          medicationStats: {
            totalScheduled: adherenceStats.totalScheduled,
            totalTaken: adherenceStats.totalTaken,
            totalMissed: adherenceStats.totalMissed,
            adherenceRate: adherenceStats.adherenceRate,
            medications: []
          },
          severePainDays: 0,
          consecutiveDays: 0
        };
        return monthlyStats.value;
      }

      const uniqueDates = new Set(records.map(r => r.date));
      const daysWithRecords = uniqueDates.size;

      const painLevels = records.map(r => r.painLevel);
      const avgPain = Math.round(painLevels.reduce((a, b) => a + b, 0) / painLevels.length * 10) / 10;
      const maxPain = Math.max(...painLevels);
      const minPain = Math.min(...painLevels);

      const painDistribution = [0, 0, 0, 0, 0];
      for (const level of painLevels) {
        if (level <= 2) painDistribution[0]++;
        else if (level <= 4) painDistribution[1]++;
        else if (level <= 6) painDistribution[2]++;
        else if (level <= 8) painDistribution[3]++;
        else painDistribution[4]++;
      }

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

      const totalTriggerCount = Object.values(triggerCounts).reduce((a, b) => a + b, 0);
      const totalBodyPartCount = Object.values(bodyPartCounts).reduce((a, b) => a + b, 0);

      const topTriggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalTriggerCount > 0 ? Math.round(count / totalTriggerCount * 100) : 0
        }));

      const topBodyParts = Object.entries(bodyPartCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalBodyPartCount > 0 ? Math.round(count / totalBodyPartCount * 100) : 0
        }));

      const recordsByDate: Record<string, FullRecord[]> = {};
      for (const r of records) {
        if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
        recordsByDate[r.date].push(r);
      }

      const startDate = new Date(start);
      const endDate = new Date(end);
      const dailyTrend: MonthlyStats['dailyTrend'] = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(d);
        const dayRecords = recordsByDate[dateStr] || [];
        const dayPainLevels = dayRecords.map(r => r.painLevel);
        dailyTrend.push({
          date: dateStr,
          avgPain: dayPainLevels.length > 0
            ? Math.round(dayPainLevels.reduce((a, b) => a + b, 0) / dayPainLevels.length * 10) / 10
            : 0,
          maxPain: dayPainLevels.length > 0 ? Math.max(...dayPainLevels) : 0,
          count: dayRecords.length
        });
      }

      const severePainDays = dailyTrend.filter(d => d.avgPain >= 7).length;
      const consecutiveDays = calculateConsecutiveDays(records.map(r => r.date));

      const recordsWithWeather = records.filter(r => r.weather);
      let weatherCorrelation: MonthlyStats['weatherCorrelation'] = undefined;
      if (recordsWithWeather.length >= 3) {
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
        weatherCorrelation = Object.entries(tempGroups)
          .filter(([_, levels]) => levels.length > 0)
          .map(([group, levels]) => ({
            group,
            avgPain: Math.round(levels.reduce((a, b) => a + b, 0) / levels.length * 10) / 10,
            count: levels.length
          }));
      }

      const medicationStats: MonthlyStats['medicationStats'] = {
        totalScheduled: adherenceStats.totalScheduled,
        totalTaken: adherenceStats.totalTaken,
        totalMissed: adherenceStats.totalMissed,
        adherenceRate: adherenceStats.adherenceRate,
        medications: []
      };

      try {
        const logs = await db.getMedicationLogsByDateRange(start, end);
        medicationLogs.value = logs;
        const medGrouped: Record<string, { name: string; dosage: string; scheduled: number; taken: number }> = {};
        for (const log of logs) {
          const key = `${log.medicationName}|${log.dosage}`;
          if (!medGrouped[key]) {
            medGrouped[key] = {
              name: log.medicationName,
              dosage: log.dosage,
              scheduled: 0,
              taken: 0
            };
          }
          medGrouped[key].scheduled++;
          if (log.taken) medGrouped[key].taken++;
        }
        medicationStats.medications = Object.values(medGrouped)
          .sort((a, b) => b.scheduled - a.scheduled)
          .map(m => ({
            ...m,
            adherenceRate: m.scheduled > 0 ? Math.round((m.taken / m.scheduled) * 100) : 0
          }));
      } catch {
      }

      monthlyStats.value = {
        month: `${currentDate.value.getFullYear()}年${currentDate.value.getMonth() + 1}月`,
        year: currentDate.value.getFullYear(),
        totalRecords: records.length,
        daysWithRecords,
        avgPain,
        maxPain,
        minPain,
        painDistribution,
        topTriggers,
        topBodyParts,
        dailyTrend,
        medicationStats,
        severePainDays,
        consecutiveDays,
        weatherCorrelation
      };

      return monthlyStats.value;
    } finally {
      isLoading.value = false;
    }
  };

  const getMonthDisplay = computed(() => {
    return `${currentDate.value.getFullYear()}年${currentDate.value.getMonth() + 1}月`;
  });

  return {
    currentDate,
    isLoading,
    monthlyStats,
    allRecords,
    medicationLogs,
    monthRange,
    getMonthDisplay,
    previousMonth,
    nextMonth,
    goToMonth,
    generateMonthlyReport
  };
}
