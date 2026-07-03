## 2024-07-03 - Optimization of InventoryDashboard Filters
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (O(n) complexity but high overhead). Hoisting static conversions outside iteration loops also yields significant gains.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and minimal array allocation overhead.
