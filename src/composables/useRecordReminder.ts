import { reactive, toRefs, computed } from 'vue';
import { useCheckInStreak } from './useCheckInStreak';
import type { RecordReminderSettings } from '@/types';
import { formatDate, formatTime } from '@/utils/date';
import {
  sendRecordReminder,
  requestNotificationPermission,
  getNotificationPermission,
  scheduleRecordReminderViaSW,
  cancelRecordReminderViaSW
} from '@/utils/notification';

const SETTINGS_STORAGE_KEY = 'record-reminder-settings';
const NOTIFIED_STORAGE_KEY = 'record-reminder-notified';

interface RecordReminderState {
  settings: RecordReminderSettings;
  isLoading: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  nextReminderTime: number | null;
}

const DEFAULT_SETTINGS: RecordReminderSettings = {
  enabled: false,
  reminderTime: '21:00',
  remindOnMissedDays: true
};

let reminderTimerId: number | null = null;

const loadSettings = (): RecordReminderSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const saveSettings = (settings: RecordReminderSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

const hasNotifiedToday = (): boolean => {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.date === formatDate(new Date()) && data.notified;
  } catch {
    return false;
  }
};

const markNotifiedToday = () => {
  try {
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify({
      date: formatDate(new Date()),
      notified: true
    }));
  } catch {
    // ignore
  }
};

export function useRecordReminder() {
  const streakService = useCheckInStreak();

  const state = reactive<RecordReminderState>({
    settings: loadSettings(),
    isLoading: false,
    notificationPermission: getNotificationPermission(),
    nextReminderTime: null
  });

  const isEnabled = computed(() => state.settings.enabled);

  const updateSettings = async (newSettings: Partial<RecordReminderSettings>) => {
    state.settings = { ...state.settings, ...newSettings };
    saveSettings(state.settings);

    if (state.settings.enabled) {
      await scheduleReminder();
    } else {
      cancelReminder();
    }
  };

  const clearReminderTimer = () => {
    if (reminderTimerId !== null) {
      clearTimeout(reminderTimerId);
      reminderTimerId = null;
    }
  };

  const calculateNextReminderTime = (): number | null => {
    if (!state.settings.enabled) return null;

    const now = new Date();
    const [hours, minutes] = state.settings.reminderTime.split(':').map(Number);
    const reminderDate = new Date(now);
    reminderDate.setHours(hours, minutes, 0, 0);

    if (reminderDate.getTime() <= now.getTime()) {
      reminderDate.setDate(reminderDate.getDate() + 1);
    }

    return reminderDate.getTime();
  };

  const checkAndSendReminder = async (force: boolean = false) => {
    state.notificationPermission = getNotificationPermission();
    if (state.notificationPermission !== 'granted') return;
    if (!state.settings.enabled) return;

    const now = new Date();
    const currentTime = formatTime(now);
    const [reminderHours, reminderMinutes] = state.settings.reminderTime.split(':').map(Number);
    const reminderTimeMinutes = reminderHours * 60 + reminderMinutes;
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    const minutesDiff = currentTimeMinutes - reminderTimeMinutes;

    if (minutesDiff < 0) return;
    if (minutesDiff > 60 && !force) return;

    if (hasNotifiedToday()) return;

    await streakService.loadCheckInDates();
    const hasCheckedIn = streakService.hasCheckedInToday.value;
    const currentStreak = streakService.streakStats.value.currentStreak;

    if (hasCheckedIn && !state.settings.remindOnMissedDays) {
      markNotifiedToday();
      return;
    }

    const sent = await sendRecordReminder(currentStreak, hasCheckedIn);
    if (sent) {
      markNotifiedToday();
    }
  };

  const scheduleReminder = async () => {
    clearReminderTimer();
    state.notificationPermission = getNotificationPermission();

    if (!state.settings.enabled) {
      state.nextReminderTime = null;
      await cancelRecordReminderViaSW();
      return;
    }

    if (state.notificationPermission !== 'granted') {
      state.nextReminderTime = null;
      return;
    }

    const nextTime = calculateNextReminderTime();
    state.nextReminderTime = nextTime;

    if (nextTime) {
      const delay = nextTime - Date.now();

      if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
        reminderTimerId = window.setTimeout(() => {
          checkAndSendReminder(true);
          scheduleReminder();
        }, delay);

        await scheduleRecordReminderViaSW({
          time: state.settings.reminderTime,
          fireAt: nextTime
        });
      }
    }
  };

  const cancelReminder = () => {
    clearReminderTimer();
    state.nextReminderTime = null;
    cancelRecordReminderViaSW();
  };

  const enableReminders = async (): Promise<boolean> => {
    const permission = await requestNotificationPermission();
    state.notificationPermission = permission;

    if (permission === 'granted') {
      await updateSettings({ enabled: true });
      return true;
    }
    return false;
  };

  const disableReminders = async () => {
    await updateSettings({ enabled: false });
  };

  const startReminderScheduler = () => {
    if (state.settings.enabled) {
      scheduleReminder();
      checkAndSendReminder(true);
    }
  };

  const stopReminderScheduler = () => {
    cancelReminder();
  };

  return {
    ...toRefs(state),
    isEnabled,
    updateSettings,
    enableReminders,
    disableReminders,
    scheduleReminder,
    cancelReminder,
    checkAndSendReminder,
    startReminderScheduler,
    stopReminderScheduler
  };
}
