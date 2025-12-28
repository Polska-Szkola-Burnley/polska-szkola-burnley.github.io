if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      console.log('ServiceWorker zarejestrowany z sukcesem: ', registration.scope);
    }, function(err) {
      console.log('Rejestracja ServiceWorker nie powiodła się: ', err);
    });
  });
}