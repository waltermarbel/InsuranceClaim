## 2024-07-16 - Make hover-revealed actions keyboard accessible
**Learning:** Hover-revealed UI elements are invisible during keyboard navigation unless paired with focus-within:opacity-100 on the container and focus-visible:opacity-100 on the interactive elements.
**Action:** Always add focus-within visibility classes to containers with group-hover visibility, and use focus-visible styling (ring and opacity) for internal interactive elements.
