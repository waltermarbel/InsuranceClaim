## 2024-05-15 - [XSS Vulnerability in dangerouslySetInnerHTML]
**Vulnerability:** Found multiple instances of `dangerouslySetInnerHTML` rendering unsanitized user-generated content or API responses (`msg.text` and `analysisResult`).
**Learning:** The codebase relies on React but lacked a global sanitizer for dynamic HTML insertion, creating a high-risk XSS vector.
**Prevention:** Always use `DOMPurify.sanitize()` before passing any string to `dangerouslySetInnerHTML`.
