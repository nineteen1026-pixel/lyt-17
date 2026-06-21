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
