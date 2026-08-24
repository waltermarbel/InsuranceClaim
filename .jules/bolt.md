## 2025-03-05 - Avoid .filter().length without memoization
**Learning:** Calculating totals or counts using `.filter().length` directly in React component render bodies causes redundant O(N) array allocations on every render.
**Action:** Always wrap `.filter().length` operations in a `useMemo` hook to prevent redundant array allocations during re-renders, reducing GC pressure without sacrificing readability.
