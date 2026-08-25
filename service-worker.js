const CACHE_NAME = "woori-gagyebu-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) GET 요청이 아니면 (POST/PATCH/DELETE 등) 서비스워커가 관여하지 않음
  //    → Supabase insert/update/delete는 그대로 네트워크로 직행
  if (req.method !== "GET") {
    return;
  }

  // 2) Supabase API로 가는 GET 요청(select)은 캐싱하지 않고 항상 네트워크에서 최신 데이터를 받음
  //    → 목록 조회가 캐시된 옛날 데이터로 응답되는 문제 방지
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(req));
    return;
  }

  // 3) 그 외 정적 리소스(HTML/CSS/JS/아이콘 등)만 캐시 우선 전략 적용
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return response;
        }).catch(() => cached)
      );
    })
  );
});
