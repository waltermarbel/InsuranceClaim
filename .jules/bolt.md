## 2024-07-28 - Optimize Array Iteration Counts
**Learning:** Calculating counts or totals by chaining `.filter().length` on arrays causes redundant iterations and unnecessary O(N) intermediate array allocations.
**Action:** Optimize by using a single-pass `for...of` loop with accumulator variables.
