import { startDemoViewer } from './demo-access.mjs';

await startDemoViewer({
  fetchConfig: async () => {
    const response = await fetch('/site-config.json', {
      cache: 'no-store', headers: { 'ngsw-bypass': 'true' },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('Configuration unavailable');
    return response.json();
  },
  loadViewer: async () => {
    await loadScript('vendor/babylon-9.25.0.js');
    await loadScript('vendor/babylon-loaders-9.25.0.js');
    if (!window.BABYLON?.Engine.isSupported()) throw new Error('WebGL unavailable');
    await import('./villa.js');
  },
  showUnavailable: (message, retryAllowed) => {
    for (const element of document.getElementById('tour').children) {
      if (element.id !== 'loading') element.inert = true;
    }
    document.getElementById('loading-label').textContent = message;
    document.getElementById('progress').hidden = true;
    const retry = document.getElementById('retry');
    retry.hidden = !retryAllowed;
    retry.onclick = () => location.reload();
  },
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // The engine is several MB: mobile connections may need more than 20 seconds.
    const timer = setTimeout(() => { script.remove(); reject(new Error('Script loading timeout')); }, 60000);
    script.src = src;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); reject(new Error('Script loading failed')); };
    document.head.appendChild(script);
  });
}
