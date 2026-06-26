## 2024-06-26 - Added ARIA Label to Delete Button
**Learning:** Found an accessibility issue pattern specific to this app's components, where icon-only action buttons lacked semantic labels for screen readers.
**Action:** Always verify icon-only buttons (`<button><Icon/></button>`) have an `aria-label` and `title` to ensure they are accessible.
