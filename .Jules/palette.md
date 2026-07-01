## 2024-07-02 - TaskBoard Toggle/Delete Buttons
**Learning:** Found multiple places in `TaskBoard.tsx` where interactive state buttons lacked `aria-pressed` or tooltips/`aria-label`s, which is critical for screen readers to understand the state of tasks (pending/completed) and which task will be deleted.
**Action:** Always verify `aria-pressed` on toggle states and `aria-label`/`title` on icon-only buttons like Trash/Toggle Task. Added `aria-label`, `title` and keyboard focus states to improve accessibility.
