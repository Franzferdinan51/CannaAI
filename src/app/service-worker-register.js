/**
 * Registers the CannaAI service worker on the client side.
 * Only runs in the browser.
 */
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('[CannaAI] Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('[CannaAI] Service Worker registration failed:', err);
      });
  });
}
