# Foxit Demo (Node.js)

This Node.js (Express) demo shows how to turn a repetitive HR workflow into a simple, automated process using [Foxit PDF APIs](https://www.foxit.com/api/). The example use case is **New Employee Onboarding** — where employee details are pulled from an HR system (mocked in this case), merged into a PDF, previewed, and sent for signature via Foxit eSign’s email flow (no embedded viewer).  

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

## 📌 Call to Action  
👉 *Sign up for a [free Foxit Developer account](https://www.foxit.com/api/pdf-api/), clone this repo, and automate your first onboarding form today.*  

---

## 🚀 How the Demo Works
1. Open the **Employee Onboarding App/Portal** with common onboarding tasks.
2. Select an employee from the selector on the top (mocks database or HR system integration) 
3. Select a task → press **Generate PDF** to [analyze](https://docs.developer-api.foxit.com/#3719098f-9944-45b0-a6ee-3f6129f21622) the template and [generate](https://docs.developer-api.foxit.com/#638f4c9c-7230-4700-a808-8a888d50b4d2) a filled PDF using Foxit PDF APIs. This saves the PDF to `/output`.  
4. Click **Preview** to open the most recently generated PDF for that task in a new tab (uses your browser’s PDF viewer).  
5. Press **Send for Signing** — the generated PDF is uploaded (base64) to Foxit eSign and the signer receives a secure email link to sign.  

---

## 🧰 How to Run the Demo

1) Copy the environment file and then edit using your provided API credentials.

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