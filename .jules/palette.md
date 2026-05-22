## 2024-05-15 - Interactive Icon Accessibility
**Learning:** Hover-revealed UI elements (`opacity-0 group-hover:opacity-100`) are invisible during keyboard navigation unless paired with focus states. Icon-only buttons also require `aria-label`s for screen reader support.
**Action:** Always include `focus-within:opacity-100` on the hover-revealed container, and `outline-none focus-visible:ring-*` directly on interactive elements. Add `aria-label`s to all icon-only buttons.
