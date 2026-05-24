## 2026-05-24 - Hover-revealed Elements Accessibility
**Learning:** Elements styled with `opacity-0 group-hover:opacity-100` become invisible to keyboard users navigating via Tab unless specifically handled.
**Action:** Always add `focus-within:opacity-100` to the parent `group` container, and `focus-visible:opacity-100 focus-visible:ring-* outline-none` directly to the interactive child elements to ensure they are visible and clearly focused when accessed via keyboard navigation.
