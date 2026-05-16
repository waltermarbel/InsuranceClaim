## 2024-05-16 - [Optimize Filter Chains in useMemo]
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks (such as computing filtered table data based on state) causes performance regressions for large datasets because each step allocates a new array in memory.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead.
