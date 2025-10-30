const CACHE_NAME = 'wow-spageti-report-v1';
const URLS_TO_CACHE = [
    '/index.html',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

// Install service worker dan cache aset statis
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache dibuka');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

// Strategi Cache-First
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Kembalikan dari cache jika ada
                if (response) {
                    return response;
                }
                
                // Jika tidak ada di cache, ambil dari network
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Cek jika response valid
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Duplikat response untuk dimasukkan ke cache
                        const responseToCache = networkResponse.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(() => {
                    // Gagal fetch (offline), mungkin tampilkan halaman offline kustom
                    console.log('Fetch gagal, mungkin offline');
                });
            })
    );
});

// Hapus cache lama saat aktivasi
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
