// Pont entre l'extension et le script de la page : envoie les fichiers sons demandés.
window.addEventListener('message', async (e) => {
  if (e.source !== window || !e.data || e.data.bplus !== 'getSounds' || !Array.isArray(e.data.names)) return;
  const files = {};
  await Promise.all(e.data.names.map(async (n) => {
    if (!/^[A-Za-z]+$/.test(n)) return;
    try {
      const r = await fetch(chrome.runtime.getURL(`sounds/${n}.wav`));
      if (r.ok) files[n] = await r.arrayBuffer();
    } catch (err) {}
  }));
  window.postMessage({ bplus: 'sounds', files }, location.origin);
});
document.documentElement.dataset.bplusBridge = '1';
