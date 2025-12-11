require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

// --- Demo steps (8-10 common HR steps with last 3 as requested) ---
const steps = [
  {
    id: 1,
    key: 'personal-info',
    title: 'Personal Information',
    description: 'Collect basic employee details (name, address, contact).',
    demo: false,
    completed: true
  },
  {
    id: 2,
    key: 'w4-tax',
    title: 'W-4 Tax Withholding',
    description: 'Federal tax withholding selection (W-4).',
    demo: false,
    completed: true
  },
  {
    id: 3,
    key: 'i9-eligibility',
    title: 'I-9 Employment Eligibility',
    description: 'Verify identity and employment authorization (I-9).',
    demo: false,
    completed: true
  },
  {
    id: 4,
    key: 'direct-deposit',
    title: 'Direct Deposit Authorization',
    description: 'Set up payroll deposit to employee’s bank account.',
    demo: false,
    completed: true
  },
  {
    id: 5,
    key: 'emergency-contact',
    title: 'Emergency Contact',
    description: 'Provide emergency contact information.',
    demo: false,
    completed: true
  },
  {
    id: 6,
    key: 'benefits-enrollment',
    title: 'Benefits Enrollment',
    description: 'Enroll in health, dental, vision, and other benefits.',
    demo: false,
    completed: true
  },
  {
    id: 7,
    key: 'background-check',
    title: 'Background Check Consent',
    description: 'Consent to background check as required.',
    demo: false,
    completed: true
  },
  {
    id: 8,
    key: 'confidentiality-agreement',
    title: 'Confidentiality (NDA) Agreement',
    description: 'Acknowledge and sign the company confidentiality agreement.',
    demo: true,
    completed: false
  },
  {
    id: 9,
    key: 'handbook-ack',
    title: 'Employee Handbook Acknowledgement',
    description: 'Confirm receipt and understanding of the employee handbook.',
    demo: true,
    completed: false
  },
  {
    id: 10,
    key: 'it-security-policy',
    title: 'IT Security Policy Acknowledgement',
    description: 'Acknowledge IT acceptable use and security policies.',
    demo: true,
    completed: false
  }
];

// --- Shared helpers ---
function toDisplay(key) {
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s))
    .join(' ');
}
function toSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'doc';
}

async function resolveFileBinDirectUrl(filebinUrl) {
  try {
    // First, try to resolve using curl -I so we see the same
    // 302 + Location behavior you see on the command line.
    const viaCurl = await new Promise(resolve => {
      execFile('curl', ['-I', filebinUrl], { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          console.warn('[filebin] curl -I failed, falling back to fetch', err.message || String(err));
          return resolve(null);
        }
        const out = stdout ? stdout.toString() : '';
        const m = out.match(/Location:\s*(\S+)/i);
        if (m && m[1]) {
          const loc = m[1].trim();
          console.log('[filebin] resolve via curl', {
            from: filebinUrl,
            to: loc,
            viaRedirect: true
          });
          return resolve({ url: loc, viaRedirect: true, via: 'curl' });
        }
        console.warn('[filebin] curl -I had no Location header, falling back to fetch', out.slice(0, 400));
        return resolve(null);
      });
    });
    if (viaCurl) return viaCurl;

    // Fallback: use Node fetch with redirect: 'manual'. Note that
    // filebin may show an HTML "verified" interstitial to some
    // clients (including Node), in which case we just return the
    // original URL.
    const resp = await fetch(filebinUrl, { method: 'GET', redirect: 'manual' });
    const status = resp.status;
    const loc = resp.headers.get('location') || resp.headers.get('Location');
    if (status >= 300 && status < 400 && loc) {
      console.log('[filebin] resolve direct URL via fetch', {
        from: filebinUrl,
        to: loc,
        status,
        viaRedirect: true
      });
      return { url: loc, viaRedirect: true, status, via: 'fetch' };
    }
    console.log('[filebin] resolve direct URL (no redirect visible to Node)', {
      from: filebinUrl,
      status,
      viaRedirect: false
    });
    return { url: filebinUrl, viaRedirect: false, status };
  } catch (e) {
    console.error('[filebin] resolve direct URL error', e?.message || e);
    return { url: filebinUrl, viaRedirect: false, error: e.message || String(e) };
  }
}

// Upload a generated PDF to filebin.net and return a direct public URL
async function uploadToFileBin(buffer, filename) {
  const base = (process.env.FILEBIN_BASE_URL || 'https://filebin.net').replace(/\/$/, '');
  // If FILEBIN_BIN is not set, generate a unique bin id per upload
  const bin = process.env.FILEBIN_BIN || crypto.randomBytes(12).toString('hex');
  const safeName = filename || 'document.pdf';
  const filebinUrl = `${base}/${encodeURIComponent(bin)}/${encodeURIComponent(safeName)}`;

  try {
    console.warn('[filebin] POST upload', { url: filebinUrl, bin, filename: safeName });
    const resp = await fetch(filebinUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        cid: 'foxit-onboarding-demo'
      },
      body: buffer
    });
    const text = await resp.text();

    if (!resp.ok) {
      console.error('[filebin] upload failed', {
        status: resp.status,
        body: (text || '').slice(0, 300)
      });
      return { ok: false, status: resp.status, error: 'upload-failed', body: (text || '').slice(0, 300) };
    }

    // After a successful upload, resolve any redirect so we can hand Foxit
    // a direct S3 URL instead of a 30x.
    const resolved = await resolveFileBinDirectUrl(filebinUrl);
    const finalUrl = resolved && resolved.url ? resolved.url : filebinUrl;
    console.log('[filebin] upload success', {
      filebinUrl,
      directUrl: finalUrl,
      viaRedirect: resolved?.viaRedirect || false,
      status: resp.status
    });
    return { ok: true, url: finalUrl, filebinUrl, viaRedirect: resolved?.viaRedirect || false, status: resp.status };
  } catch (e) {
    console.error('[filebin] upload error', e?.message || e);
    return { ok: false, error: e.message || String(e) };
  }
}

