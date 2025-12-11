# TODO: filebin-backed eSign flow for Foxit demo

## 1. Wire filebin upload into /api/esign/send
File: `server.js`

- [x] Add a small helper function for uploads, `uploadToFileBin(buffer, fileName)`, that:
  - Uses the built-in `fetch` to POST the PDF to `https://filebin.net/{bin}/{filename}`.
  - Treats that URL itself as the public HTTPS URL.
- [x] In `/api/esign/send` (Foxit eSign), before calling `sendViaFoxitEsign`:
  - Read the generated PDF from disk.
  - Call `uploadToFileBin` with the same PDF buffer and `fileName`.
  - Pass the resulting public URL into `sendViaFoxitEsign`.
- [x] If filebin upload fails, log it but **do not break** the core PDF generation demo; `sendViaFoxitEsign` will fall back to other strategies if configured.

## 2. Thread the public URL into /api/esign/send

- [ ] Update the front-end call (in `public/app.js`) so that when it calls `/api/esign/send`, it includes the `publicFileUrl` from the last `/api/generate` response if available.
  - Example request body field: `publicFileUrl`.
- [ ] In `/api/esign/send`:
  - Accept a new field `publicFileUrl`.
  - Prefer `publicFileUrl` for eSign **if present**.
  - Keep the existing local-file resolution (`fileUrl`/`filePath`/`stepKey`) as a fallback for previewing and for mocked eSign.

## 5. Use publicFileUrl in sendViaFoxitEsign

- [ ] Change the `sendViaFoxitEsign` helper to accept an optional `publicFileUrl` argument **or** infer it from the request.
- [ ] In the URL-based `folders/createfolder` payload:
  - Use `publicFileUrl` when it exists.
  - Only fall back to `EXTERNAL_BASE_URL` + `/output/...` when `publicFileUrl` is not provided (i.e., tunnel/setup not done yet).
- [ ] Keep the rest of the payload aligned with the working sample:
  - `folderName`, `fileNames`, `parties[firstName/lastName/emailId/permission/sequence]`.
  - `inputType: 'url'`.
  - `sendNow: true`.
  - Reasonable defaults for `processTextTags`, `processAcroFields`, and the embedded session flags.

## 6. Make sure the email always reaches the demo runner

- [ ] Keep `FOXIT_ESIGN_DEMO_SIGNER_EMAIL` in `.env.example` and README as the **recommended** way to ensure the demo runner gets the email.
- [ ] In `/api/esign/send`, keep the current priority order for signer email:
  1. Explicit `signerEmail` from the request (if provided).
  2. `FOXIT_ESIGN_DEMO_SIGNER_EMAIL` from env.
  3. `employeeEmail` from the JSON in `employee_data/`.
- [ ] Confirm we always log the final `signerEmail` chosen in the `[esign] /api/esign/send` console output.

## 7. Document the advanced S3 + real eSign path

- [ ] Add a short section to `README.md`, under the existing eSign note, titled something like **"Advanced: Real eSign with S3-hosted PDFs"**.
- [ ] Explain at a high level:
  - This is optional and mainly for internal/advanced demos.
  - Requires: Foxit eSign API access **and** a public S3-style bucket.
  - Once configured, the app will automatically upload generated PDFs to S3, pass the public URL to Foxit eSign, and send real emails.
  - Regular users can ignore this and stick with the default mocked eSign behavior.

## 8. Sanity checklist before calling this done

- [ ] With S3 configured, run the full flow:
  - Generate NDA.
  - Confirm file appears in S3 with expected key.
  - Confirm `/api/generate` returns `publicFileUrl`.
  - Send for signing.
  - Check Node logs for `[esign]` lines that show the S3 URL being used.
  - Verify email arrives at `FOXIT_ESIGN_DEMO_SIGNER_EMAIL`.
- [ ] Without file.io (or if it fails), confirm:
  - PDF generation still works and writes to `/output`.
  - eSign remains mocked (or URL-based tunnel) and the app doesn't crash.
- [ ] Keep the code paths simple and well-logged so future me (or another dev) can debug quickly.