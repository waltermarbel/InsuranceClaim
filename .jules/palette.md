## 2024-06-05 - Keyboard Accessibility on Hover-Revealed UI Elements
**Learning:** A recurring anti-pattern was found where action buttons were hidden visually using `opacity-0 group-hover:opacity-100`, making them invisible and unintuitive for keyboard users during focus navigation.
**Action:** Always pair `group-hover:opacity-100` with `focus-within:opacity-100` on the container, and add `focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100` directly to the interactive children to ensure they are visible and usable when focused via keyboard.