// --- API: health ---
function getAuthMode() {
  if (process.env.FOXIT_ACCESS_TOKEN || process.env.FOXIT_TOKEN_URL) return 'bearer';
  if (process.env.FOXIT_CLIENT_ID && process.env.FOXIT_CLIENT_SECRET) return 'basic';
  return 'none';
}
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString(), analyzeProvider: 'foxit', authMode: getAuthMode() });
});

// --- API: debug filebin / HTTP behavior ---
// Example: GET /api/debug/filebin?url=https://filebin.net/....
app.get('/api/debug/filebin', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url query param is required' });

  const result = { url };

  // Node fetch HEAD with redirect: 'manual' (closest to curl -I without -L)
  try {
    const resp = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    result.nodeHeadManual = {
      status: resp.status,
      statusText: resp.statusText,
      headers: Object.fromEntries(resp.headers.entries())
    };
  } catch (e) {
    result.nodeHeadManualError = e.message || String(e);
  }

  // Node fetch GET with redirect: 'manual' to see any Location header differences
  try {
    const resp = await fetch(url, { method: 'GET', redirect: 'manual' });
    result.nodeGetManual = {
      status: resp.status,
      statusText: resp.statusText,
      headers: Object.fromEntries(resp.headers.entries())
    };
  } catch (e) {
    result.nodeGetManualError = e.message || String(e);
  }

  // Try to shell out to curl -I and curl -I -L to compare behavior if curl is available
  try {
    execFile('curl', ['-I', url], { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        result.curlHead = { error: err.message || String(err), stdout: stdout?.toString(), stderr: stderr?.toString() };
      } else {
        result.curlHead = { stdout: stdout?.toString(), stderr: stderr?.toString() };
      }

      execFile('curl', ['-I', '-L', url], { timeout: 10000 }, (err2, stdout2, stderr2) => {
        if (err2) {
          result.curlHeadFollow = { error: err2.message || String(err2), stdout: stdout2?.toString(), stderr: stderr2?.toString() };
        } else {
          result.curlHeadFollow = { stdout: stdout2?.toString(), stderr: stderr2?.toString() };
        }
        return res.json(result);
      });
    });
  } catch (e) {
    result.curlSetupError = e.message || String(e);
    return res.json(result);
  }
});

// --- API: steps ---
app.get('/api/steps', (req, res) => {
  res.json({ steps });
});

// --- API: public config (expose clientId for Foxit Embed Viewer) ---
app.get('/api/config', (req, res) => {
  res.json({ foxitClientId: process.env.FOXIT_CLIENT_ID || '' });
});

// --- API: employees (list JSON files under employee_data/) ---
app.get('/api/employees', (req, res) => {
  try {
    const dir = path.join(__dirname, 'employee_data');
    if (!fs.existsSync(dir)) return res.json({ employees: [] });
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json'));
    const employees = files.map(f => {
      const key = f.replace(/\.json$/i, '');
      return { key, name: toDisplay(key) };
    });
    res.json({ employees });
  } catch (e) {
    res.status(500).json({ error: 'failed-to-list-employees', detail: e.message });
  }
});

