## 2024-08-15 - XSS Vulnerability in ClaimDetailsEditor
**Vulnerability:** XSS vulnerability in ClaimDetailsEditor by directly setting unsanitized values to innerHTML.
**Learning:** The component uses a rich text editor that relies on contentEditable and document.execCommand, directly assigning unsanitized values to innerHTML. Because the component requires HTML formatting capabilities, simple CSS alternatives like whitespace-pre-wrap are insufficient.
**Prevention:** Always use a dedicated sanitization library like DOMPurify when assigning user-controlled input to innerHTML, especially in rich text editors.
