## 2024-05-24 - Optimize filter length calculations in renders
**Learning:** Calculating counts or totals by chaining `.filter().length` inside React components causes redundant O(N) array allocations on every render.
**Action:** Optimize by wrapping the calculation in a `useMemo` hook to prevent redundant recalculations on every render, rather than replacing it with an imperative loop.
