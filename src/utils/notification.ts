export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export async function sendNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
  }
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const reg = await getSWRegistration();
  if (reg) {
    try {
      reg.showNotification(title, {
        body: options?.body,
        icon: options?.icon || '/icon.svg',
        tag: options?.tag,
        requireInteraction: options?.requireInteraction ?? false,
        data: options?.data
      });
      return true;
    } catch {
      // fallback to main thread notification
    }
  }

  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/icon.svg',
      tag: options?.tag,
      requireInteraction: options?.requireInteraction ?? false,
      silent: false,
      data: options?.data
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    setTimeout(() => notification.close(), 30000);
    return true;
  } catch {
    return false;
  }
}

export async function sendMedicationReminder(
  medicationName: string,
  dosage: string,
  scheduledTime: string,
  planId?: number
): Promise<boolean> {
  const body = dosage
    ? `请服用 ${dosage} 的 ${medicationName}（${scheduledTime}）`
    : `请服用 ${medicationName}（${scheduledTime}）`;

  return await sendNotification(`💊 用药提醒：${medicationName}`, {
    body,
    tag: `medication-${planId ?? 'unknown'}-${scheduledTime}`,
    requireInteraction: true,
    data: { type: 'medication-reminder', planId, medicationName, scheduledTime }
  });
}

export interface ScheduledMedication {
  name: string;
  dosage: string;
  time: string;
  planId: number;
  fireAt: number;
}

export async function scheduleMedicationsViaSW(medications: ScheduledMedication[]): Promise<boolean> {
  const reg = await getSWRegistration();
  if (!reg || !reg.active) return false;

  try {
    reg.active.postMessage({
      type: 'SCHEDULE_MEDICATIONS',
      medications
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelSchedulesViaSW(): Promise<boolean> {
  const reg = await getSWRegistration();
  if (!reg || !reg.active) return false;

  try {
    reg.active.postMessage({ type: 'CANCEL_SCHEDULES' });
    return true;
  } catch {
    return false;
  }
}

export async function sendRecordReminder(
  currentStreak: number,
  hasCheckedInToday: boolean
): Promise<boolean> {
  const title = hasCheckedInToday
    ? '📝 今日已记录，继续保持！'
    : '📝 别忘了记录今日疼痛';

  let body = '记录每日疼痛状况，更好地了解自己的身体';
  if (currentStreak > 0 && !hasCheckedInToday) {
    body = `您已连续记录 ${currentStreak} 天，今天别忘了继续打卡哦！`;
  } else if (currentStreak > 0 && hasCheckedInToday) {
    body = `您已连续记录 ${currentStreak + 1} 天，坚持就是胜利！`;
  } else if (!hasCheckedInToday) {
    body = '今天还没有记录疼痛，花一分钟记录一下吧';
  }

  return await sendNotification(title, {
    body,
    tag: 'record-reminder',
    requireInteraction: false,
    data: { type: 'record-reminder' }
  });
}

export interface ScheduledRecordReminder {
  time: string;
  fireAt: number;
}

export async function scheduleRecordReminderViaSW(
  reminder: ScheduledRecordReminder
): Promise<boolean> {
  const reg = await getSWRegistration();
  if (!reg || !reg.active) return false;

  try {
    reg.active.postMessage({
      type: 'SCHEDULE_RECORD_REMINDER',
      reminder
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelRecordReminderViaSW(): Promise<boolean> {
  const reg = await getSWRegistration();
  if (!reg || !reg.active) return false;

  try {
    reg.active.postMessage({ type: 'CANCEL_RECORD_REMINDER' });
    return true;
  } catch {
    return false;
  }
}
