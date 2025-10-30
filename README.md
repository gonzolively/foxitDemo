# Foxit Demo

This demo shows how to turn a repetitive HR workflow into a simple, automated process using Foxit PDF APIs.  
The example use case is **New Employee Onboarding** — employee details are pulled from an HR system, merged into a PDF, previewed, and sent for signature.  

---

## 🔑 Value Proposition  
*Turn repetitive HR paperwork into a one-click workflow — data pulled from your HR system, signed in minutes, archived for compliance.*  

---

## 📢 Key Messages  
1. **Automate Prep**  
   - Employee details are auto-filled from HR systems (Workday, BambooHR, ADP).  
   - No manual typing or copy-paste.  
   - Minutes saved per new hire, multiplied across teams.  

2. **Instant Signature**  
   - Employee gets a ready-to-sign PDF via Foxit eSign.  
   - **No printing, scanning, or emailing PDFs.**  
   - Signature + date are automatic, legally binding.  

3. **Ship It Sealed**  
   - PDFs are flattened, locked, and archived.  
   - Full audit trail for compliance.  
   - Zero risk of missing acknowledgments.  

---

## 🚀 How the Demo Works
1. Open the **Employee Onboarding App/Portal** with common onboarding tasks.  
2. Select a task → press **Generate PDF** to pull employee data (mocked here), analyze the template, populate fields, and send to Foxit for generation.  
3. Click **Preview PDF** to review the filled PDF before sending.  
4. Press **Send for Signing** — the PDF is securely emailed for employee signature.  

---

## 📌 Call to Action  
👉 *Sign up for a [free Foxit Developer account](https://www.foxit.com/api/pdf-api/), clone this repo, and automate your first onboarding form today.*  


---

## 🧰 Local App (Node) — How to Run

This repo now includes a minimal Node/Express app that renders an onboarding flow with 10 common HR steps. Each step has three buttons — Generate PDF, Preview, and Send for Signing — wired to API endpoints. The Generate button calls Foxit’s Document Generation “Analyze” API (no local parsing) and shows the JSON in a debug panel.

### Quick start

```sh
# From the repo root
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

### Scripts

- `npm run dev` — start with live-reload (nodemon)
- `npm start` — start in production mode

### API endpoints

- `GET /api/health` — Health check
- `GET /api/steps` — Returns the list of onboarding steps
- `POST /api/analyze` — Uploads the `.docx` to Foxit DocGen “Analyze” and returns the analysis JSON
- `POST /api/generate` — Calls Foxit DocGen “GenerateDocumentBase64” with `documentValues` and returns the JSON (includes base64 PDF)
- `POST /api/preview` — Placeholder to preview a generated PDF
- `POST /api/send` — Placeholder to send a PDF for eSign

All POST endpoints accept JSON like:

```json
{ "stepKey": "confidentiality-agreement" }
```

For analyze, you can post a specific template name or a base64-encoded `.docx` file:

```json
{ "templateName": "Employee_Handbook_Acknowledgment.docx" }
```

or

```json
{ "base64FileString": "<base64 of a .docx>" }
```

For generate, POST JSON like:

```json
{
   "stepKey": "confidentiality-agreement",
   "outputFormat": "pdf",
   "currencyCulture": "en-US",
   "documentValues": { "Name": "Jordan", "AccountName": "Jordan O'Connor" }
}
```
If `documentValues` is omitted, the server will load and flatten `employee_data/jane_doe.json` as a demo data source.

### Configure environment

Copy `.env.example` to `.env` and fill in your Foxit credentials and endpoints:

```
PORT=3000
FOXIT_CLIENT_ID=your_client_id
FOXIT_CLIENT_SECRET=your_client_secret
FOXIT_TOKEN_URL=your_token_url # OAuth token endpoint for client credentials
FOXIT_SCOPE=optional_scope     # optional

# Either set the explicit analyze endpoint (recommended)…
FOXIT_DOCGEN_ANALYZE_URL=https://na1.fusion.foxit.com/document-generation/api/templates/analyze
# …or provide a base URL and we will call `${BASE}/templates/analyze`.
FOXIT_DOCGEN_BASE_URL=https://na1.fusion.foxit.com/document-generation/api

# eSign base (adjust per region/env)
FOXIT_ESIGN_BASE_URL=https://api.foxitcloud.com/esign
```

---

## 🧭 Onboarding Steps in this Demo

The flow includes 10 common HR steps with the last three as requested:

1. Personal Information
2. W-4 Tax Withholding
3. I-9 Employment Eligibility
4. Direct Deposit Authorization
5. Emergency Contact
6. Benefits Enrollment
7. Background Check Consent
8. Confidentiality (NDA) Agreement
9. Employee Handbook Acknowledgement
10. IT Security Policy Acknowledgement

Each step has three non-functional buttons for now:

- Generate Form
- Preview
- Send for Signing

Analyze calls Foxit DocGen directly. Preview/Send remain stubs for now so you can wire in Foxit eSign next.
The UI maps actions as follows: Generate → Analyze (shows tags), Preview → Generate (opens PDF), Send → stub.

---

## 🔌 Next: Integrate Foxit PDF APIs

Where to add logic:

- In `server.js`, replace the stub logic in:
   - `POST /api/generate` — Create a PDF, merge fields, save temp file/object
   - `POST /api/preview` — Stream or link a preview
   - `POST /api/send` — Initiate Foxit eSign workflow

- In `public/app.js`, you can handle returned preview URLs or statuses to update the UI.

Consider reading employee data from `employee_data/` to pre-fill forms.

---

## 🗂️ Project structure

```
foxitDemo/
├─ employee_data/              # Sample employee JSON data
├─ templates/                  # Placeholder for PDF templates
├─ public/                     # Static frontend (HTML/CSS/JS)
│  ├─ index.html
│  ├─ style.css
│  └─ app.js
│  # The UI includes a visible "Analyze Debug Output" panel that shows the JSON returned by /api/analyze
├─ server.js                   # Express server with stub APIs
├─ package.json
├─ .env.example
└─ README.md
```
