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

export function sendNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
  }
): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

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

  setTimeout(() => {
    notification.close();
  }, 30000);

  return notification;
}

export function sendMedicationReminder(
  medicationName: string,
  dosage: string,
  scheduledTime: string,
  planId?: number
): Notification | null {
  const body = dosage
    ? `请服用 ${dosage} 的 ${medicationName}（${scheduledTime}）`
    : `请服用 ${medicationName}（${scheduledTime}）`;

  return sendNotification(`💊 用药提醒：${medicationName}`, {
    body,
    tag: `medication-${planId ?? 'unknown'}-${scheduledTime}`,
    requireInteraction: true,
    data: { type: 'medication-reminder', planId, medicationName, scheduledTime }
  });
}
