# Foxit Demo (Node.js)

This Node.js (Express) demo shows how to turn a repetitive HR workflow into a simple, automated process using [Foxit PDF APIs](https://www.foxit.com/api/). The example use case is **New Employee Onboarding** — where employee details are pulled from an HR system (mocked in this case), merged into a PDF, previewed, and prepared for an email-based signing flow (the eSign step is currently mocked in this demo).  

---

## 🔧 Key Features
1. **PDF template analysis + data merge (PDF Services API)**  
   - Uses various Foxit APIs to [analyze templates](https://docs.developer-api.foxit.com/#3719098f-9944-45b0-a6ee-3f6129f21622) and [generate filled PDFs](https://docs.developer-api.foxit.com/#638f4c9c-7230-4700-a808-8a888d50b4d2) from JSON-like employee data.  
   - Shows how to pass structured data from your app into Foxit and save the generated PDFs to `/output`.  

2. **Mocked email-based eSign workflow (placeholder for Foxit eSign API)**  
   - Shows where you would upload a generated PDF to Foxit eSign and send it for signature via a secure email link.  
   - The current code mocks this step; use it as a starting point to wire in the real Foxit eSign API (which requires separate access — see the note below).  

3. **Minimal, extensible Node/Express integration**  
   - Simple Express server (`server.js`) that wires together Foxit PDF Services and eSign calls.  
   - Easy to adapt for your own templates, data sources, and additional Foxit APIs.  

4. **Frontend example for HR-style workflows**  
   - A small web UI (`public/`) that lets you pick employees and tasks, generate PDFs, preview them, and trigger signing.  
   - Useful starting point to prototype your own onboarding or document workflows.  

---
 
## 🚀 How the Demo Works
1. Open the **Employee Onboarding App/Portal** with common onboarding tasks.
2. Select an employee from the selector on the top (mocks database or HR system integration backed by the JSON files in `employee_data/`). 
3. Select a task → press **Generate PDF** to [analyze](https://docs.developer-api.foxit.com/#3719098f-9944-45b0-a6ee-3f6129f21622) the template related to the selected task and [generate](https://docs.developer-api.foxit.com/#638f4c9c-7230-4700-a808-8a888d50b4d2) a filled PDF using Foxit PDF APIs. This saves the PDF to `/output`.  
4. Click **Preview** to open the most recently generated PDF for that task in a new tab (uses your browser’s PDF viewer).  
5. Press **Send for Signing** — this triggers the **mocked** eSign flow to illustrate where you would integrate Foxit eSign (no real email/signing is performed yet).  

**Tip:** There are also pre-generated example PDFs in the `examples/` directory that you can open directly to see what the filled documents look like.

---

## 🔐 Getting Foxit PDF Services Credentials

1. Create a Foxit account (if you don't already have one) by going to: https://account.foxit.com/site/sign-up  
2. Once your account is set up, go to: https://app.developer-api.foxit.com/pricing  
3. Under the **"PDF Services API"** product, choose a plan (the **Developer** plan is a good free starting point) and click **"Get Started"**.  
4. After the plan is provisioned, you will see your **Base URL**, **Client ID**, and **Client Secret**. Copy these values down somewhere, as you will paste them into your `.env` file in the following steps.

> **Note on Foxit eSign:** If you want to enable the eSign part of this demo (so it actually sends emails and collects signatures), you’ll first need to request Foxit eSign API access via the [Foxit API Pricing page](https://app.developer-api.foxit.com/pricing) using **"Request Access/Pricing"**. Currently, the Foxit eSign API is available **by request only** and is not included in the standard Developer plan (which currently covers the **PDF Services** API and **Document Generation** APIs). The eSign parts of this demo are implemented as mocks/placeholders to help you see where a real eSign integration would plug in.
---

## 🧰 How to Run the Demo

1) Copy the environment file and then edit `.env` using your Foxit PDF Services credentials from the section above.

```sh
cp .env.example .env
```

2) Install dependencies

```sh
npm install
```

3) Start the app

```sh
npm run dev
```

4) Open the app in your browser by going to:

```sh
http://localhost:3000
```

5) Try it out!

**Note:** Helpful API debugging messages (requests, responses, and errors) are printed to the Node.js server console.