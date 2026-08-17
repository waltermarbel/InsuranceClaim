## 2024-05-18 - Avoid unmemoized .filter().length in renders
**Learning:** Calculating counts or totals by chaining `.filter().length` inside React components causes redundant O(N) array allocations on every render.
**Action:** Optimize by wrapping the calculation in a `useMemo` hook to prevent redundant recalculations on every render, rather than replacing it with an imperative `for...of` loop which degrades readability.
