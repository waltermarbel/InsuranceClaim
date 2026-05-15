## 2024-05-24 - React useMemo Filtering Optimization Anti-pattern
**Learning:** By chaining multiple `.filter()` operations consecutively inside a React `useMemo` hook, each intermediate `.filter()` causes an allocation of a completely new array in memory. For complex dashboards filtering thousands of rows like the inventory table, this causes significant performance regressions and potential GC stutters.
**Action:** Always combine chained filters into a single array iteration with short-circuit returns to ensure O(n) runtime complexity and O(1) array allocation overhead.
