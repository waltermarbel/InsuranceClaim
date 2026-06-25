## 2024-06-25 - Fix Hover-Reveal Keyboard Inaccessibility
**Learning:** Hover-revealed UI elements using opacity-0 group-hover:opacity-100 are invisible to keyboard-only navigation, breaking accessibility.
**Action:** Always pair group-hover:opacity-100 with focus-within:opacity-100 on the container, and focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100 on the interactive element.
