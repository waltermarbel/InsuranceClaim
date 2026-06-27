## 2025-03-05 - Hover-Revealed UI Keyboard Accessibility
**Learning:** Hover-revealed UI elements (e.g., delete buttons) are invisible to keyboard-only users unless explicitly handled with `focus-within` on the container and `focus-visible` on the element.
**Action:** Always pair `opacity-0 group-hover:opacity-100` on elements with `focus-visible:opacity-100 focus-visible:ring-2`, and add `focus-within` styling to the parent `.group` container to show context when focused.
