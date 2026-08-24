## 2024-05-24 - [Fix XSS via dangerouslySetInnerHTML]
**Vulnerability:** XSS from un-sanitized text content in React rendering.
**Learning:** The previous implementation used dangerouslySetInnerHTML to replace linebreaks with <br/>, exposing the application to XSS. This is a common codebase specific anti-pattern when rendering multi-line user inputs or un-sanitized API responses.
**Prevention:** Use whitespace-pre-wrap in CSS instead of dangerouslySetInnerHTML to render linebreaks safely without opening up XSS vectors.
