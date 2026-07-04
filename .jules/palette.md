## 2024-07-04 - Enhance TaskBoard Keyboard Accessibility & Screen Reader Context
**Learning:** Hover-revealed elements inside dynamic lists (like delete task buttons) require explicit keyboard focus states (`focus-within` on the container and `focus-visible` on the element) and aria-labels for icon-only components.
**Action:** Always ensure that any action revealed by `group-hover` is mirrored with `focus-within` or `focus-visible` so that keyboard users are not blocked from critical actions.