// --- API: generate (Foxit) ---
// Accepts: { stepKey } or { templateName } or { base64FileString }, optional { documentValues, outputFormat, currencyCulture, employeeKey, returnBase64 }
app.post('/api/generate', async (req, res) => {
  try {
    const { stepKey, templateName, base64FileString, documentValues, outputFormat, currencyCulture, employeeKey, returnBase64 } = req.body || {};
    const templatesDir = path.join(__dirname, 'templates');
    const employeesDir = path.join(__dirname, 'employee_data');

    // Resolve template buffer
    let buffer;
    let filename;
    if (base64FileString) {
      buffer = Buffer.from(base64FileString, 'base64');
      filename = 'template.docx';
    } else {
      const mapping = {
        'confidentiality-agreement': 'Confidentiality_Agreement_Acknowledgment.docx',
        'handbook-ack': 'Employee_Handbook_Acknowledgment.docx',
        'it-security-policy': 'IT_Security_Policy_Acknowledgment.docx'
      };
      filename = templateName || (stepKey ? mapping[stepKey] : undefined);
      if (!filename) {
        return res.status(400).json({ error: 'templateName or stepKey (mapped) is required when base64FileString is not provided' });
      }
      const filePath = path.join(templatesDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Template not found: ${filename}` });
      }
      buffer = fs.readFileSync(filePath);
    }

    // Prepare documentValues
    let values = documentValues;
    if (!values) {
      // Try to load a sample employee JSON and flatten it
      const defaultEmployee = employeeKey || 'jane_doe';
      const empPath = path.join(employeesDir, `${defaultEmployee}.json`);
      if (fs.existsSync(empPath)) {
        try {
          const empRaw = fs.readFileSync(empPath, 'utf8');
          const empJson = JSON.parse(empRaw);
          values = flattenJson(empJson);
        } catch (e) {
          values = {};
        }
      } else {
        values = {};
      }
    }

    const urls = getGenerateUrls();
    if (!urls.length) return res.status(500).json({ error: 'Set FOXIT_DOCGEN_GENERATE_URL or FOXIT_DOCGEN_BASE_URL' });

    const authHeaders = await buildFoxitAuthHeaders();
    const payload = {
      outputFormat: outputFormat || 'pdf',
      currencyCulture: currencyCulture || 'en-US',
      documentValues: values,
      base64FileString: Buffer.from(buffer).toString('base64')
    };

    const attempts = [];
    for (const url of urls) {
      try {
        console.warn(`[generate] POST ${url}`);
        const resp = await fetch(url, {
          method: 'POST',
          headers: { ...authHeaders, Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const text = await resp.text();
        if (resp.ok) {
          let json;
          try { json = JSON.parse(text); } catch (_) { json = { raw: text }; }
          try { console.log('Foxit generate result:', JSON.stringify(redactLargeFields(json), null, 2)); } catch (_) { }
          // Attempt to extract base64 PDF and save to filesystem
          const b64 = extractBase64FromGenerateResp(json);
          if (b64) {
            const step = stepKey || templateName || 'doc';
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            // Include employee name if provided
            const empPart = employeeKey ? toSlug(toDisplay(employeeKey)) : '';
            const stepPart = toSlug(step);
            const fileName = `${ts}${empPart ? '_' + empPart : ''}_${stepPart}.pdf`;
            const absPath = path.join(OUTPUT_DIR, fileName);
            try {
              const pdfBuffer = Buffer.from(b64, 'base64');
              fs.writeFileSync(absPath, pdfBuffer);
              const fileUrl = `/output/${fileName}`;

              const respPayload = { provider: 'foxit', saved: true, fileName, fileUrl, filePath: absPath };
              if (returnBase64 === true) respPayload.fileBase64 = b64;
              return res.json(respPayload);
            } catch (e) {
              try { console.error('Foxit generate save failed:', e.message); } catch (_) { }
              return res.json({ provider: 'foxit', saved: false, reason: 'write-failed', detail: e.message, foxit: json });
            }
          }
          // No base64 found; return raw response
          try { console.warn('Foxit generate response contained no PDF base64'); } catch (_) { }
          return res.json({ provider: 'foxit', saved: false, reason: 'no-pdf-in-response', foxit: json });
        }
        // Log failure body (attempt to parse JSON for readability)
        try {
          let errJson;
          try { errJson = JSON.parse(text); } catch (_) { }
          if (errJson) console.error('Foxit generate error response:', JSON.stringify(redactLargeFields(errJson), null, 2));
          else console.error('Foxit generate error response (text):', (text || '').slice(0, 1200));
        } catch (_) { }
        attempts.push({ url, status: resp.status, body: text?.slice(0, 300) });
      } catch (e) {
        attempts.push({ url, error: e.message });
      }
    }

    return res.status(502).json({ error: 'foxit-generate-failed', attempts });
  } catch (err) {
    console.error('Generate error', err);
    return res.status(500).json({ error: 'generate failed', detail: err.message });
  }
});

app.post('/api/preview', (req, res) => {
  const { stepKey } = req.body || {};
  return res.status(202).json({
    status: 'queued',
    action: 'preview',
    stepKey,
    message: 'Stub only — generate preview link or stream here.'
  });
});

app.post('/api/send', (req, res) => {
  // Backward-compat stub preserved below; real implementation moved to /api/esign/send
  const { stepKey } = req.body || {};
  return res.status(202).json({ status: 'queued', action: 'send', stepKey, message: 'Use /api/esign/send for live eSign' });
});

// --- eSign helpers + API ---
function getEsignBase() {
  const b = process.env.FOXIT_ESIGN_BASE_URL || '';
  return b.replace(/\/$/, '');
}

function isEsignConfiguredForReal() {
  const base = getEsignBase();
  if (!base) return false;
  if (process.env.FOXIT_ESIGN_ACCESS_TOKEN) return true;
  const tokenUrl = process.env.FOXIT_ESIGN_TOKEN_URL || process.env.FOXIT_TOKEN_URL;
  const clientId = process.env.FOXIT_ESIGN_CLIENT_ID || process.env.FOXIT_CLIENT_ID;
  const clientSecret = process.env.FOXIT_ESIGN_CLIENT_SECRET || process.env.FOXIT_CLIENT_SECRET;
  if (tokenUrl && clientId && clientSecret) return true;
  return false;
}

async function getEsignAccessToken() {
  if (process.env.FOXIT_ESIGN_ACCESS_TOKEN) return process.env.FOXIT_ESIGN_ACCESS_TOKEN;
  // Fall back to general FOXIT_* credentials if eSign-specific ones are not provided
  const tokenUrl = process.env.FOXIT_ESIGN_TOKEN_URL || process.env.FOXIT_TOKEN_URL;
  const clientId = process.env.FOXIT_ESIGN_CLIENT_ID || process.env.FOXIT_CLIENT_ID;
  const clientSecret = process.env.FOXIT_ESIGN_CLIENT_SECRET || process.env.FOXIT_CLIENT_SECRET;
  const scope = process.env.FOXIT_ESIGN_SCOPE || process.env.FOXIT_SCOPE; // optional
  if (!tokenUrl) return null;
  if (!clientId || !clientSecret) throw new Error('Missing FOXIT_ESIGN_CLIENT_ID/FOXIT_ESIGN_CLIENT_SECRET');
  const form = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
  if (scope) form.append('scope', scope);
  const resp = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`eSign token failed: ${resp.status} ${text}`);
  let json; try { json = JSON.parse(text); } catch (_) { throw new Error(`eSign token parse error: ${text?.slice(0, 200)}`); }
  if (!json.access_token) throw new Error('No access_token in eSign token response');
  return json.access_token;
}

async function buildEsignAuthHeaders() {
  const headers = {};
  const token = await getEsignAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers.Authorization) throw new Error('Missing eSign auth: set FOXIT_ESIGN_ACCESS_TOKEN or FOXIT_ESIGN_TOKEN_URL with client id/secret');
  headers['Accept'] = 'application/json';
  return headers;
}

async function sendViaFoxitEsign(buffer, filename, signerName, signerEmail, subject, message, publicFileUrl) {
  const base = getEsignBase();
  try {
    console.warn('[esign] sendViaFoxitEsign called', {
      base,
      filename,
      signerName,
      signerEmail,
      subject,
      publicFileUrl
    });
  } catch (_) { }
  // If eSign is not configured, behave as a mocked send and short-circuit
  if (!base) {
    return {
      mocked: true,
      message: 'Foxit eSign is not configured (FOXIT_ESIGN_BASE_URL not set); no email was sent. This is a demo stub.',
    };
  }

  let headers;
  try {
    headers = await buildEsignAuthHeaders();
  } catch (e) {
    // If auth is not configured, also treat as mocked send
    return {
      mocked: true,
      message: 'Foxit eSign auth is not configured; no email was sent. This is a demo stub.',
      error: e.message,
    };
  }
  const attempts = [];
  const b64 = Buffer.from(buffer).toString('base64');

  // If we have a public URL (from file.io or EXTERNAL_BASE_URL), try
  // "Create Envelope from URL" (folders/createfolder) first.
  try {
    const externalBase = process.env.EXTERNAL_BASE_URL || '';

    let effectiveFileUrl = null;
    if (publicFileUrl) {
      effectiveFileUrl = publicFileUrl;
    } else if (externalBase) {
      effectiveFileUrl = new URL(`/output/${encodeURIComponent(filename)}`, externalBase).toString();
    }

    if (effectiveFileUrl) {
      const url = `${base}/folders/createfolder`;
      const split = String(signerName || '').trim().split(/\s+/);
      const firstName = split.slice(0, -1).join(' ') || split[0] || 'Signer';
      const lastName = split.length > 1 ? split[split.length - 1] : '';
      const payload = {
        folderName: subject || filename,
        inputType: 'url',
        fileUrls: [effectiveFileUrl],
        fileNames: [filename],
        parties: [{
          firstName,
          lastName,
          emailId: signerEmail,
          permission: 'FILL_FIELDS_AND_SIGN',
          sequence: 1,
          allowNameChange: 'false'
        }],
        // Enable processing of Foxit eSign text tags like
        // ${s:1:Signature_Field_Name} so templates created
        // with those markers get real signature fields.
        processTextTags: true,
        processAcroFields: false,
        sendNow: true,
        createEmbeddedSigningSession: false,
        createEmbeddedSigningSessionForAllParties: false,
        signInSequence: false
      };
      try { console.warn('[esign] POST create-from-url', { url, fileUrl: effectiveFileUrl, signerEmail }); } catch (_) { }
      const resp = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      const text = await resp.text();
      if (resp.ok) {
        try {
          const json = JSON.parse(text);
          try { console.log('[esign] create-from-url success', { folderId: json.folderId || json.id || json.result?.id || null }); } catch (_) { }
          return json;
        } catch (_) {
          try { console.log('[esign] create-from-url success (raw)', (text || '').slice(0, 400)); } catch (_) { }
          return { raw: text };
        }
      }
      attempts.push({ step: 'create-from-url', url, status: resp.status, body: text?.slice(0, 300) });
    }
  } catch (e) {
    attempts.push({ step: 'create-from-url', error: e.message });
  }

  // Attempt 1: Single-call create+send with embedded base64 document (generic variant)
  try {
    const url = `${base}/envelopes`;
    const payload = {
      name: subject,
      emailSubject: subject,
      emailMessage: message,
      status: 'sent',
      parties: [{ role: 'signer', name: signerName, email: signerEmail }],
      documents: [{ fileName: filename, fileBase64: b64, fileType: 'pdf' }]
    };
    try { console.warn('[esign] POST create+send', { url, signerEmail }); } catch (_) { }
    const resp = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const text = await resp.text();
    if (resp.ok) {
      try {
        const json = JSON.parse(text);
        try { console.log('[esign] create+send success', { envelopeId: json.id || json.envelopeId || json.EnvelopeId || json.result?.id || null }); } catch (_) { }
        return json;
      } catch (_) {
        try { console.log('[esign] create+send success (raw)', (text || '').slice(0, 400)); } catch (_) { }
        return { raw: text };
      }
    }
    attempts.push({ step: 'create+send', url, status: resp.status, body: text?.slice(0, 300) });
  } catch (e) {
    attempts.push({ step: 'create+send', error: e.message });
  }

  // Attempt 2: Multi-step create -> upload -> parties -> send
  let envelopeId = null;
  try {
    const url = `${base}/envelopes`;
    const payload = { name: subject, status: 'created' };
    try { console.warn('[esign] POST create-envelope (multi-step)', { url, subject }); } catch (_) { }
    const r1 = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const t1 = await r1.text();
    if (!r1.ok) { attempts.push({ step: 'create', url, status: r1.status, body: t1?.slice(0, 300) }); throw new Error('create failed'); }
    let j1; try { j1 = JSON.parse(t1); } catch (_) { j1 = { raw: t1 }; }
    envelopeId = j1.id || j1.envelopeId || j1.EnvelopeId || j1.result?.id;
    if (!envelopeId) throw new Error('missing envelopeId');

    // Upload document (try common variants)
    const upUrls = [`${base}/envelopes/${envelopeId}/documents`, `${base}/envelopes/${envelopeId}/files`];
    let uploaded = false; let upErr = null;
    for (const u of upUrls) {
      try {
        // Try multipart first
        let form = new FormData();
        let blob = new Blob([buffer], { type: 'application/pdf' });
        form.append('file', blob, filename);
        let r2 = await fetch(u, { method: 'POST', headers: { ...headers }, body: form });
        let t2 = await r2.text();
        if (r2.ok) { uploaded = true; break; }
        attempts.push({ step: 'upload(multipart)', url: u, status: r2.status, body: t2?.slice(0, 300) });
        // Try JSON base64 fallback
        const r2b = await fetch(u, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: filename, fileBase64: b64, fileType: 'pdf' }) });
        const t2b = await r2b.text();
        if (r2b.ok) { uploaded = true; break; }
        attempts.push({ step: 'upload(json)', url: u, status: r2b.status, body: t2b?.slice(0, 300) });
      } catch (e) { upErr = e; }
    }
    if (!uploaded) throw new Error(`upload failed${upErr ? ': ' + upErr.message : ''}`);

    // Add parties/recipients
    const pUrl = `${base}/envelopes/${envelopeId}/parties`;
    try { console.warn('[esign] POST parties', { url: pUrl, signerEmail }); } catch (_) { }
    const pResp = await fetch(pUrl, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ parties: [{ role: 'signer', name: signerName, email: signerEmail }] }) });
    const pText = await pResp.text();
    if (!pResp.ok) { attempts.push({ step: 'parties', url: pUrl, status: pResp.status, body: pText?.slice(0, 300) }); throw new Error('parties failed'); }

    // Send
    const sUrl = `${base}/envelopes/${envelopeId}/send`;
    try { console.warn('[esign] POST send-envelope', { url: sUrl, envelopeId }); } catch (_) { }
    const sResp = await fetch(sUrl, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ emailSubject: subject, emailMessage: message }) });
    const sText = await sResp.text();
    if (sResp.ok) { try { return JSON.parse(sText); } catch (_) { return { raw: sText, envelopeId }; } }
    attempts.push({ step: 'send', url: sUrl, status: sResp.status, body: sText?.slice(0, 300) });
  } catch (e) {
    attempts.push({ step: 'multi-step', error: e.message, envelopeId });
  }

  try {
    console.error('Foxit eSign send failed. Attempts:', JSON.stringify(attempts, null, 2));
  } catch (_) { }
  throw new Error(`eSign send failed; attempts: ${attempts.map(a => `${a.step || ''}@${a.url || ''} -> ${a.status || 'ERR'}${a.error ? (' ' + a.error) : ''}`).join(' | ')}`);
}

function findLatestPdfByStep(stepKey) {
  try {
    const slug = toSlug(stepKey || 'doc');
    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.toLowerCase().endsWith('.pdf') && f.includes(`_${slug}.pdf`))
      .map(f => ({ f, m: fs.statSync(path.join(OUTPUT_DIR, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    return files[0] ? path.join(OUTPUT_DIR, files[0].f) : null;
  } catch (_) { return null; }
}

function readEmployee(key) {
  try {
    if (!key) return null;
    const p = path.join(__dirname, 'employee_data', `${key}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) { return null; }
}

// POST /api/esign/send { stepKey?, fileUrl?, filePath?, publicFileUrl?, employeeKey?, signerEmail?, signerName?, subject?, message? }
app.post('/api/esign/send', async (req, res) => {
  try {
    const { stepKey, fileUrl, filePath, publicFileUrl, employeeKey, signerEmail, signerName, subject, message } = req.body || {};

    // Resolve file
    let absPath = filePath;
    if (!absPath && fileUrl) {
      // fileUrl is served from /output; map to filesystem
      const u = new URL(fileUrl, `http://localhost:${PORT}`);
      if (u.pathname.startsWith('/output/')) absPath = path.join(OUTPUT_DIR, path.basename(u.pathname));
    }
    if (!absPath && stepKey) absPath = findLatestPdfByStep(stepKey);
    if (!absPath || !fs.existsSync(absPath)) return res.status(400).json({ error: 'pdf-not-found', detail: 'Provide filePath/fileUrl or generate first' });

    const buffer = fs.readFileSync(absPath);
    const filename = path.basename(absPath);

    const liveEsign = isEsignConfiguredForReal();

    // If we don't already have a public URL from the client and real eSign is
    // configured, upload to filebin now. In mocked mode (no real eSign
    // credentials), we skip external uploads entirely.
    let effectivePublicUrl = publicFileUrl || null;
    if (liveEsign && !effectivePublicUrl) {
      try {
        const up = await uploadToFileBin(buffer, filename);
        if (up && up.ok && up.url) {
          effectivePublicUrl = up.url;
        }
      } catch (e) {
        console.error('[filebin] upload during /api/esign/send threw', e?.message || e);
      }
    }

    // Resolve recipient (prefer explicit signerEmail, then env override, then employee JSON)
    const overrideEmail = process.env.FOXIT_ESIGN_DEMO_SIGNER_EMAIL || '';
    let signer = { name: signerName, email: signerEmail };
    if (employeeKey) {
      const emp = readEmployee(employeeKey);
      if (emp) {
        signer = {
          name: signer.name || emp.employeeName || 'Employee',
          // If an override email is configured, use it for all employees
          email: signer.email || overrideEmail || emp.employeeEmail
        };
      }
    }
    if (!signer.email && overrideEmail) signer.email = overrideEmail;
    if (!signer.email) return res.status(400).json({ error: 'missing-signer', detail: 'Provide signerEmail or employeeKey with employeeEmail, or set FOXIT_ESIGN_DEMO_SIGNER_EMAIL' });

    try {
      console.warn('[esign] /api/esign/send', {
        stepKey,
        employeeKey,
        filename,
        signerName: signer.name,
        signerEmail: signer.email,
        publicFileUrl: effectivePublicUrl || null,
        liveEsign
      });
    } catch (_) { }

    const subj = subject || `${toDisplay(stepKey || 'Document')} — Please Sign`;
    const msg = message || `Hello${signer.name ? ` ${signer.name}` : ''},\n\nPlease sign the attached document.\n\nThank you.`;

    const result = await sendViaFoxitEsign(buffer, filename, signer.name || 'Signer', signer.email, subj, msg, effectivePublicUrl);
    try {
      console.log('[esign] /api/esign/send result (summary)', {
        ok: true,
        provider: 'foxit-esign',
        signerEmail: signer.email,
        stepKey,
        hasResult: !!result,
        publicFileUrl: effectivePublicUrl || null,
        mocked: !!result && !!result.mocked
      });
    } catch (_) { }
    return res.json({ provider: 'foxit-esign', ok: true, publicFileUrl: liveEsign ? (effectivePublicUrl || null) : null, result });
  } catch (err) {
    try { console.error('eSign /api/esign/send error:', err?.message || err); } catch (_) { }
    return res.status(502).json({ provider: 'foxit-esign', ok: false, error: err.message });
  }
});

// Quick credential and connectivity check for Foxit eSign
// GET /api/esign/health -> { ok, baseUrl, tokenAcquired, tokenPreview?, attempts: [ { url, status } ] }
app.get('/api/esign/health', async (req, res) => {
  try {
    const base = getEsignBase();
    const attempts = [];
    let token = null;
    let tokenPreview = null;
    // Gather env diagnostics (masked)
    const explicitTokenUrl = process.env.FOXIT_ESIGN_TOKEN_URL || process.env.FOXIT_TOKEN_URL || '';
    const explicitId = process.env.FOXIT_ESIGN_CLIENT_ID || process.env.FOXIT_CLIENT_ID || '';
    const explicitSecret = process.env.FOXIT_ESIGN_CLIENT_SECRET || process.env.FOXIT_CLIENT_SECRET || '';
    const hasDirectToken = !!process.env.FOXIT_ESIGN_ACCESS_TOKEN;
    const mask = (v) => (v ? `${String(v).slice(0, 2)}…${String(v).slice(-4)}` : '');
    try {
      // Priority 1: Direct access token
      if (hasDirectToken) {
        token = process.env.FOXIT_ESIGN_ACCESS_TOKEN;
      } else if (explicitTokenUrl) {
        // Priority 2: Use configured token URL and client credentials
        token = await getEsignAccessToken();
      } else if (base && explicitId && explicitSecret) {
        // Priority 3: No token URL provided — try common OAuth token endpoints derived from base
        const origin = base.replace(/\/api$/i, '');
        const candidates = [
          `${origin}/oauth2/token`,
          `${origin}/oauth/token`,
          `${base}/oauth2/token`,
          `${base}/oauth/token`
        ];
        const form = new URLSearchParams({ grant_type: 'client_credentials', client_id: explicitId, client_secret: explicitSecret });
        const scope = process.env.FOXIT_ESIGN_SCOPE || process.env.FOXIT_SCOPE;
        if (scope) form.append('scope', scope);
        for (const u of candidates) {
          try {
            const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
            const t = await r.text();
            attempts.push({ step: 'token-candidate', url: u, status: r.status });
            if (r.ok) {
              try {
                const j = JSON.parse(t);
                if (j && j.access_token) { token = j.access_token; break; }
              } catch (_) { /* ignore parse error, continue */ }
            }
          } catch (e) {
            attempts.push({ step: 'token-candidate', url: u, error: e.message });
          }
        }
      }
      if (token) {
        // If JWT, expose header.claims preview safely; else first 12 chars
        const parts = token.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            tokenPreview = { iss: payload.iss, sub: payload.sub, aud: payload.aud, exp: payload.exp, scope: payload.scope };
          } catch (_) { tokenPreview = token.slice(0, 12) + '…'; }
        } else {
          tokenPreview = token.slice(0, 12) + '…';
        }
      }
    } catch (e) {
      attempts.push({ step: 'token', error: e.message });
    }
    let pingOk = false;
    if (base && token) {
      const headers = await buildEsignAuthHeaders();
      const urls = [
        `${base}/accounts/me`,
        `${base}/accounts`,
        `${base}/users/me`
      ];
      for (const u of urls) {
        try {
          const r = await fetch(u, { headers: { ...headers, Accept: 'application/json' } });
          attempts.push({ url: u, status: r.status });
          if (r.ok) { pingOk = true; break; }
        } catch (e) {
          attempts.push({ url: u, error: e.message });
        }
      }
    }
    const env = {
      baseUrl: base || null,
      directAccessToken: hasDirectToken,
      tokenUrlConfigured: !!explicitTokenUrl,
      clientIdPresent: !!explicitId,
      clientSecretPresent: !!explicitSecret,
      clientIdMasked: explicitId ? mask(explicitId) : null,
      scope: process.env.FOXIT_ESIGN_SCOPE || process.env.FOXIT_SCOPE || null
    };
    return res.json({ ok: !!(token && (pingOk || attempts.length)), baseUrl: base, tokenAcquired: !!token, tokenPreview, attempts, env });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Helpers: small utils ---
function flattenJson(obj, prefix = '', out = {}) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        flattenJson(v, key, out);
      } else {
        out[key] = String(v);
      }
    }
  }
  return out;
}

