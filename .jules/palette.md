## 2024-05-30 - Hover-revealed Icon Buttons Keyboard Accessibility
**Learning:** Hover-revealed interactive elements (like Edit/Delete icon buttons) using `opacity-0 group-hover:opacity-100` are completely invisible to keyboard-only users navigating via Tab, causing confusion and poor accessibility.
**Action:** Always pair `group-hover:opacity-100` with `focus-within:opacity-100` on the parent container, and add `focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100` to the interactive elements inside to ensure they appear and highlight properly when focused.
