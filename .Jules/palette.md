## 2024-05-24 - Accessibility for Interactive List Items
**Learning:** For interactive task list items with multiple actions, adding explicit ARIA labels and keyboard focus visibility (`focus-visible:ring-2 focus-visible:outline-none`) ensures they are usable by screen readers and keyboard users.
**Action:** Always add `aria-label` and `title` to icon-only buttons, and ensure they have `focus-visible:opacity-100` styles when hidden behind hover interactions.