function getGenerateUrls() {
  const explicit = process.env.FOXIT_DOCGEN_GENERATE_URL;
  if (explicit) return [explicit];

  // Default to the known Foxit docgen generate endpoint
  return [
    'https://na1.fusion.foxit.com/document-generation/api/GenerateDocumentBase64',
  ];
}

// --- Helpers: Foxit OAuth + Analyze ---
async function getFoxitAccessToken() {
  // Allow direct access token via env for quick setup
  if (process.env.FOXIT_ACCESS_TOKEN) {
    return process.env.FOXIT_ACCESS_TOKEN;
  }
  const tokenUrl = process.env.FOXIT_TOKEN_URL;
  const clientId = process.env.FOXIT_CLIENT_ID || process.env.FOXIT_CLOUD_API_CLIENT_ID;
  const clientSecret = process.env.FOXIT_CLIENT_SECRET || process.env.FOXIT_CLOUD_API_CLIENT_SECRET;
  const scope = process.env.FOXIT_SCOPE; // optional
  // If no token URL provided, signal that bearer flow is not configured
  if (!tokenUrl) {
    return null;
  }
  if (!clientId || !clientSecret) {
    throw new Error('Missing FOXIT_CLIENT_ID/FOXIT_CLIENT_SECRET for token request');
  }
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (scope) form.append('scope', scope);

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Foxit token failed: ${resp.status} ${t}`);
  }
  const json = await resp.json();
  if (!json.access_token) throw new Error('No access_token in token response');
  return json.access_token;
}

async function buildFoxitAuthHeaders() {
  const headers = {};
  const id = process.env.FOXIT_CLIENT_ID || process.env.FOXIT_CLOUD_API_CLIENT_ID;
  const secret = process.env.FOXIT_CLIENT_SECRET || process.env.FOXIT_CLOUD_API_CLIENT_SECRET;

  // Prefer Bearer if available
  const accessToken = await getFoxitAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (id && secret) {
    // Some Foxit endpoints accept Basic, some require client_id/client_secret headers
    const basic = Buffer.from(`${id}:${secret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  // Always include explicit client headers if provided (required by some endpoints like AnalyzeDocumentBase64)
  if (id) headers['client_id'] = id;
  if (secret) headers['client_secret'] = secret;

  if (!headers.Authorization && (!id || !secret)) {
    throw new Error('Missing authentication: set FOXIT_ACCESS_TOKEN or FOXIT_TOKEN_URL, or provide FOXIT_CLIENT_ID and FOXIT_CLIENT_SECRET');
  }
  return headers;
}

function extractBase64FromGenerateResp(resp) {
  if (!resp || typeof resp !== 'object') return null;
  const keys = [
    'base64FileString', 'FileBase64', 'fileBase64', 'Base64FileString',
    'document', 'documentBase64', 'file', 'pdfBase64', 'content', 'data',
    'fileContent', 'FileContent', 'FileBytes', 'pdf', 'Pdf', 'PDF', 'OutputFile'
  ];
  for (const k of keys) {
    if (typeof resp[k] === 'string' && resp[k].length > 100) return resp[k];
  }
  const containers = ['result', 'output', 'Result', 'data'];
  for (const c of containers) {
    if (resp[c] && typeof resp[c] === 'object') {
      for (const k of keys) {
        if (typeof resp[c][k] === 'string' && resp[c][k].length > 100) return resp[c][k];
      }
    }
  }
  return null;
}

// Redact very large string fields (especially base64) before logging to console
function redactLargeFields(obj, depth = 0) {
  const MAX_INLINE = 200; // inline strings up to this length
  const BASE64_KEYS = new Set([
    'base64FileString', 'FileBase64', 'fileBase64', 'Base64FileString',
    'document', 'documentBase64', 'file', 'pdfBase64', 'content', 'data',
    'fileContent', 'FileContent', 'FileBytes', 'pdf', 'Pdf', 'PDF', 'OutputFile'
  ]);
  if (obj == null) return obj;
  if (typeof obj === 'string') {
    return obj.length > MAX_INLINE ? `[string length: ${obj.length}]` : obj;
  }
  if (Array.isArray(obj)) return obj.map(v => redactLargeFields(v, depth + 1));
  if (typeof obj === 'object') {
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && (v.length > MAX_INLINE || BASE64_KEYS.has(k))) {
        out[k] = `[${BASE64_KEYS.has(k) ? 'base64' : 'string'} length: ${v.length}]`;
      } else {
        out[k] = redactLargeFields(v, depth + 1);
      }
    }
    return out;
  }
  return obj;
}
function getAnalyzeUrls() {
  const explicitUrl = process.env.FOXIT_DOCGEN_ANALYZE_URL; // preferred if set
  if (explicitUrl) return [explicitUrl];

  // Default to the known Foxit docgen analyze endpoint
  return [
    'https://na1.fusion.foxit.com/document-generation/api/AnalyzeDocumentBase64',
  ];
}

