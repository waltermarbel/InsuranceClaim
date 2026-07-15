## 2025-07-15 - Replace Chained Filter with Single Pass Iteration
**Learning:** Chaining multiple .filter() operations consecutively inside React useMemo hooks allocates a new array in memory for each step, causing performance regressions for large datasets.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead, and hoist static operations outside iteration loops to reduce redundant operations.
