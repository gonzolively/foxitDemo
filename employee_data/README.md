# Employee Data

This folder contains JSON files that represent employees used by the HR onboarding demo.

## What these files are

- Each `*.json` file (for example `bugs_bunny.json`, `road_runner.json`, `wile_e_coyote.json`) **mocks a row from a database or an HR API response**.
- When you generate a document, the server loads the selected employee JSON, flattens all its fields, and sends them as `documentValues` into Foxit DocGen.
- The templates in `templates/` are designed so that **all the data they need comes from these JSON files** (e.g., `employeeName`, `employeeEmail`, `jobTitle`, etc.).

## Required and recommended fields

- At minimum, you should provide:
  - `employeeName` (used in the UI and in documents)
  - `employeeEmail` (used for eSign when not overridden by env)
- All other fields are optional, but any key you add can be referenced in templates.
  - Example keys used in the sample data: `companyName`, `department`, `jobTitle`, `hireDate`, `managerEmail`, `officeLocation`, etc.

## Adding a new employee

1. Create a new JSON file in this folder named with a simple key, e.g. `jane_doe.json`.
2. Include at least `employeeName` and `employeeEmail`, plus any other fields you want to merge into templates:

```json
{
  "employeeName": "Jane Doe",
  "employeeEmail": "jane.doe@example.com",
  "companyName": "Acme Corporation",
  "department": "Engineering",
  "jobTitle": "Software Engineer"
}
```

3. The filename (without `.json`) becomes the **employee key** shown in the app’s employee selector (formatted nicely via `toDisplay`).
4. Once the file is saved, restart the app (or refresh the employee list) and your new employee will appear and can be used with all templates.
