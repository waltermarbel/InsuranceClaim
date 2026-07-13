## 2024-07-13 - [Optimize Inventory Filters]
**Learning:** Chaining multiple .filter() operations inside React useMemo hooks allocates a new array in memory for each step, causing performance regressions for large datasets. String conversions inside iteration loops also run redundantly.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead, and hoist static operations (e.g., toLowerCase()) outside the iteration.