async function analyzeViaFoxit(buffer, filename) {
  const urls = getAnalyzeUrls();
  if (!urls.length) throw new Error('Set FOXIT_DOCGEN_ANALYZE_URL or FOXIT_DOCGEN_BASE_URL');

  const authHeaders = await buildFoxitAuthHeaders();

  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('This server requires Node 18+ for fetch/FormData/Blob to call Foxit APIs.');
  }

  const attempts = [];
  for (const url of urls) {
    try {
      const isBase64Endpoint = /analyz(e)?(document|template)base64/i.test(url);
      if (isBase64Endpoint) {
        // Endpoint expects JSON with Base64 using key: base64FileString
        const b64 = Buffer.from(buffer).toString('base64');
        console.warn(`[analyze] Trying URL (JSON base64FileString): ${url}`);
        const resp = await fetch(url, {
          method: 'POST',
          headers: { ...authHeaders, Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64FileString: b64 }),
        });
        const text = await resp.text();
        if (resp.ok) {
          try { return JSON.parse(text); } catch (_) { return { raw: text }; }
        }
        attempts.push({ url: `${url} (base64FileString)`, status: resp.status, body: text?.slice(0, 300) });
        // Continue to next URL (if any)
        continue;
      }

      // Default: try multipart upload
      console.warn(`[analyze] Trying URL: ${url} (field=file)`);
      let form = new FormData();
      let blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      form.append('file', blob, filename || 'template.docx');
      let resp = await fetch(url, {
        method: 'POST',
        headers: { ...authHeaders, Accept: 'application/json' },
        body: form,
      });
      let text = await resp.text();
      if (resp.ok) {
        try { return JSON.parse(text); } catch (_) { return { raw: text }; }
      }
      // If bad request/unsupported, try alternate field name 'template'
      if (resp.status === 400 || resp.status === 415) {
        console.warn(`[analyze] Retrying URL with field=template: ${url}`);
        form = new FormData();
        blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        form.append('template', blob, filename || 'template.docx');
        resp = await fetch(url, {
          method: 'POST',
          headers: { ...authHeaders, Accept: 'application/json' },
          body: form,
        });
        text = await resp.text();
        if (resp.ok) {
          try { return JSON.parse(text); } catch (_) { return { raw: text }; }
        }
        attempts.push({ url, status: resp.status, body: text?.slice(0, 300) });
        continue;
      }
      attempts.push({ url, status: resp.status, body: text?.slice(0, 300) });
    } catch (e) {
      attempts.push({ url, error: e.message });
    }
  }
  throw new Error(`Foxit analyze failed. Attempts: ${attempts.map(a => `${a.url} -> ${a.status || 'ERR'}${a.body ? ` ${a.body}` : ''}${a.error ? ` ${a.error}` : ''}`).join(' | ')}`);
}

