const CACHE_NAME = 'pain-diary-medication-v1';
const NOTIFIED_KEYS = 'medication_notified_keys';
const MAX_CATCHUP_MINUTES = 120;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

async function getNotifiedKeys() {
  try {
    const today = formatDate(new Date());
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(`/notified-keys/${today}`);
    if (res) {
      const data = await res.json();
      return new Set(data.keys || []);
    }
  } catch (e) {
    // ignore
  }
  return new Set();
}

async function saveNotifiedKeys(keys) {
  try {
    const today = formatDate(new Date());
    const cache = await caches.open(CACHE_NAME);
    const filtered = [...keys].filter(k => k.includes(`-${today}-`));
    await cache.put(
      `/notified-keys/${today}`,
      new Response(JSON.stringify({ keys: filtered }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (e) {
    // ignore
  }
}

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

self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_MEDICATIONS' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ checked: true });
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'medication-check') {
    event.waitUntil(
      (async () => {
        try {
          const notifiedKeys = await getNotifiedKeys();
          const now = new Date();
          const dateStr = formatDate(now);
          const registration = self.registration;
          const plans = [];
          try {
            const cache = await caches.open(CACHE_NAME);
            const res = await cache.match('/medication-plans');
            if (res) {
              const data = await res.json();
              data.plans && plans.push(...data.plans);
            }
          } catch (e) {
            // ignore
          }
          for (const plan of plans) {
            if (!plan.enabled || !plan.times) continue;
            for (const time of plan.times) {
              const key = `${plan.id}-${dateStr}-${time}`;
              if (notifiedKeys.has(key)) continue;
              const [h, m] = time.split(':').map(Number);
              const scheduled = new Date(now);
              scheduled.setHours(h, m, 0, 0);
              const diff = (now.getTime() - scheduled.getTime()) / 60000;
              if (diff >= 0 && diff <= MAX_CATCHUP_MINUTES) {
                await registration.showNotification(
                  `💊 用药提醒：${plan.name}`,
                  {
                    body: plan.dosage
                      ? `请服用 ${plan.dosage} 的 ${plan.name}（${time}）`
                      : `请服用 ${plan.name}（${time}）`,
                    icon: '/icon.svg',
                    tag: `medication-${plan.id}-${time}`,
                    requireInteraction: true,
                    data: { type: 'medication-reminder', planId: plan.id, time }
                  }
                );
                notifiedKeys.add(key);
              } else if (diff > MAX_CATCHUP_MINUTES) {
                notifiedKeys.add(key);
              }
            }
          }
          await saveNotifiedKeys(notifiedKeys);
        } catch (e) {
          console.error('Background medication check failed:', e);
        }
      })()
    );
  }
});
