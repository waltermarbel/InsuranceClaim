## 2025-07-16 - Make hover-revealed elements accessible via keyboard
**Learning:** Interactive elements hidden via `opacity-0 group-hover:opacity-100` remain invisible when receiving keyboard focus unless explicitly addressed.
**Action:** Pair hover classes with `focus-visible:opacity-100` on the interactive element and `focus-within` styling on the parent container to ensure visibility during keyboard navigation.
