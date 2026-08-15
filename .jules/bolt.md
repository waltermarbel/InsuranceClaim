## 2026-07-26 - Optimize Array Counting in ProcessingPreview
**Learning:** Calculating counts by chaining `.filter().length` on arrays causes redundant iterations and unnecessary O(N) intermediate array allocations.
**Action:** Optimize by using a single-pass `for...of` loop with accumulator variables.
