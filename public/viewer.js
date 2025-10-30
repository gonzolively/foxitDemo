(function(){
  // Minimal viewer: open the PDF with the browser's built-in PDF plugin (no Foxit, no iframe)
  function getParam(name){
    try { return new URLSearchParams(location.search).get(name); } catch(_) { return null; }
  }
  const file = getParam('file');
  if (!file) {
    const el = document.getElementById('mode-badge');
    if (el) el.textContent = 'Viewer: Missing file';
    const pre = document.getElementById('debug-pre');
    if (pre) pre.textContent = JSON.stringify({ error: 'Missing ?file parameter' }, null, 2);
    return;
  }
  try {
    const abs = new URL(file, window.location.origin).toString();
    window.location.replace(abs);
  } catch (_) {
    window.location.href = file;
  }
})();
