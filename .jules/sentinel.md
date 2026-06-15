## 2024-05-28 - [Cross-Site Scripting (XSS) in LLM response rendering]
**Vulnerability:** XSS vulnerability through usage of `dangerouslySetInnerHTML` for replacing newlines with `<br />` in GeminiAssistant.tsx and ImageAnalysisModal.tsx to render LLM responses.
**Learning:** `dangerouslySetInnerHTML` bypasses React's built-in XSS protection and exposes the application to XSS attacks, especially when handling un-sanitized content such as LLM outputs or user inputs.
**Prevention:** Use standard React text rendering combined with the `whitespace-pre-wrap` CSS class to preserve simple line breaks safely without XSS risk, rather than converting `\n` to `<br />` manually and inserting raw HTML.
