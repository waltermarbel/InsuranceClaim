## 2026-07-23 - Optimize Array Iterations
**Learning:** Calculating counts or totals by chaining `.reduce()` and `.filter().length` on arrays causes redundant iterations and unnecessary O(N) intermediate array allocations.
**Action:** Optimize by using a single-pass `for...of` loop with accumulator variables.
