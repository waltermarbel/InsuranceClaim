## 2024-05-24 - Chaining .filter() in useMemo
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (O(n) complexity but O(k) array allocation overhead where k is number of filters).
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead.
