// Replaces the app's service worker for visitors who installed it on GitHub Pages. The old one
// cached the shell and the databases (gigabytes, cache-first) under legislativ-shell-*; this one
// deletes those caches and unregisters itself, so the redirect is all that is left.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('legislativ-shell-')).map((k) => caches.delete(k))))
      .then(() => self.registration.unregister()),
  );
});
