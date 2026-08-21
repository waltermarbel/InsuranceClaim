## 2024-05-18 - Avoid O(N) Array Allocations in React Renders
**Learning:** Calculating counts or totals by chaining `.filter().length` inside React components causes redundant O(N) array allocations on every render.
**Action:** Optimize by wrapping the calculation in a `useMemo` hook to prevent redundant recalculations on every render. When inside an already memoized callback, use native JavaScript methods like `.reduce()` instead of nesting `useMemo`.
