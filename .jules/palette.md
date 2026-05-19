## 2026-05-19 - Timeline Component Action Button Accessibility
**Learning:** Hover-revealed UI elements (`opacity-0 group-hover:opacity-100`) are inaccessible via keyboard navigation. Additionally, icon-only action buttons within these containers lacked ARIA attributes, making them unusable for screen readers.
**Action:** When implementing hover-reveal patterns, always pair with `focus-within:opacity-100` on the container, add `focus-visible:ring-*` with `outline-none` on the buttons, and ensure icon-only buttons have descriptive `aria-label` and `title` attributes.
