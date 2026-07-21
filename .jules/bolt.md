## 2026-07-21 - Optimize array calculations by replacing chained reduce/filter with single-pass loop
**Learning:** Calculating counts or totals by chaining `.reduce()` and `.filter().length` on arrays causes redundant iterations and unnecessary O(N) intermediate array allocations.
**Action:** Optimize by using a single-pass `for...of` loop with accumulator variables.
