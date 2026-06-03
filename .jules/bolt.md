## 2024-06-03 - Chained Array Filters Anti-Pattern
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions and unnecessary memory overhead for large datasets.
**Action:** Use a single-pass iteration (e.g., using a single `.filter()` with combined conditions and short-circuit evaluation, or `.reduce()`) to ensure O(n) complexity and O(1) array allocation overhead.
