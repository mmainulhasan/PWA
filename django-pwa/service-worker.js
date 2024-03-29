var today = new Date();
var version = today.getDate();
var CACHE_STATIC_NAME = 'static-v' + version;
var CACHE_DYNAMIC_NAME = 'dynamic-v' + version;
var INCLUDES_PWA_VERSION = '?v=2.1';
var EXCLUDE_URL_CACHING = ['/admin'];
var STATIC_FILES = [ '/offline'];

self. addEventListener('install', function(event) {
    console.log('[Service Worker] Installing Service Worker ....', event);
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(function(cache) {
                console.log('[Service Worker] Precaching App Shell....');
                cache.addAll(STATIC_FILES);
            })
    );
});

self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating Service Worker ....', event);
    event.waitUntil(
        caches.keys()
            .then(function(keyList) {
                return Promise.all(keyList.map(function(key){
                    if(key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                        console.log('[Service Worker] Removing old cache.', key);
                        return caches.delete(key);
                    }
                }));
            })
    );
    return self.clients.claim();
});



self.addEventListener('fetch', function(event) {
     console.log('Fetch from app');
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Cache hit - return response
                if (response) {
                    console.log('From cache: ' + response);
                    return response;
                }

                return fetch(event.request).then(
                    function(response) {
                        console.log('From network:' + response.status);

                        // Check if we received a valid response
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        console.log('URL is follows ' + event.request.url);

                        // To avoid part of a page cache
                         if ( (event.request.url.indexOf( 'login' ) !== -1) || (event.request.url.indexOf( 'myaccount' ) !== -1) || (event.request.url.indexOf( 'logout' ) !== -1)) {
                             caches.keys().then(function (cacheNames) {
                                 cacheNames.forEach(function (cacheName) {
                                     if(cacheName == CACHE_DYNAMIC_NAME || cacheName == CACHE_STATIC_NAME){
                                         caches.delete(cacheName);
                                     }
                                 });
                             });
                         }

                        // Doesn't cache following urls
                        var arrayLength = EXCLUDE_URL_CACHING.length;
                        for (var i = 0; i < arrayLength; i++) {
                            if ( event.request.url.indexOf( EXCLUDE_URL_CACHING[i] ) !== -1) {
                                return response;
                            }
                        }

                         if(event.request.method === 'POST' || event.request.method === 'PUT' || event.request.method === 'PATCH' || event.request.method === 'DELETE'){
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        var responseToCache = response.clone();

                        caches.open(CACHE_DYNAMIC_NAME)
                            .then(function(cache) {
                                console.info('Cached URL:', event.request.url);
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            }).catch(function() {
            // If both fail, show a generic fallback:
            return caches.match('/offline');
        })
    );
});