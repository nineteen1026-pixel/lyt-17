import { reactive, toRefs, computed, ref } from 'vue';
import { useIndexedDB } from './useIndexedDB';
import type { MedicationPlan, MedicationLog, TodayMedication, AdherenceStats } from '@/types';
import { formatDate, formatDateTime, formatTime, getWeekRange, getMonthRange } from '@/utils/date';
import { sendMedicationReminder, requestNotificationPermission, getNotificationPermission } from '@/utils/notification';

interface MedicationReminderState {
  plans: MedicationPlan[];
  todayMedications: TodayMedication[];
  isLoading: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  nextCheckTime: number | null;
}

const NOTIFIED_STORAGE_KEY = 'medication_notified_keys';
const MAX_CATCHUP_MINUTES = 120;
let checkIntervalId: number | null = null;

const loadNotifiedKeys = (): Set<string> => {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
};

const saveNotifiedKeys = (keys: Set<string>) => {
  try {
    const today = formatDate(new Date());
    const filtered = [...keys].filter(k => k.includes(`-${today}-`));
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
};

let NOTIFIED_KEYS: Set<string> = loadNotifiedKeys();

export function useMedicationReminder() {
  const db = useIndexedDB();

  const state = reactive<MedicationReminderState>({
    plans: [],
    todayMedications: [],
    isLoading: false,
    notificationPermission: getNotificationPermission(),
    nextCheckTime: null
  });

  const plansChanged = ref(0);

  const markNotified = (key: string) => {
    NOTIFIED_KEYS.add(key);
    saveNotifiedKeys(NOTIFIED_KEYS);
  };

  const loadPlans = async () => {
    state.isLoading = true;
    try {
      state.plans = await db.getAllMedicationPlans();
    } finally {
      state.isLoading = false;
    }
  };

  const isPlanActiveToday = (plan: MedicationPlan, date: Date): boolean => {
    const dateStr = formatDate(date);

    if (plan.startDate && dateStr < plan.startDate) {
      return false;
    }
    if (plan.endDate && dateStr > plan.endDate) {
      return false;
    }

    if (plan.daysOfWeek && plan.daysOfWeek.length > 0) {
      const dayOfWeek = date.getDay();
      return plan.daysOfWeek.includes(dayOfWeek);
    }

    return true;
  };

  const generateTodayLogs = async (targetDate?: Date) => {
    const date = targetDate || new Date();
    const dateStr = formatDate(date);
    const enabledPlans = await db.getEnabledMedicationPlans();

    for (const plan of enabledPlans) {
      if (!isPlanActiveToday(plan, date)) continue;
      if (!plan.times || plan.times.length === 0) continue;

      for (const time of plan.times) {
        const existingLog = await db.findMedicationLog(plan.id!, dateStr, time);
        if (!existingLog) {
          const log: Omit<MedicationLog, 'id'> = {
            planId: plan.id!,
            scheduledDate: dateStr,
            scheduledTime: time,
            medicationName: plan.name,
            dosage: plan.dosage,
            taken: false,
            createdAt: formatDateTime(new Date())
          };
          await db.addMedicationLog(log);
        }
      }
    }
  };

  const loadTodayMedications = async () => {
    state.isLoading = true;
    try {
      const now = new Date();
      const dateStr = formatDate(now);
      const currentTime = formatTime(now);

      await generateTodayLogs(now);
      const logs = await db.getMedicationLogsByDate(dateStr);

      state.todayMedications = logs.map(log => {
        const overdue = !log.taken && log.scheduledTime < currentTime;
        return {
          logId: log.id,
          planId: log.planId,
          name: log.medicationName,
          dosage: log.dosage,
          scheduledTime: log.scheduledTime,
          taken: log.taken,
          takenAt: log.takenAt,
          overdue
        };
      }).sort((a, b) => {
        if (a.taken !== b.taken) return a.taken ? 1 : -1;
        return a.scheduledTime.localeCompare(b.scheduledTime);
      });
    } finally {
      state.isLoading = false;
    }
  };

  const addPlan = async (planData: {
    name: string;
    dosage: string;
    times: string[];
    daysOfWeek: number[];
    startDate: string;
    endDate?: string;
    notes?: string;
  }): Promise<number> => {
    if (!planData.name || !planData.name.trim()) {
      throw new Error('请输入药物名称');
    }
    if (!planData.times || planData.times.length === 0) {
      throw new Error('请至少设置一个服药时间');
    }
    if (!planData.startDate) {
      throw new Error('请设置开始日期');
    }

    const now = formatDateTime(new Date());
    const plan: Omit<MedicationPlan, 'id'> = {
      name: planData.name.trim(),
      dosage: planData.dosage || '',
      times: planData.times.sort(),
      daysOfWeek: planData.daysOfWeek || [],
      startDate: planData.startDate,
      endDate: planData.endDate,
      notes: planData.notes,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };

    const id = await db.addMedicationPlan(plan);
    plansChanged.value++;
    await loadPlans();
    await generateTodayLogs();
    await loadTodayMedications();
    return id;
  };

  const updatePlan = async (planId: number, planData: Partial<MedicationPlan>): Promise<boolean> => {
    const existing = await db.getMedicationPlan(planId);
    if (!existing) return false;

    const updated: MedicationPlan = {
      ...existing,
      ...planData,
      id: planId,
      updatedAt: formatDateTime(new Date())
    };

    if (updated.name) updated.name = updated.name.trim();
    if (updated.times) updated.times = [...updated.times].sort();

    await db.updateMedicationPlan(updated);
    plansChanged.value++;
    await loadPlans();
    await generateTodayLogs();
    await loadTodayMedications();
    return true;
  };

  const deletePlan = async (planId: number): Promise<void> => {
    await db.deleteMedicationPlan(planId);
    plansChanged.value++;
    await loadPlans();
    await loadTodayMedications();
  };

  const togglePlanEnabled = async (planId: number): Promise<boolean> => {
    const existing = await db.getMedicationPlan(planId);
    if (!existing) return false;

    const updated: MedicationPlan = {
      ...existing,
      enabled: !existing.enabled,
      updatedAt: formatDateTime(new Date())
    };

    await db.updateMedicationPlan(updated);
    plansChanged.value++;
    await loadPlans();
    await generateTodayLogs();
    await loadTodayMedications();
    return !existing.enabled;
  };

  const markTaken = async (logId: number): Promise<boolean> => {
    const logs = await db.getMedicationLogsByDate(formatDate(new Date()));
    const log = logs.find(l => l.id === logId);
    if (!log) return false;

    const updated: MedicationLog = {
      ...log,
      taken: true,
      takenAt: formatDateTime(new Date())
    };

    await db.updateMedicationLog(updated);
    await loadTodayMedications();
    return true;
  };

  const markTakenByPlanAndTime = async (planId: number, scheduledDate: string, scheduledTime: string): Promise<boolean> => {
    const log = await db.findMedicationLog(planId, scheduledDate, scheduledTime);
    if (!log) return false;

    const updated: MedicationLog = {
      ...log,
      taken: true,
      takenAt: formatDateTime(new Date())
    };

    await db.updateMedicationLog(updated);
    await loadTodayMedications();
    return true;
  };

  const unmarkTaken = async (logId: number): Promise<boolean> => {
    const logs = await db.getMedicationLogsByDate(formatDate(new Date()));
    const log = logs.find(l => l.id === logId);
    if (!log) return false;

    const updated: MedicationLog = {
      ...log,
      taken: false,
      takenAt: undefined
    };

    await db.updateMedicationLog(updated);
    await loadTodayMedications();
    return true;
  };

  const calculateAdherence = async (period: 'today' | 'week' | 'month' = 'week'): Promise<AdherenceStats> => {
    const now = new Date();
    let startDate: string;
    let endDate: string;

    if (period === 'today') {
      startDate = formatDate(now);
      endDate = startDate;
    } else if (period === 'week') {
      const range = getWeekRange(now);
      startDate = range.start;
      endDate = range.end;
    } else {
      const range = getMonthRange(now);
      startDate = range.start;
      endDate = range.end;
    }

    const logs = await db.getMedicationLogsByDateRange(startDate, endDate);
    const totalScheduled = logs.length;
    const totalTaken = logs.filter(l => l.taken).length;
    const totalMissed = totalScheduled - totalTaken;
    const adherenceRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

    return {
      adherenceRate,
      totalScheduled,
      totalTaken,
      totalMissed,
      period
    };
  };

  const calculateTodayAdherence = async (): Promise<AdherenceStats> => {
    return await calculateAdherence('today');
  };

  const checkAndSendNotifications = async (catchUp: boolean = false) => {
    state.notificationPermission = getNotificationPermission();
    if (state.notificationPermission !== 'granted') {
      return;
    }

    const now = new Date();
    const dateStr = formatDate(now);
    const currentTime = formatTime(now);

    await generateTodayLogs(now);
    await loadTodayMedications();

    const enabledPlans = await db.getEnabledMedicationPlans();
    const maxPastMinutes = catchUp ? MAX_CATCHUP_MINUTES : 5;

    for (const plan of enabledPlans) {
      if (!isPlanActiveToday(plan, now)) continue;
      if (!plan.times) continue;

      for (const time of plan.times) {
        const notifyKey = `${plan.id}-${dateStr}-${time}`;
        if (NOTIFIED_KEYS.has(notifyKey)) continue;

        const [hours, minutes] = time.split(':').map(Number);
        const scheduledDate = new Date(now);
        scheduledDate.setHours(hours, minutes, 0, 0);

        const diffMinutes = (now.getTime() - scheduledDate.getTime()) / 1000 / 60;

        if (diffMinutes >= 0 && diffMinutes <= maxPastMinutes) {
          const log = await db.findMedicationLog(plan.id!, dateStr, time);
          if (log && log.taken) {
            markNotified(notifyKey);
            continue;
          }

          sendMedicationReminder(plan.name, plan.dosage, time, plan.id);
          markNotified(notifyKey);
        } else if (diffMinutes > maxPastMinutes) {
          markNotified(notifyKey);
        }
      }
    }
  };

  const startNotificationScheduler = () => {
    if (checkIntervalId !== null) {
      return;
    }

    checkAndSendNotifications(true);

    checkIntervalId = window.setInterval(() => {
      checkAndSendNotifications(false);
    }, 30000);
  };

  const stopNotificationScheduler = () => {
    if (checkIntervalId !== null) {
      clearInterval(checkIntervalId);
      checkIntervalId = null;
    }
  };

  const enableNotifications = async (): Promise<boolean> => {
    const permission = await requestNotificationPermission();
    state.notificationPermission = permission;
    if (permission === 'granted') {
      startNotificationScheduler();
      return true;
    }
    return false;
  };

  const todayPendingCount = computed(() =>
    state.todayMedications.filter(m => !m.taken).length
  );

  const todayTakenCount = computed(() =>
    state.todayMedications.filter(m => m.taken).length
  );

  const todayOverdueCount = computed(() =>
    state.todayMedications.filter(m => m.overdue && !m.taken).length
  );

  const activePlansCount = computed(() =>
    state.plans.filter(p => p.enabled).length
  );

  return {
    ...toRefs(state),
    plansChanged,
    loadPlans,
    loadTodayMedications,
    generateTodayLogs,
    addPlan,
    updatePlan,
    deletePlan,
    togglePlanEnabled,
    markTaken,
    markTakenByPlanAndTime,
    unmarkTaken,
    calculateAdherence,
    calculateTodayAdherence,
    checkAndSendNotifications,
    startNotificationScheduler,
    stopNotificationScheduler,
    enableNotifications,
    todayPendingCount,
    todayTakenCount,
    todayOverdueCount,
    activePlansCount
  };
}
