async function fetchSteps() {
  const res = await fetch('/api/steps');
  const data = await res.json();
  return data.steps || [];
}

async function fetchEmployees() {
  const res = await fetch('/api/employees');
  const data = await res.json();
  return data.employees || [];
}

let currentEmployeeKey = null;
// Track latest generated PDF per step for quick Preview without re-generating
const lastGenerated = Object.create(null);

// Foxit Embed Viewer globals
let foxitClientId = null;
let foxitEmbedView = null;
let viewerMode = '—';

function setViewerStatus(mode) {
  viewerMode = mode;
  const el = document.getElementById('viewer-status');
  if (el) el.textContent = `Viewer: ${mode}`;
}

function loadFoxitEmbedScript(clientId, cfg) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-foxit-embed]');
    if (existing) return resolve();
    const s = document.createElement('script');
    const base = (cfg && cfg.foxitEmbedUseProxy) ? '/vendor/foxit-embed.js' : ((cfg && cfg.foxitEmbedSdkUrl) || 'https://embed.developer-api.foxit.com/service/api/embview-sdk/js');
    s.src = (cfg && cfg.foxitEmbedUseProxy) ? base : `${base}${base.includes('?') ? '&' : '?'}clientId=${encodeURIComponent(clientId)}`;
    s.async = true;
    s.defer = true;
    s.dataset.foxitEmbed = '1';
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load Foxit Embed Viewer SDK'));
    document.head.appendChild(s);
  });
}

async function ensureFoxitEmbed() {
  if (foxitEmbedView) return foxitEmbedView;
  // If the container does not exist (top viewer removed), skip initializing the embed viewer
  const container = document.getElementById('foxit-embed-view');
  if (!container) {
    return null;
  }
  let cfg = null;
  if (!foxitClientId) {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      foxitClientId = data.foxitClientId || '';
      cfg = data;
    } catch (_) { }
  }
  if (!foxitClientId) {
    showToast('Configure FOXIT_CLIENT_ID to use the embedded viewer');
    return null;
  }
  await loadFoxitEmbedScript(foxitClientId, cfg);
  if (!window.FoxitEmbed || !window.FoxitEmbed.View) {
    showToast('Foxit Embed Viewer not available');
    return null;
  }
  foxitEmbedView = new window.FoxitEmbed.View({ clientId: foxitClientId, divId: 'foxit-embed-view' });
  setViewerStatus('Foxit');
  return foxitEmbedView;
}

function showToast(message, opts = {}) {
  const { kind = 'info', durationMs } = opts;
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('info', 'success', 'error');
  toast.classList.add('show', kind);
  const ms = Number.isFinite(durationMs) ? durationMs : (kind === 'error' ? 8000 : 2000);
  if (toast._hideTimer) {
    clearTimeout(toast._hideTimer);
    toast._hideTimer = null;
  }
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast._hideTimer = null;
  }, ms);
  // Allow user to dismiss immediately by clicking the toast
  if (!toast._clickBound) {
    toast.addEventListener('click', () => {
      if (toast._hideTimer) {
        clearTimeout(toast._hideTimer);
        toast._hideTimer = null;
      }
      toast.classList.remove('show');
    });
    toast._clickBound = true;
  }
}

