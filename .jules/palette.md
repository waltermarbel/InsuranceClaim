## 2026-06-22 - [TaskBoard Keyboard Accessibility]
**Learning:** Hover-revealed UI elements are invisible to keyboard users. To fix this, use focus-within on the container and focus-visible:opacity-100 on the element.
**Action:** Always pair group-hover:opacity-100 with focus-visible:opacity-100 and focus-within on the container for interactive elements.