// --- API: analyze (.docx via Foxit) ---
// Accepts: { templateName } or { stepKey } or { base64FileString }
app.post('/api/analyze', async (req, res) => {
  try {
    const { templateName, stepKey, base64FileString } = req.body || {};

    const templatesDir = path.join(__dirname, 'templates');

    // Resolve buffer to send to Foxit
    let buffer;
    let filename;

    if (base64FileString) {
      buffer = Buffer.from(base64FileString, 'base64');
      filename = 'upload.docx';
    } else {
      const mapping = {
        'confidentiality-agreement': 'Confidentiality_Agreement_Acknowledgment.docx',
        'handbook-ack': 'Employee_Handbook_Acknowledgment.docx',
        'it-security-policy': 'IT_Security_Policy_Acknowledgment.docx'
      };

      filename = templateName || (stepKey ? mapping[stepKey] : undefined);
      if (!filename) {
        return res.status(400).json({ error: 'templateName or stepKey (mapped) is required when base64FileString is not provided' });
      }
      const filePath = path.join(templatesDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Template not found: ${filename}` });
      }
      buffer = fs.readFileSync(filePath);
    }

    const result = await analyzeViaFoxit(buffer, filename);
    console.log('Foxit analyze result:', JSON.stringify(result, null, 2));
    return res.json({ provider: 'foxit', ...result });
  } catch (err) {
    console.error('Analyze error', err);
    return res.status(500).json({ error: 'analyze failed', detail: err.message });
  }
});

// --- Static frontend ---
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Foxit Onboarding Demo listening on http://localhost:${PORT}`);
});
