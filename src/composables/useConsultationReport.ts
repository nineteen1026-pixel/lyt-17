import { ref, computed } from 'vue';
import { usePainRecord } from './usePainRecord';
import { useIndexedDB } from './useIndexedDB';
import type { FullRecord, MedicationLog } from '@/types';
import { formatDate } from '@/utils/date';

export interface ConsultationStats {
  startDate: string;
  endDate: string;
  totalRecords: number;
  daysWithRecords: number;
  totalDays: number;
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
  painTrendDirection: 'increasing' | 'decreasing' | 'stable';
  bodyPartSummary: Array<{ name: string; count: number; avgPain: number; percentage: number }>;
}

export function useConsultationReport() {
  const recordService = usePainRecord();
  const db = useIndexedDB();

  const startDate = ref(formatDate(new Date(new Date().setDate(new Date().getDate() - 30))));
  const endDate = ref(formatDate(new Date()));
  const isLoading = ref(false);
  const consultationStats = ref<ConsultationStats | null>(null);

  const setDateRange = (start: string, end: string) => {
    startDate.value = start;
    endDate.value = end;
  };

  const setPresetRange = (preset: 'week' | 'half-month' | 'month' | 'quarter' | 'half-year') => {
    const now = new Date();
    const end = formatDate(now);
    let start: string;
    switch (preset) {
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        start = formatDate(d);
        break;
      }
      case 'half-month': {
        const d = new Date(now);
        d.setDate(d.getDate() - 15);
        start = formatDate(d);
        break;
      }
      case 'month': {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        start = formatDate(d);
        break;
      }
      case 'quarter': {
        const d = new Date(now);
        d.setDate(d.getDate() - 90);
        start = formatDate(d);
        break;
      }
      case 'half-year': {
        const d = new Date(now);
        d.setDate(d.getDate() - 180);
        start = formatDate(d);
        break;
      }
    }
    startDate.value = start;
    endDate.value = end;
  };

  const computeTrendDirection = (dailyTrend: ConsultationStats['dailyTrend']): 'increasing' | 'decreasing' | 'stable' => {
    const withData = dailyTrend.filter(d => d.count > 0);
    if (withData.length < 3) return 'stable';
    const firstThird = withData.slice(0, Math.ceil(withData.length / 3));
    const lastThird = withData.slice(-Math.ceil(withData.length / 3));
    const firstAvg = firstThird.reduce((s, d) => s + d.avgPain, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((s, d) => s + d.avgPain, 0) / lastThird.length;
    const diff = lastAvg - firstAvg;
    if (diff > 0.5) return 'increasing';
    if (diff < -0.5) return 'decreasing';
    return 'stable';
  };

  const computeMedicationStatsFromLogs = (logs: MedicationLog[]): ConsultationStats['medicationStats'] => {
    const totalScheduled = logs.length;
    const totalTaken = logs.filter(l => l.taken).length;
    const totalMissed = totalScheduled - totalTaken;
    const adherenceRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

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

    const medications = Object.values(medGrouped)
      .sort((a, b) => b.scheduled - a.scheduled)
      .map(m => ({
        ...m,
        adherenceRate: m.scheduled > 0 ? Math.round((m.taken / m.scheduled) * 100) : 0
      }));

    return { totalScheduled, totalTaken, totalMissed, adherenceRate, medications };
  };

  const generateConsultationReport = async (): Promise<ConsultationStats | null> => {
    isLoading.value = true;
    try {
      const records: FullRecord[] = await recordService.getRecordsByDateRange(startDate.value, endDate.value);

      let logs: MedicationLog[] = [];
      try {
        logs = await db.getMedicationLogsByDateRange(startDate.value, endDate.value);
      } catch {
      }
      const medicationStats = computeMedicationStatsFromLogs(logs);

      const start = new Date(startDate.value);
      const end = new Date(endDate.value);
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (records.length === 0) {
        consultationStats.value = {
          startDate: startDate.value,
          endDate: endDate.value,
          totalRecords: 0,
          daysWithRecords: 0,
          totalDays,
          avgPain: 0,
          maxPain: 0,
          minPain: 0,
          painDistribution: [0, 0, 0, 0, 0],
          topTriggers: [],
          topBodyParts: [],
          dailyTrend: [],
          medicationStats,
          severePainDays: 0,
          painTrendDirection: 'stable',
          bodyPartSummary: []
        };
        return consultationStats.value;
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
      const bodyPartData: Record<string, { count: number; painSum: number }> = {};
      for (const r of records) {
        for (const t of r.triggers) {
          triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        }
        for (const b of r.bodyParts) {
          if (!bodyPartData[b]) {
            bodyPartData[b] = { count: 0, painSum: 0 };
          }
          bodyPartData[b].count++;
          bodyPartData[b].painSum += r.painLevel;
        }
      }

      const totalTriggerCount = Object.values(triggerCounts).reduce((a, b) => a + b, 0);
      const totalBodyPartCount = Object.values(bodyPartData).reduce((a, b) => a + b.count, 0);

      const topTriggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalTriggerCount > 0 ? Math.round(count / totalTriggerCount * 100) : 0
        }));

      const topBodyParts = Object.entries(bodyPartData)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([name, data]) => ({
          name,
          count: data.count,
          percentage: totalBodyPartCount > 0 ? Math.round(data.count / totalBodyPartCount * 100) : 0
        }));

      const bodyPartSummary = Object.entries(bodyPartData)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({
          name,
          count: data.count,
          avgPain: Math.round(data.painSum / data.count * 10) / 10,
          percentage: totalBodyPartCount > 0 ? Math.round(data.count / totalBodyPartCount * 100) : 0
        }));

      const recordsByDate: Record<string, FullRecord[]> = {};
      for (const r of records) {
        if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
        recordsByDate[r.date].push(r);
      }

      const startDateObj = new Date(startDate.value);
      const endDateObj = new Date(endDate.value);
      const dailyTrend: ConsultationStats['dailyTrend'] = [];

      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
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
      const painTrendDirection = computeTrendDirection(dailyTrend);

      consultationStats.value = {
        startDate: startDate.value,
        endDate: endDate.value,
        totalRecords: records.length,
        daysWithRecords,
        totalDays,
        avgPain,
        maxPain,
        minPain,
        painDistribution,
        topTriggers,
        topBodyParts,
        dailyTrend,
        medicationStats,
        severePainDays,
        painTrendDirection,
        bodyPartSummary
      };

      return consultationStats.value;
    } finally {
      isLoading.value = false;
    }
  };

  const dateRangeDisplay = computed(() => {
    const s = new Date(startDate.value);
    const e = new Date(endDate.value);
    return `${s.getFullYear()}/${s.getMonth() + 1}/${s.getDate()} - ${e.getFullYear()}/${e.getMonth() + 1}/${e.getDate()}`;
  });

  return {
    startDate,
    endDate,
    isLoading,
    consultationStats,
    dateRangeDisplay,
    setDateRange,
    setPresetRange,
    generateConsultationReport
  };
}
