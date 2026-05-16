## 2024-05-16 - Hover-Revealed Actions Require Focus States
**Learning:** Hover-revealed UI elements (e.g., using `opacity-0 group-hover:opacity-100`) often cause accessibility regressions for keyboard users because they remain invisible on focus.
**Action:** Always pair `opacity-0 group-hover:opacity-100` with `focus-visible:opacity-100` and appropriate `focus-visible:ring` utilities to ensure interactive elements are visible and usable during keyboard navigation.
