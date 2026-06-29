## 2024-05-24 - Chained .filter() Operations in useMemo
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets. This anti-pattern was found in `components/InventoryDashboard.tsx`.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead.
