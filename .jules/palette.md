## 2024-05-15 - Hover-Revealed Actions Keyboard Accessibility
**Learning:** Hover-revealed UI elements (e.g., `opacity-0 group-hover:opacity-100`) become completely invisible and inaccessible during keyboard navigation if focus styles are not applied.
**Action:** Always pair `group-hover:opacity-100` on the container with `focus-within:opacity-100` to make the entire group visible when any child element receives focus. Furthermore, apply `focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100` directly to the interactive children to clearly indicate which element has focus.
