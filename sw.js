const CACHE="epc-quote-maker-v6";
const ASSETS=["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icon.jpg","./logo.jpg","./customer.html"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(ASSETS.map(asset=>cache.add(asset).catch(()=>null)))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  let url;
  try{url=new URL(event.request.url);}catch{return;}
  if(url.pathname.startsWith("/api/")) return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
    return response;
  }).catch(()=>caches.match("./index.html"))));
});
