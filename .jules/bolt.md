## 2024-07-02 - Array Allocation in chained Array.filter() operations
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets and unnecessary GC pressure.
**Action:** Use a single-pass iteration (with a single `.filter()` or `.reduce()`) with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead when filtering complex datasets in the frontend.
