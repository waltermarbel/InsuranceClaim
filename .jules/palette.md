## 2024-05-20 - Adding Accessibility Labels to Icon Buttons
**Learning:** Icon-only buttons without `aria-label` or `title` attributes are completely inaccessible to screen readers and lack helpful tooltip context for mouse users.
**Action:** When creating or modifying components with icon-only buttons (like `TaskBoard`), ensure `aria-label` and `title` attributes are present. For dynamic states (like toggle buttons), the label should update contextually to reflect the current state (e.g., "Mark as complete" vs "Mark as incomplete").
