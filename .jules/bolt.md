## 2026-06-12 - Chained .filter() Array Allocations in React Hooks
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks (e.g., `data.filter(...).filter(...)`) allocates a new array in memory for each step. For large datasets, this causes measurable performance regressions and memory pressure due to unnecessary O(1) intermediate allocations and O(m*n) complexity.
**Action:** Use a single-pass iteration with short-circuit returns (e.g. `data.filter(item => condition1 && condition2)`) to ensure O(n) complexity and O(1) array allocation overhead.
