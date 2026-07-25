## 2025-07-16 - Make hover-revealed elements accessible via keyboard
**Learning:** Interactive elements hidden via `opacity-0 group-hover:opacity-100` remain invisible when receiving keyboard focus unless explicitly addressed.
**Action:** Pair hover classes with `focus-visible:opacity-100` on the interactive element and `focus-within` styling on the parent container to ensure visibility during keyboard navigation.

## 2026-07-25 - Hover-Revealed UI Keyboard Accessibility
**Learning:** In Tailwind CSS, action buttons hidden by `opacity-0 group-hover:opacity-100` are completely inaccessible to keyboard users because tabbing into them does not trigger the hover state.
**Action:** Always pair `opacity-0 group-hover:opacity-100` on the container with `focus-within:opacity-100`, and explicitly add focus visible utilities (`focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100`) directly to the interactive child elements to ensure they appear when focused via the keyboard.
