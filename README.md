# Foxit Demo
_A thin-slice demo of Foxit PDF APIs in action_  

## 🎯 Purpose  
This demo shows how to turn a repetitive HR workflow into a simple, automated process using Foxit PDF APIs. The example use case is the **Employee Handbook Acknowledgment form**, where employee details are pulled from an HR system, merged into a PDF, and sent for signature.  

---

## 🔑 Value Proposition  
*Turn repetitive HR paperwork into a one-click workflow — data pulled from your HR system, sent for signature, and archived in minutes.*  

---

## 📢 Key Messages  
1. **Automate Prep**  
   - Employee details are auto-filled from the HR system of record (e.g., Workday, BambooHR, ADP).  
   - No manual typing or copy-paste.  
   - Saves minutes per new hire, compounding across onboarding cycles.  

2. **Instant Signature**  
   - Employee receives ready-to-sign PDF via Foxit eSign.  
   - Embedded signing flow — no printing, scanning, or chasing.  
   - Signature + date captured automatically, legally binding.  

3. **Ship It Sealed**  
   - Signed PDFs are flattened and locked (tamper-proof).  
   - Archived for compliance with full audit trail.  
   - Zero rework, zero risk of “missing acknowledgment.”  

---

## 🚀 How the Demo Works  
1. **Prepare Data** — Example JSON simulates HR system export. (Mocks api calls to established HR systems like Workday, Bamboo, etc., to retrieve employee data)
2. **Generate PDF** — Foxit Document Generation API merges data into a DOCX template.  
3. **Send for Signature** — Foxit eSign API routes the PDF to the employee.  
4. **Archive** — Completed, signed PDF is flattened and stored.


Needs:
1. Docx template (and accomapnying b64 text)
2. Dummy Data (json format with docx template encoded)
3. Web app front end, Employee onboarding checklist, with most checked off, except the employee handbook step. click on that (send employee handbook form), "sent succesfully" shows up on the page, hr person also gets an email notifying you that doc has been sent out to sign.
4. Web app behind the scenes, generates pdf (sends json payload to generation API), sends for signing, need to figure this out...

---

## 📌 Call to Action  
👉 *Sign up for a [free Foxit Developer account](https://www.foxit.com/api/pdf-api/), clone this repo, and see how fast you can automate your first onboarding form.*  
