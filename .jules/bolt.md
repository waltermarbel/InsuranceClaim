## 2024-07-24 - Array Iteration Chains Anti-Pattern
**Learning:** Calculating counts or totals by chaining `.reduce()` and `.filter().length` on arrays causes redundant iterations and unnecessary O(N) intermediate array allocations.
**Action:** Optimize by using a single-pass `for...of` loop with accumulator variables to avoid intermediate arrays and reduce iteration overhead.
