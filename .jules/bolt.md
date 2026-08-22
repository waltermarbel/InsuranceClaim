## 2024-08-22 - Optimize array allocations
**Learning:** Found multiple instances of `array.filter(condition).length` inside React render cycles (e.g., `ProcessingPreview` and `UploadProgressView`). This allocates intermediate arrays on every render, wasting memory and causing GC overhead.
**Action:** Replaced these with `array.reduce()` (and wrapped in `useMemo` when appropriate) to calculate counts in a single pass without intermediate allocations. Use native `.reduce()` instead of nesting `useMemo` when calculating multiple derived states from the same array.
