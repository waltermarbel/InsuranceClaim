## 2026-07-18 - Hoist toLowerCase() operations outside loops
**Learning:** Chaining multiple string conversions consecutively inside loops causes performance regressions. Pre-compute these values whenever possible.
**Action:** Hoist static operations (e.g., string conversion like `searchTerm?.toLowerCase()`) outside of iteration loops (like `.filter()` or `.map()`) to reduce redundant operations from O(N) to O(1).
