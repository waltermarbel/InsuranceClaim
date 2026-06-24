## 2024-05-24 - Single-pass filtering over chained operations
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets, especially when triggered on every typing keystroke (e.g. search term) or rapid filter updates.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead. Ensure all dependencies accessed inside the single pass are correctly listed in the hook dependency array.
