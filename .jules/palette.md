## 2024-05-17 - Keyboard Navigation for Hover-Revealed UI Elements
**Learning:** Elements that are visually hidden until hovered (e.g., `opacity-0 group-hover:opacity-100` on the delete button in TaskBoard) are completely invisible and inaccessible to keyboard users unless explicitly handled.
**Action:** Always pair `group-hover:opacity-100` with `focus-visible:opacity-100` and appropriate `focus-visible:ring` utilities so keyboard users can discover and use these interactive elements during tabbing.