async function handleAction(action, step, btn) {
  try {
    if (btn) btn.classList.add('pending');

    // 1) Generate: run analyze, then generate, then save URL and open viewer
    if (action === 'generate') {
      // Analyze first (soft-fail)
      try {
        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey: step.key, employeeKey: currentEmployeeKey })
        });
        if (!analyzeRes.ok) {
          showToast(`${step.title}: analyze failed (continuing to generate)`);
        }
      } catch (_) {
        showToast(`${step.title}: analyze error (continuing to generate)`);
      }

      // Generate PDF
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepKey: step.key, employeeKey: currentEmployeeKey, returnBase64: true })
      });
      const genData = await genRes.json();
      if (btn) btn.classList.remove('pending');
      if (!genRes.ok) {
        if (btn) { btn.classList.add('error'); btn.classList.remove('success'); }
        let msg = `${step.title}: generate failed`;
        if (genData && genData.error) msg += ` — ${genData.error}`;
        showToast(msg, { kind: 'error', durationMs: 8000 });
        try { console.debug('Generate failed', genData); } catch (_) { }
        return;
      }
      if (btn) { btn.classList.add('success'); btn.classList.remove('error'); btn.setAttribute('aria-pressed', 'true'); }
      showToast(`${step.title}: generate succeeded`, { kind: 'success' });

      // Save latest URL for Preview
      let pdfUrl = null;
      if (genData && genData.fileUrl) pdfUrl = genData.fileUrl;
      else if (genData && genData.filePath) {
        try {
          const base = '/output/';
          const name = genData.filePath.split('/').pop();
          if (name) pdfUrl = base + encodeURIComponent(name);
        } catch (_) { }
      }
      if (pdfUrl) {
        lastGenerated[step.key] = pdfUrl;
        showToast('PDF generated. Use Preview to view it.', { kind: 'success' });
      } else {
        showToast('Generate returned no PDF', { kind: 'error', durationMs: 6000 });
      }
      return;
    }

    // 2) Preview: only open the last generated PDF for this step
    if (action === 'preview') {
      if (btn) btn.classList.remove('pending');
      const pdfUrl = lastGenerated[step.key];
      if (!pdfUrl) {
        showToast('No PDF to preview. Generate first.', { kind: 'error', durationMs: 5000 });
        if (btn) { btn.classList.add('error'); btn.classList.remove('success'); }
        return;
      }
      const abs = new URL(pdfUrl, window.location.origin).toString();
      const name = encodeURIComponent((step.title || 'Document') + '.pdf');
      const href = `/viewer.html?file=${encodeURIComponent(abs)}&name=${name}`;
      window.open(href, '_blank', 'noopener,noreferrer');
      if (btn) { btn.classList.add('success'); btn.classList.remove('error'); btn.setAttribute('aria-pressed', 'true'); }
      showToast('Opening preview in a new window', { kind: 'info' });
      return;
    }

    // 3) Send for signing: call the eSign endpoint; server handles upload
    if (action === 'send') {
      const res = await fetch('/api/esign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepKey: step.key, employeeKey: currentEmployeeKey })
      });
      const data = await res.json();
      if (btn) btn.classList.remove('pending');
      if (res.ok || res.status === 202) {
        if (btn) { btn.classList.add('success'); btn.classList.remove('error'); btn.setAttribute('aria-pressed', 'true'); }
        showToast(`${step.title}: send queued`, { kind: 'success' });
        try {
          console.info('[esign] Send queued', {
            stepKey: step.key,
            employeeKey: currentEmployeeKey,
            publicFileUrl: data && data.publicFileUrl ? data.publicFileUrl : null,
            provider: data && data.provider,
            mocked: data && data.result && data.result.mocked === true
          });
        } catch (_) { }
      } else {
        if (btn) { btn.classList.add('error'); btn.classList.remove('success'); }
        showToast(`${step.title}: send failed${data?.error ? ` — ${data.error}` : ''}`, { kind: 'error', durationMs: 8000 });
        try { console.debug('Send failed', data); } catch (_) { }
      }
      return;
    }

    // Fallback safety: clear pending state
    if (btn) btn.classList.remove('pending');
  } catch (err) {
    if (btn) {
      btn.classList.remove('pending');
      btn.classList.add('error');
    }
    showToast(`Error: ${action} failed`, { kind: 'error', durationMs: 8000 });
    try { console.debug('Request error:', err); } catch (_) { }
  }
}

// Removed base64 preview logic; using server-side file save for now

function stepCard(step, index) {
  const el = document.createElement('article');
  el.className = 'step' + (step.demo ? '' : ' completed');
  const isCompleted = !step.demo;

  const headerHtml = `
    <div class="step-header">
      <span class="step-index">${String(index + 1).padStart(2, '0')}</span>
      <h3 class="step-title">${step.title}</h3>
    </div>
  `;

  const descHtml = `<p class="step-desc">${step.description}</p>`;

  const statusHtml = isCompleted
    ? `<div class="status-row" title="Pre-completed for demo">
         <span class="pill"><span class="dot"></span>Completed (mock)</span>
         <small style="color: var(--muted)">Not part of live demo</small>
       </div>`
    : '';

  const buttonsHtml = isCompleted
    ? ''
    : `<div class="btn-row">
         <button class="button generate" data-action="generate">Generate PDF</button>
         <button class="button preview" data-action="preview">Preview</button>
         <button class="button send" data-action="send">Send for Signing</button>
       </div>`;

  el.innerHTML = `${headerHtml}${descHtml}${statusHtml}${buttonsHtml}`;

  if (!isCompleted) {
    el.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        handleAction(action, step, btn);
      });
    });
  }

  return el;
}

async function bootstrap() {
  // Populate employee selector
  const employees = await fetchEmployees();
  const select = document.getElementById('employee-select');
  if (select) {
    // Clear and fill
    select.innerHTML = '';
    if (!employees.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No employees found';
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
    } else {
      employees.forEach((emp, i) => {
        const opt = document.createElement('option');
        opt.value = emp.key;
        opt.textContent = emp.name;
        if (i === 0) opt.selected = true;
        select.appendChild(opt);
      });
      currentEmployeeKey = select.value || employees[0]?.key || null;
      select.addEventListener('change', () => {
        currentEmployeeKey = select.value || null;
        showToast(`Employee: ${select.options[select.selectedIndex]?.text || currentEmployeeKey}`);
      });
    }
  }

  const steps = await fetchSteps();
  const mount = document.getElementById('steps');
  steps.forEach((s, i) => mount.appendChild(stepCard(s, i)));
}

bootstrap();
