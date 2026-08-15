## 2024-07-29 - Optimize array filtering and reduction
**Learning:** Calculating counts or totals by chaining `.filter().length` or `.filter().reduce()` on arrays causes redundant iterations and unnecessary O(N) intermediate array allocations.
**Action:** Optimize by using a single-pass `for...of` loop with accumulator variables.
