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

const SCHEDULE_CACHE_KEY = 'medication-schedule';
const NOTIFIED_CACHE_KEY_PREFIX = 'med-notified-';
const pendingTimers: number[] = [];

function formatDateSW(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getNotifiedKeys(): Promise<Set<string>> {
  try {
    const today = formatDateSW(new Date());
    const cache = await caches.open('pain-diary-sw-v1');
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
    const cache = await caches.open('pain-diary-sw-v1');
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
    const cache = await caches.open('pain-diary-sw-v1');
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
    const cache = await caches.open('pain-diary-sw-v1');
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

  await self.registration.showNotification(`💊 用药提醒：${med.name}`, {
    body: med.dosage
      ? `请服用 ${med.dosage} 的 ${med.name}（${med.time}）`
      : `请服用 ${med.name}（${med.time}）`,
    icon: '/icon.svg',
    tag: `medication-${med.planId}-${med.time}`,
    requireInteraction: true,
    data: { type: 'medication-reminder', planId: med.planId, medicationName: med.name, scheduledTime: med.time }
  });

  notifiedKeys.add(key);
  await saveNotifiedKeys(notifiedKeys);
}

function clearPendingTimers(): void {
  for (const id of pendingTimers) {
    clearTimeout(id);
  }
  pendingTimers.length = 0;
}

async function scheduleMedications(medications?: ScheduledMedication[]): Promise<void> {
  clearPendingTimers();

  const meds = medications || await getSchedule();
  if (meds.length === 0) return;

  const now = Date.now();

  for (const med of meds) {
    const delay = med.fireAt - now;

    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      const timerId = self.setTimeout(() => {
        fireNotification(med);
      }, delay);
      pendingTimers.push(timerId);
    } else if (delay >= -5 * 60 * 1000 && delay <= 0) {
      await fireNotification(med);
    }
  }
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => scheduleMedications())
  );
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
        saveSchedule(medications).then(() => scheduleMedications(medications));
        break;
      }

      case 'CANCEL_SCHEDULES':
        clearPendingTimers();
        break;
    }
  }
});
