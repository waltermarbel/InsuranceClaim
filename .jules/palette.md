## 2024-06-10 - Hover-revealed Action Buttons Accessibility
**Learning:** Hover-revealed action buttons (using `opacity-0 group-hover:opacity-100`) are completely inaccessible to keyboard users as they never become visible during tab navigation. The parent container must also have `focus-within:opacity-100` if the whole row should show the actions, or the button itself needs `focus-visible:opacity-100` to appear when tabbed to.
**Action:** When adding hover-based visibility classes, always pair them with their `focus-visible` or `focus-within` equivalents to ensure keyboard navigation remains functional.

## 2024-06-10 - Stateful View Toggles
**Learning:** Standard buttons used as tab/view toggles visually indicate their active state via background color changes, but screen readers are unaware of the active tab.
**Action:** Always use the `aria-pressed` attribute (e.g., `aria-pressed={isActive}`) on buttons that toggle UI views or filter states.