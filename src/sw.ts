/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === 'https://api.open-meteo.com',
  new NetworkFirst({
    cacheName: 'weather-api',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);

interface ScheduledMedication {
  name: string;
  dosage: string;
  time: string;
  planId: number;
  fireAt: number;
}

interface ScheduledRecordReminder {
  time: string;
  fireAt: number;
}

const CACHE_NAME = 'pain-diary-sw-v1';
const SCHEDULE_CACHE_KEY = 'medication-schedule';
const RECORD_REMINDER_CACHE_KEY = 'record-reminder-schedule';
const NOTIFIED_CACHE_KEY_PREFIX = 'med-notified-';
const RECORD_NOTIFIED_KEY = 'record-reminder-notified';
const pendingTimers: number[] = [];
let recordReminderTimerId: number | null = null;
let lastCheckTime = 0;

function formatDateSW(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getNotifiedKeys(): Promise<Set<string>> {
  try {
    const today = formatDateSW(new Date());
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(`${NOTIFIED_CACHE_KEY_PREFIX}${today}`);
    if (res) {
      const data = await res.json();
      return new Set(data.keys || []);
    }
  } catch {
    // ignore
  }
  return new Set();
}

async function saveNotifiedKeys(keys: Set<string>): Promise<void> {
  try {
    const today = formatDateSW(new Date());
    const cache = await caches.open(CACHE_NAME);
    const filtered = [...keys].filter(k => k.includes(today));
    await cache.put(
      `${NOTIFIED_CACHE_KEY_PREFIX}${today}`,
      new Response(JSON.stringify({ keys: filtered }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch {
    // ignore
  }
}

async function getSchedule(): Promise<ScheduledMedication[]> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(SCHEDULE_CACHE_KEY);
    if (res) {
      const data = await res.json();
      return data.medications || [];
    }
  } catch {
    // ignore
  }
  return [];
}

async function saveSchedule(medications: ScheduledMedication[]): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      SCHEDULE_CACHE_KEY,
      new Response(JSON.stringify({ medications }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch {
    // ignore
  }
}

async function fireNotification(med: ScheduledMedication): Promise<void> {
  const notifiedKeys = await getNotifiedKeys();
  const today = formatDateSW(new Date());
  const key = `${med.planId}-${today}-${med.time}`;

  if (notifiedKeys.has(key)) return;

  try {
    await self.registration.showNotification(`💊 用药提醒：${med.name}`, {
      body: med.dosage
        ? `请服用 ${med.dosage} 的 ${med.name}（${med.time}）`
        : `请服用 ${med.name}（${med.time}）`,
      icon: '/icon.svg',
      tag: `medication-${med.planId}-${med.time}`,
      requireInteraction: true,
      data: { type: 'medication-reminder', planId: med.planId, medicationName: med.name, scheduledTime: med.time }
    });
  } catch {
    // ignore
  }

  notifiedKeys.add(key);
  await saveNotifiedKeys(notifiedKeys);
}

function clearPendingTimers(): void {
  for (const id of pendingTimers) {
    clearTimeout(id);
  }
  pendingTimers.length = 0;
}

async function checkAndFireDue(medications: ScheduledMedication[]): Promise<void> {
  const now = Date.now();
  const notifiedKeys = await getNotifiedKeys();
  const today = formatDateSW(new Date());

  for (const med of medications) {
    const key = `${med.planId}-${today}-${med.time}`;
    if (notifiedKeys.has(key)) continue;

    const delay = med.fireAt - now;
    if (delay <= 0) {
      const minutesAgo = -delay / 60000;
      if (minutesAgo < 1440) {
        await fireNotification(med);
      }
    }
  }
}

async function rebuildTimers(medications?: ScheduledMedication[]): Promise<void> {
  clearPendingTimers();

  const meds = medications || await getSchedule();
  if (meds.length === 0) return;

  await checkAndFireDue(meds);

  const now = Date.now();
  const today = formatDateSW(new Date());
  const notifiedKeys = await getNotifiedKeys();

  for (const med of meds) {
    const key = `${med.planId}-${today}-${med.time}`;
    if (notifiedKeys.has(key)) continue;

    const delay = med.fireAt - now;
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      const timerId = self.setTimeout(() => {
        fireNotification(med);
      }, delay);
      pendingTimers.push(timerId);
    }
  }
}

async function ensureCheckedSchedule(medications: ScheduledMedication[]): Promise<void> {
  await saveSchedule(medications);
  await rebuildTimers(medications);
}

async function getRecordReminderNotified(): Promise<{ date: string; notified: boolean }> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(RECORD_NOTIFIED_KEY);
    if (res) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return { date: '', notified: false };
}

async function saveRecordReminderNotified(date: string, notified: boolean): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      RECORD_NOTIFIED_KEY,
      new Response(JSON.stringify({ date, notified }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch {
    // ignore
  }
}

async function getRecordReminderSchedule(): Promise<ScheduledRecordReminder | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(RECORD_REMINDER_CACHE_KEY);
    if (res) {
      const data = await res.json();
      return data.reminder || null;
    }
  } catch {
    // ignore
  }
  return null;
}

async function saveRecordReminderSchedule(reminder: ScheduledRecordReminder | null): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    if (reminder) {
      await cache.put(
        RECORD_REMINDER_CACHE_KEY,
        new Response(JSON.stringify({ reminder }), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    } else {
      await cache.delete(RECORD_REMINDER_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

async function fireRecordReminder(): Promise<void> {
  const today = formatDateSW(new Date());
  const notifiedInfo = await getRecordReminderNotified();

  if (notifiedInfo.date === today && notifiedInfo.notified) return;

  try {
    await self.registration.showNotification('📝 别忘了记录今日疼痛', {
      body: '花一分钟记录今天的疼痛状况，坚持打卡哦！',
      icon: '/icon.svg',
      tag: 'record-reminder',
      requireInteraction: false,
      data: { type: 'record-reminder' }
    });
  } catch {
    // ignore
  }

  await saveRecordReminderNotified(today, true);
}

async function rebuildRecordReminderTimer(): Promise<void> {
  if (recordReminderTimerId !== null) {
    clearTimeout(recordReminderTimerId);
    recordReminderTimerId = null;
  }

  const reminder = await getRecordReminderSchedule();
  if (!reminder) return;

  const today = formatDateSW(new Date());
  const notifiedInfo = await getRecordReminderNotified();
  if (notifiedInfo.date === today && notifiedInfo.notified) return;

  const now = Date.now();
  const delay = reminder.fireAt - now;

  if (delay <= 0) {
    const minutesAgo = -delay / 60000;
    if (minutesAgo < 60) {
      await fireRecordReminder();
    }
  } else if (delay < 24 * 60 * 60 * 1000) {
    recordReminderTimerId = self.setTimeout(() => {
      fireRecordReminder();
    }, delay);
  }
}

async function ensureRecordReminderSchedule(reminder: ScheduledRecordReminder): Promise<void> {
  await saveRecordReminderSchedule(reminder);
  await rebuildRecordReminderTimer();
}

async function cancelRecordReminder(): Promise<void> {
  if (recordReminderTimerId !== null) {
    clearTimeout(recordReminderTimerId);
    recordReminderTimerId = null;
  }
  await saveRecordReminderSchedule(null);
}

async function periodicCheck(): Promise<void> {
  const now = Date.now();
  if (now - lastCheckTime < 30000) return;
  lastCheckTime = now;

  try {
    await rebuildTimers();
    await rebuildRecordReminderTimer();
  } catch {
    // ignore
  }
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      rebuildTimers();
      rebuildRecordReminderTimer();
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.waitUntil(periodicCheck());
});

self.addEventListener('sync', (event) => {
  event.waitUntil(rebuildTimers());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'medication-check') {
    event.waitUntil(rebuildTimers());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;

      case 'SCHEDULE_MEDICATIONS': {
        const medications: ScheduledMedication[] = event.data.medications || [];
        event.waitUntil(ensureCheckedSchedule(medications));
        break;
      }

      case 'CANCEL_SCHEDULES':
        clearPendingTimers();
        break;

      case 'SCHEDULE_RECORD_REMINDER': {
        const reminder: ScheduledRecordReminder = event.data.reminder;
        if (reminder) {
          event.waitUntil(ensureRecordReminderSchedule(reminder));
        }
        break;
      }

      case 'CANCEL_RECORD_REMINDER':
        event.waitUntil(cancelRecordReminder());
        break;

      case 'CHECK_NOW':
        event.waitUntil(rebuildTimers().then(() => rebuildRecordReminderTimer()));
        break;
    }
  }
});
