## 2024-06-03 - Hover-Revealed UI Elements Are Inaccessible to Keyboards
**Learning:** Hover-revealed elements (like `opacity-0 group-hover:opacity-100`) used for actions such as delete buttons are completely invisible to keyboard-only and screen-reader users since they cannot trigger hover states.
**Action:** Always pair `opacity-0 group-hover:opacity-100` with `focus-within:opacity-100` on the container (e.g. `group`) and `focus-visible:ring-2 focus-visible:opacity-100` on the interactive element to ensure it appears and is accessible during keyboard navigation.
