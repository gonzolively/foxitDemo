# Templates

This folder contains the Word templates used by the HR onboarding demo.

## How mapping works

- Each HR step in the app is defined in `server.js` with a `key` and a `templateDir` (for example `confidentiality-agreement`, `handbook-ack`, `it-security-policy`).
- For a given step, the server looks in:
  - `templates/<templateDir>/` (or `templates/<stepKey>/` if `templateDir` is not set).
- It picks the **first `.docx` file alphabetically** in that subfolder and uses it for both **Generate** and **Analyze**.

## Adding or changing templates

- Put your DocGen-ready `.docx` template into the appropriate subfolder, e.g.:
  - `templates/confidentiality-agreement/`
  - `templates/handbook-ack/`
  - `templates/it-security-policy/`
- **Only one `.docx` file should be present per subfolder** to avoid ambiguity.
- The actual filename does **not** matter; any `.docx` in that subfolder will be used.
- For a quick overview of how to add merge fields/templated variables to your Word document for Foxit DocGen, see the [Document Generation APIs](https://docs.developer-api.foxit.com/#document-generation-apis).

To add a new step, update `steps` in `server.js` and create a matching folder under `templates/`:

```js
// server.js
const steps = [
  // ...existing steps...
  {
    id: 11,
    key: 'new-step-key',
    title: 'My New Step',
    description: 'What this step does.',
    demo: true,
    templateDir: 'new-step-key',
    completed: false
  }
];
```

```text
templates/
  new-step-key/
    My_New_Step_Template.docx
```

## Text tags (eSign fields)

- Some templates (for example, the confidentiality agreement) include [Foxit text tags](https://docs.developer-api.foxit.com/#document-generation-quick-start-guide) such as `${s:1:y:Employee_Signature}` and `${datefield:1:y:Date_Signed}`.
- These tags are interpreted by Foxit’s APIs to create live signature/date fields when the document is sent for signing.
- In this demo those tag strings are formatted in **white text**, so they are effectively invisible in the generated PDF, but Foxit eSign still converts them into live fields.
- To edit these tags in Word, select just the `${...}` portion, temporarily change the font color to something visible, make your changes, then set the color back to white so the tags disappear again in the final PDF.