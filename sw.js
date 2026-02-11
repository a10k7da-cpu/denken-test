const CACHE_NAME = 'denken3-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './data.json',
    './manifest.json'
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// オフライン対応（Cache First 戦略）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// 通知のプッシュ受信（無料構成のため、実際にはローカルでスケジュールされた通知を表示する仕組み）
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('./')
    );
});

// 毎日指定時間の通知（擬似的な実装：起動時に次の通知をスケジュール）
self.addEventListener('message', (event) => {
    if (event.data.type === 'SCHEDULE_NOTIFICATION') {
        const delay = event.data.delay; // ミリ秒
        setTimeout(() => {
            self.registration.showNotification('電験三種 極', {
                body: '今日の5問に挑戦しましょう！継続こそ合格への近道です。',
                icon: 'icons/icon-192.png',
                vibrate: [200, 100, 200],
                tag: 'daily-reminder'
            });
        }, delay);
    }
});
