## 2024-08-25 - Prevent Redundant Allocations from Chained Array Methods
**Learning:** The codebase frequently uses chained .filter().length calls inside React render cycles. This acts as a codebase-specific anti-pattern because it causes redundant O(N) array allocations on every render.
**Action:** Wrap such calculations in a useMemo hook to prevent redundant array allocations, rather than replacing them with an imperative for...of loop which sacrifices readability for a micro-optimization.
