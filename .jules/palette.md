## 2024-07-08 - Keyboard accessibility for hover-revealed elements
**Learning:** Elements made visible only on hover (`opacity-0 group-hover:opacity-100`) become inaccessible via keyboard navigation because users cannot see where focus currently is.
**Action:** When using hover-revealed patterns, always add `focus-within:opacity-100` (or `focus-within:border` etc) to the parent container to show hover-like styling, and `focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none` directly to the hidden interactive elements to make them discoverable.
