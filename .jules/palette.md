## 2026-07-12 - [Keyboard Accessibility for Hover-Revealed UI]
**Learning:** Hover-revealed UI elements using `opacity-0 group-hover:opacity-100` become invisible and inaccessible to keyboard users navigating via Tab, as they never receive the hover state.
**Action:** Always append `focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none` to interactive hover-revealed elements to ensure they appear visually and semantically when focused via keyboard navigation.
