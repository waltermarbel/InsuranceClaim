## 2025-05-18 - TaskBoard Hover Styles Accessibility
**Learning:** Hover-revealed interactive UI elements (like the trash icon on the TaskBoard) using `opacity-0 group-hover:opacity-100` are invisible to keyboard users and lack semantic context.
**Action:** Pair hover-revealed elements with `focus-within:opacity-100` on the group container and `focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100` directly on the button to ensure keyboard focusability and visibility. Provide `aria-label` and `title` to these buttons.
