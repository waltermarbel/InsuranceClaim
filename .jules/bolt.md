## 2024-06-23 - Prevent Intermediate Array Allocations in useMemo
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (O(N*M) complexity). Missing `useMemo` dependency arrays also cause issues where the component is rendered with stale data when filters change.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead, and ensure all react hooks depend on relevant state variables.
