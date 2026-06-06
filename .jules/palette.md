## 2025-03-09 - Accessible Hover-Revealed UI Elements
**Learning:** Hover-revealed UI elements (e.g., using `opacity-0 group-hover:opacity-100`) are invisible to keyboard-only users navigating the interface. In `InventoryDashboard.tsx`, the delete item button was hidden from keyboard focus.
**Action:** When using hover-revealed containers, always add `focus-within:opacity-100` to the container, and `focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100` to the interactive elements inside. Additionally, ensure icon-only buttons have an `aria-label`.
