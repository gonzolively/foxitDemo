# Public (Frontend)

This folder contains the static frontend for the HR onboarding demo.

- `index.html` – Main app UI with the onboarding steps, employee selector, and buttons to generate, preview, and send documents for signing.
- `app.js` – Client-side logic that calls the backend APIs (`/api/steps`, `/api/employees`, `/api/generate`, `/api/esign/send`) and wires up the buttons and status messages.
- `style.css` – Styling for the onboarding layout, cards, toolbar, and basic Foxit-themed look and feel.
- `viewer.html` / `viewer.js` – Simple PDF viewer page used when previewing generated documents.

If you want to customize the demo UI, this is the place to change text, layout, or behavior without touching the server code.