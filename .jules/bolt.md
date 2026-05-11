## 2024-05-24 - Array Chaining Anti-Pattern
**Learning:** Found an O(N*M) array filtering anti-pattern in React `useMemo` hooks where an array of data was passed through multiple sequential `.filter()` operations instead of evaluating all conditions in a single pass. Also found redundant string operations inside loops where variables could be hoisted.
**Action:** Always combine sequential array filters into a single pass to minimize intermediate object allocations. Hoist unchanging calculations (e.g., `searchTerm.toLowerCase()`) outside the loop.
