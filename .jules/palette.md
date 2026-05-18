## 2026-05-18 - Missing Focus Styles on Hover-Revealed UI Elements
**Learning:** Hover-revealed UI elements (e.g., `opacity-0 group-hover:opacity-100`) are invisible during keyboard navigation unless paired with `focus-within:opacity-100`.
**Action:** Always add `focus-within:opacity-100` to hover-revealed containers, and `focus-visible:ring-*` alongside `outline-none` directly to the interactive elements to ensure they are visible and usable via keyboard navigation.
