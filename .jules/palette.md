## 2025-06-09 - Accessible Hover Actions Pattern
**Learning:** In this codebase, the pattern of using `opacity-0 group-hover:opacity-100` for inline actions (like the delete button in TaskBoard) hides these essential controls from keyboard-only users. Because the button remains technically in the DOM with `opacity: 0`, a screen reader can tab to it, but a sighted keyboard user cannot see what they are focusing on.

**Action:** Whenever implementing or fixing a `group-hover:opacity-100` reveal pattern, strictly pair it with three focus-related modifications:
1.  Add `focus-within:bg-slate-50` (or similar active state) to the parent container so the user knows which row is active.
2.  Add `focus-visible:opacity-100` directly to the hidden button so it reveals itself upon receiving tab focus.
3.  Add explicit focus rings (e.g., `focus-visible:ring-2 focus-visible:outline-none`) to ensure the focus state is unmistakable.
