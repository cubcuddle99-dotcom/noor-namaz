// নূর অ্যাপের অফলাইন ক্যাশ। অ্যাপে বড় পরিবর্তন করলে নিচের ভার্সন সংখ্যা বাড়িয়ে দিন (v1 -> v2)।
const CACHE = 'noor-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // শহর খোঁজার API: ক্যাশ নয়, শুধু অনলাইনে কাজ করবে
  if (url.hostname.includes('nominatim.openstreetmap.org')) return;

  // পেজ: আগে নেটওয়ার্ক (নতুন ভার্সন পেতে), না পেলে ক্যাশ
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { caches.open(CACHE).then(c => c.put('./index.html', res.clone())); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // বাকি সব (ফন্ট, আইকন ইত্যাদি): আগে ক্যাশ, না থাকলে নেটওয়ার্ক থেকে এনে ক্যাশে রাখো
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
