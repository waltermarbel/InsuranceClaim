## 2025-02-18 - XSS via contentEditable innerHTML
**Vulnerability:** The RichTextEditor component directly assigned unsanitized input to `innerHTML` via `contentEditable`, creating a high-priority XSS risk.
**Learning:** Because the component requires HTML formatting capabilities, simple CSS alternatives like `whitespace-pre-wrap` are insufficient, meaning a dedicated sanitization library (e.g., `dompurify`) is necessary.
**Prevention:** Always use a sanitization library like `DOMPurify` before assigning user-controlled HTML to `innerHTML` or state that renders raw HTML.
