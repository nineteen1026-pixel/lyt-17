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

const CACHE_NAME = 'pain-diary-sw-v1';
const SCHEDULE_CACHE_KEY = 'medication-schedule';
const NOTIFIED_CACHE_KEY_PREFIX = 'med-notified-';
const pendingTimers: number[] = [];
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

async function periodicCheck(): Promise<void> {
  const now = Date.now();
  if (now - lastCheckTime < 30000) return;
  lastCheckTime = now;

  try {
    await rebuildTimers();
  } catch {
    // ignore
  }
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => rebuildTimers())
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

      case 'CHECK_NOW':
        event.waitUntil(rebuildTimers());
        break;
    }
  }
});
