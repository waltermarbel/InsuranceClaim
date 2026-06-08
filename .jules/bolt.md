## 2024-06-08 - Array allocation anti-pattern with chained `.filter()` inside `useMemo`
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (e.g., in `InventoryDashboard.tsx` with multiple active filters).
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead.
