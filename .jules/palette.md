
## 2026-07-05 - TaskBoard Accessibility & Keyboard Navigation
**Learning:** Hover-revealed action buttons inside list items are completely invisible to keyboard-only users unless explicitly paired with both `group-focus-within:opacity-100` on the container and `focus-visible:opacity-100` on the button itself. Additionally, stateful tab filters require the `aria-pressed` attribute to semantically convey their active state to screen readers.
**Action:** Always implement `focus-within` alongside `hover` to ensure keyboard navigability for revealed UI elements, and use `aria-pressed` for toggle buttons that do not navigate to a new page.
