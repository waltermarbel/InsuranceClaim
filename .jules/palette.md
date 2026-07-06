## 2024-07-06 - Keyboard Nav Accessibility for Hover-revealed Elements
**Learning:** Elements that are conditionally revealed on hover (using utilities like `opacity-0 group-hover:opacity-100`) become invisible and confusing during keyboard navigation, as users can tab to them but cannot see what they are focused on.
**Action:** When using hover-revealed patterns, always pair them with `focus-visible:opacity-100` and `focus-visible:ring-2` to ensure they appear visibly on screen and receive a focus ring when navigated to via keyboard.
