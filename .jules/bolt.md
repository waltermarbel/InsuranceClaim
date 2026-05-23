## 2026-05-23 - Prevent multiple memory allocations in InventoryDashboard tableData hook
**Learning:** Chaining multiple .filter() operations consecutively inside React useMemo hooks allocates a new array in memory for each step, causing performance regressions for large datasets.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead.
