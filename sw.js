'use strict';
// Deployment refresh marker: no runtime behavior changes.
// PWA cache controls only InkAndMilk Astral Defense. Never clears browser saves.
const CACHE_PREFIX='inkandmilk-astral-defense-pwa-';
const CACHE_NAME=CACHE_PREFIX+'0.7.0.1-e59bc1ba468f';
const APP_SHELL=['./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
const OFFLINE_PAGE_URL=new URL('./index.html',self.registration.scope).href;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  // Do not force takeover of a running game; updates require user confirmation.
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  if(url.pathname.endsWith('/sw.js'))return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        // Always seek latest release on online navigation, even when cache exists.
        const response=await fetch(request,{cache:'no-store'});
        if(response.ok){
          const copy=response.clone();
          try{const cache=await caches.open(CACHE_NAME);await cache.put(OFFLINE_PAGE_URL,copy);}catch(_){}
        }
        return response;
      }catch(_){
        return await caches.match(OFFLINE_PAGE_URL)||Response.error();
      }
    })());
    return;
  }

  // Only local static assets are cached; these are versioned with the service worker.
  if(/\/(?:icons\/[^/]+\.png|manifest\.webmanifest)$/.test(url.pathname)){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      if(cached)return cached;
      return fetch(request);
    })());
  }
});
