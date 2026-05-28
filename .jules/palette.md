## 2026-05-28 - Focus-within required for hover-revealed elements
**Learning:** Elements using `opacity-0 group-hover:opacity-100` remain invisible when focused via keyboard unless the container has `focus-within:opacity-100` and the elements have `focus-visible` styles applied.
**Action:** When adding hover-revealed actions (like edit/delete buttons), always pair `group-hover:opacity-100` with `focus-within:opacity-100` on the container, and ensure interactive elements have clear `focus-visible` indicators.
